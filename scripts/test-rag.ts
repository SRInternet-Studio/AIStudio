/**
 * RAG End-to-End Test
 *
 * Verifies the real RAG pipeline (NOT the old attachment test):
 *  1. Temporarily pins a small context_window for the configured model via
 *     custom_models, so the sliding window is guaranteed to trim history.
 *  2. Creates a conversation whose FIRST message holds a "secret fact", then
 *     pads it with enough filler turns to overflow the small window.
 *  3. Calls POST /api/chat asking about the secret fact. The secret message is
 *     out of the window, so it can only be recalled if RAG indexed the trimmed
 *     messages and retrieved the relevant memory back into the request.
 *  4. Asserts: context_trimmed=true, rag_memories_injected>0, the message_embeddings
 *     table got rows, and the model response mentions the secret.
 *  5. Cleans up everything (conversation via DELETE API — which also exercises
 *     the embeddings cleanup hook — and restores the custom_models row).
 *
 * Requires: the dev/prod server running on http://localhost:3000.
 * Usage: npx tsx scripts/test-rag.ts
 */

import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const DB_PATH = path.join(process.cwd(), "data", "ai-studio.db");
const API_BASE = "http://localhost:3000";

// ============ Test Configuration ============
const SMALL_WINDOW = 4500; // tokens — below total (~4700), RAG budget = 450 tokens

// ~300 tokens: long enough that the sliding window cannot sneak it back into
// the leftover space, short enough to fit the 450-token RAG budget.
const SECRET_FACT =
  "Project codename is Zephyr Lighthouse. The launch date is September 3, 2026, " +
  "and the project lead is Dr. Amara Okafor. The project is headquartered in Lisbon, " +
  "Portugal, and focuses on low-latency edge inference for industrial sensors. " +
  "The initial budget was approved at 4.2 million euros with a team of 23 engineers " +
  "split across three sites. The first pilot customer is a logistics company called " +
  "Nordwind Cargo, which will deploy the system in its Rotterdam warehouse during " +
  "the pilot phase. Please remember all of these details — I will ask about the " +
  "codename, the launch date and the project lead later in this conversation.";

const TEST_QUESTION =
  "Earlier in this conversation I told you a project codename, its launch date and the project lead. " +
  "What are they? Answer concisely.";

const EXPECTED_KEYWORDS = ["Zephyr Lighthouse", "September 3, 2026", "Amara Okafor"];

// ~430 tokens per filler pair x 10 = ~4300 tokens; with secret+question+system the
// total (~4700) overflows SMALL_WINDOW, and the ~300-token secret can no longer be
// squeezed back into the leftover window space.
const FILLER_USER =
  "Filler turn for testing purposes. This paragraph exists only to inflate the " +
  "conversation length so that earlier messages fall out of the context window. " +
  "It contains no useful information whatsoever. Lorem ipsum dolor sit amet, " +
  "consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et " +
  "dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation " +
  "ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure " +
  "dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla " +
  "pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui " +
  "officia deserunt mollit anim id est laborum. Padding padding padding padding.";

const FILLER_MODEL =
  "Understood, this is a filler reply with no meaningful content. It only serves " +
  "to consume tokens in the context window so older turns get trimmed away. " +
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor " +
  "incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis " +
  "nostrud exercitation ullamco laboris. Nisi ut aliquip ex ea commodo consequat. " +
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore. " +
  "Eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident. " +
  "Sunt in culpa qui officia deserunt mollit anim id est laborum. Padding padding.";

// ============ Helpers ============
async function insertMessage(db: any, convId: string, role: string, position: number, content: string) {
  const msgId = uuidv4();
  const now = new Date().toISOString();
  await db.execute({
    sql: "INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [msgId, convId, role, position, now],
  });
  await db.execute({
    sql: "INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'text', ?, 0, ?)",
    args: [uuidv4(), msgId, content, now],
  });
}

