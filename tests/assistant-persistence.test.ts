/**
 * Focused test: assistant message idempotent persistence.
 *
 * Covers the fix where the assistant reply is stored through a single
 * idempotent helper (src/lib/chat-persistence.ts) shared by the streaming
 * completion path and the stream-error path — a second call with the same
 * messageId must be a no-op, and in-place regeneration must not clobber an
 * occupied position (collision shift instead).
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { persistAssistantMessage, type DbAdapter } from "@/lib/chat-persistence";

let tmpDir: string;
let client: Client;
let db: DbAdapter;

function makeAdapter(c: Client): DbAdapter {
  return {
    queryOne: async (sql, params = []) => {
      const r = await c.execute({ sql, args: params });
      return r.rows.length > 0 ? r.rows[0] : null;
    },
    execute: async (sql, params = []) => {
      await c.execute({ sql, args: params });
    },
  };
}

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aistudio-test-"));
  client = createClient({ url: `file:${path.join(tmpDir, "test.db")}` });
  await client.execute(
    "CREATE TABLE messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL, position INTEGER NOT NULL, created_at TEXT DEFAULT '')"
  );
  await client.execute(
    "CREATE TABLE blocks (id TEXT PRIMARY KEY, message_id TEXT NOT NULL, type TEXT NOT NULL, content TEXT DEFAULT '', position INTEGER NOT NULL, is_deleted INTEGER DEFAULT 0, created_at TEXT DEFAULT '')"
  );
  db = makeAdapter(client);
});

after(async () => {
  await client.close();
  // On Windows the libsql file handle can take a moment to release; retry.
  for (let i = 0; i < 5; i++) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

const NOW = "2026-08-08T00:00:00.000Z";

test("stores assistant message with thinking/text/tool blocks", async () => {
  const stored = await persistAssistantMessage(db, {
    conversationId: "conv-1",
    messageId: "a-1",
    position: 2,
    regeneratePosition: null,
    text: "Hello!",
    thinking: "Hmm...",
    toolResults: [{ type: "search", content: "{}" }],
    now: NOW,
  });
  assert.equal(stored, true);

  const msg = await db.queryOne("SELECT * FROM messages WHERE id = ?", ["a-1"]);
  assert.ok(msg);
  assert.equal(msg.role, "assistant");
  assert.equal(Number(msg.position), 2);

  const blocks = await client.execute({
    sql: "SELECT type FROM blocks WHERE message_id = ? ORDER BY position ASC",
    args: ["a-1"],
  });
  assert.deepEqual(blocks.rows.map((r: any) => r.type), ["thinking", "text", "tool_result"]);
});

test("second call with same messageId is a no-op (idempotent)", async () => {
  const again = await persistAssistantMessage(db, {
    conversationId: "conv-1",
    messageId: "a-1",
    position: 2,
    regeneratePosition: null,
    text: "Hello! (longer version that must NOT overwrite)",
    now: NOW,
  });
  assert.equal(again, false);

  const count = await db.queryOne(
    "SELECT COUNT(*) AS cnt FROM messages WHERE conversation_id = ?",
    ["conv-1"]
  );
  assert.equal(Number(count.cnt), 1);

  // Original content survives untouched.
  const textBlock = await db.queryOne(
    "SELECT content FROM blocks WHERE message_id = ? AND type = 'text'",
    ["a-1"]
  );
  assert.equal(textBlock.content, "Hello!");
});

test("regenerate into an occupied position shifts the occupant +1 instead of clobbering", async () => {
  // Legacy collided data: position 2 still occupied, position 3 behind it.
  await db.execute(
    "INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES ('old-reply', 'conv-2', 'assistant', 2, ?)",
    [NOW]
  );
  await db.execute(
    "INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES ('later-user', 'conv-2', 'user', 3, ?)",
    [NOW]
  );

  const stored = await persistAssistantMessage(db, {
    conversationId: "conv-2",
    messageId: "a-2",
    position: 2,
    regeneratePosition: 1,
    text: "Regenerated answer",
    now: NOW,
  });
  assert.equal(stored, true);

  const rows = await client.execute({
    sql: "SELECT id, position FROM messages WHERE conversation_id = 'conv-2' ORDER BY position ASC",
    args: [],
  });
  const byId = Object.fromEntries(rows.rows.map((r: any) => [r.id, Number(r.position)]));
  assert.equal(byId["a-2"], 2);        // regenerated reply lands exactly at P+1
  assert.equal(byId["old-reply"], 3);   // occupant shifted up
  assert.equal(byId["later-user"], 4);  // later history preserved, shifted too
  // No duplicate positions.
  assert.equal(new Set(Object.values(byId)).size, Object.keys(byId).length);
});