// ============ Main Test ============
async function main() {
  console.log("=".repeat(70));
  console.log("  RAG End-to-End Test (sliding window + retrieval)");
  console.log("=".repeat(70));
  console.log();

  if (!fs.existsSync(DB_PATH)) {
    console.error("[FAIL] Database not found at", DB_PATH);
    console.error("Please run the app first to initialize the database.");
    process.exit(1);
  }

  const db = createClient({ url: `file:${DB_PATH}` });

  // Step 1: Read settings & resolve RAG config
  console.log("[Step 1] Reading settings...");
  const settingsResult = await db.execute("SELECT * FROM settings WHERE id = 1");
  if (settingsResult.rows.length === 0) {
    console.error("[FAIL] No settings found in database");
    process.exit(1);
  }
  const settings = settingsResult.rows[0];
  const { resolveRagConfig } = await import("../src/lib/rag");
  const ragConfig = resolveRagConfig(settings);
  console.log(`  Base URL:        ${settings.base_url}`);
  console.log(`  Protocol:        ${settings.api_protocol}`);
  console.log(`  Model:           ${settings.selected_model}`);
  console.log(`  RAG enabled:     ${ragConfig.enabled}`);
  console.log(`  RAG provider:    ${ragConfig.provider}`);
  console.log(`  Embedding model: ${ragConfig.embeddingModel}`);
  console.log(`  Top-K:           ${ragConfig.topK}`);
  console.log();

  if (!settings.base_url) {
    console.error("[FAIL] Base URL not configured — cannot run end-to-end test");
    process.exit(1);
  }
  if (!ragConfig.enabled) {
    console.error("[FAIL] RAG is disabled in settings — enable it first");
    process.exit(1);
  }

  // Step 2: Pin a small context window for the selected model via custom_models
  console.log(`[Step 2] Pinning context_window=${SMALL_WINDOW} for model "${settings.selected_model}"...`);
  const modelId = String(settings.selected_model);
  const existingRow = await db.execute({
    sql: "SELECT context_window FROM custom_models WHERE id = ?",
    args: [modelId],
  });
  let createdCustomModel = false;
  let originalWindow: number | null = null;
  if (existingRow.rows.length > 0) {
    originalWindow = Number(existingRow.rows[0].context_window);
    await db.execute({
      sql: "UPDATE custom_models SET context_window = ? WHERE id = ?",
      args: [SMALL_WINDOW, modelId],
    });
    console.log(`  Existing custom model row — original window ${originalWindow} saved for restore`);
  } else {
    await db.execute({
      sql: "INSERT INTO custom_models (id, display_name, description, context_window, category, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [modelId, modelId, "Temporary row created by test-rag.ts", SMALL_WINDOW, "Custom", new Date().toISOString()],
    });
    createdCustomModel = true;
    console.log("  Inserted temporary custom model row");
  }
  console.log();

  // Step 3: Build the test conversation (secret first, then filler)
  console.log("[Step 3] Creating test conversation with secret fact + filler...");
  const convId = uuidv4();
  const now = new Date().toISOString();
  await db.execute({
    sql: "INSERT INTO conversations (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    args: [convId, "RAG E2E Test", modelId, now, now],
  });
  let position = 1;
  await insertMessage(db, convId, "user", position++, SECRET_FACT);
  for (let i = 0; i < 10; i++) {
    await insertMessage(db, convId, "user", position++, FILLER_USER);
    await insertMessage(db, convId, "model", position++, FILLER_MODEL);
  }
  const totalChars = SECRET_FACT.length + 9 * (FILLER_USER.length + FILLER_MODEL.length);
  console.log(`  Conversation: ${convId}`);
  console.log(`  Messages: ${position - 1}, total chars: ${totalChars} (~${Math.round(totalChars / 3)} tokens > window ${SMALL_WINDOW})`);
  console.log();

  // Step 4: Call /api/chat — trimming is forced, RAG must rescue the secret
  console.log("[Step 4] Calling POST /api/chat (non-streaming)...");
  console.log(`  Question: "${TEST_QUESTION}"`);
  console.log();

  let assistantResponse = "";
  let contextTrimmed = false;
  let ragInjected = 0;
  let apiSuccess = false;

  try {
    const chatRes = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: convId,
        message: TEST_QUESTION,
        model: modelId,
        stream: false,
      }),
    });
    const chatData = (await chatRes.json()) as any;
    console.log(`  HTTP status:           ${chatRes.status}`);
    console.log(`  success:               ${chatData.success}`);
    if (chatData.success) {
      apiSuccess = true;
      assistantResponse = chatData.data?.assistant_message?.content || "";
      contextTrimmed = chatData.data?.context_trimmed === true;
      ragInjected = chatData.data?.rag_memories_injected || 0;
    } else {
      console.log(`  error: ${chatData.error}`);
    }
  } catch (err: any) {
    console.log(`  API call exception: ${err.message}`);
    console.log("  Is the server running on " + API_BASE + " ?");
  }
  console.log(`  context_trimmed:       ${contextTrimmed}`);
  console.log(`  rag_memories_injected: ${ragInjected}`);
  console.log();

  // Step 5: Verify embeddings were stored
  console.log("[Step 5] Verifying message_embeddings table...");
  const embCount = await db.execute({
    sql: "SELECT COUNT(*) as count FROM message_embeddings WHERE conversation_id = ?",
    args: [convId],
  });
  const embeddingsRows = Number(embCount.rows[0]?.count || 0);
  console.log(`  Embedding chunks stored: ${embeddingsRows}`);
  console.log();

  // Step 6: Verify response
  console.log("[Step 6] Model response:");
  console.log("-".repeat(70));
  console.log(assistantResponse || "(empty)");
  console.log("-".repeat(70));
  console.log();

  const foundKeywords: string[] = [];
  for (const keyword of EXPECTED_KEYWORDS) {
    const found = assistantResponse.toLowerCase().includes(keyword.toLowerCase());
    if (found) foundKeywords.push(keyword);
    console.log(`  ${found ? "[PASS]" : "[FAIL]"} keyword "${keyword}"`);
  }
  console.log();

  const checks = [
    { name: "API call succeeded", pass: apiSuccess },
    { name: "Sliding window trimmed (context_trimmed=true)", pass: contextTrimmed },
    { name: "RAG injected memories (rag_memories_injected>0)", pass: ragInjected > 0 },
    { name: "Embeddings stored in message_embeddings", pass: embeddingsRows > 0 },
    { name: "Response recalls the secret (>=2 keywords)", pass: foundKeywords.length >= 2 },
  ];

  console.log("=".repeat(70));
  let allPass = true;
  for (const c of checks) {
    console.log(`  ${c.pass ? "[PASS]" : "[FAIL]"} ${c.name}`);
    if (!c.pass) allPass = false;
  }
  console.log("=".repeat(70));
  console.log(allPass ? "  RAG END-TO-END TEST PASSED" : "  RAG END-TO-END TEST FAILED");
  console.log("=".repeat(70));
  console.log();

  // Step 7: Cleanup — delete conversation via API (exercises embeddings cleanup hook)
  console.log("[Step 7] Cleanup...");
  try {
    await fetch(`${API_BASE}/api/conversations/${convId}`, { method: "DELETE" });
  } catch {
    // Fallback: delete directly if server unreachable
    await db.execute({ sql: "DELETE FROM blocks WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)", args: [convId] });
    await db.execute({ sql: "DELETE FROM messages WHERE conversation_id = ?", args: [convId] });
    await db.execute({ sql: "DELETE FROM conversations WHERE id = ?", args: [convId] });
    await db.execute({ sql: "DELETE FROM message_embeddings WHERE conversation_id = ?", args: [convId] });
  }
  const leftover = await db.execute({
    sql: "SELECT COUNT(*) as count FROM message_embeddings WHERE conversation_id = ?",
    args: [convId],
  });
  console.log(`  Embeddings left after cleanup: ${leftover.rows[0]?.count} (cleanup hook ${Number(leftover.rows[0]?.count || 0) === 0 ? "OK" : "FAILED"})`);

  // Restore custom_models row
  if (createdCustomModel) {
    await db.execute({ sql: "DELETE FROM custom_models WHERE id = ?", args: [modelId] });
    console.log("  Removed temporary custom model row");
  } else if (originalWindow !== null) {
    await db.execute({ sql: "UPDATE custom_models SET context_window = ? WHERE id = ?", args: [originalWindow, modelId] });
    console.log(`  Restored custom model context_window=${originalWindow}`);
  }
  console.log();

  // @libsql/client's native handle can trip a libuv assertion at process exit on
  // Windows; give it a beat to settle, then force-exit with the real test result.
  const code = allPass ? 0 : 1;
  setTimeout(() => process.exit(code), 1500).unref();
  try { db.close(); } catch { /* ignore */ }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
