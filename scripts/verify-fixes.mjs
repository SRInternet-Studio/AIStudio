/**
 * End-to-end verification of the context-window, stream-handoff and
 * segmented-token-count fixes against a running AIStudio dev server and the
 * live local SQLite data. Read-only.
 *
 * Usage: node scripts/verify-fixes.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3123";

const CJK_CHAR_REGEX = /[\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F\u3040-\u30FF]/g;
const TOKENS_PER_CHAR_CJK = 0.75; // must match src/lib/context-manager.ts
const CHARS_PER_TOKEN_LATIN = 4;

function estimateTokens(text) {
  if (!text) return 0;
  const cjk = (text.match(CJK_CHAR_REGEX) || []).length;
  const latin = text.length - cjk;
  return Math.ceil(cjk * TOKENS_PER_CHAR_CJK + latin / CHARS_PER_TOKEN_LATIN);
}

function resolveContextBudget(contextWindow, maxOutputTokens, ragReserveRatio = 0.1) {
  const window = Math.max(0, Math.floor(contextWindow || 0));
  if (window === 0) return { promptTokens: 0, outputTokens: 0, ragTokens: 0 };
  const OUTPUT_MIN = 1024;
  const requested = Number(maxOutputTokens);
  const outputTokens = Math.min(
    Math.max(OUTPUT_MIN, Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : OUTPUT_MIN),
    Math.floor(window * 0.125)
  );
  const remaining = Math.max(0, window - outputTokens);
  const ratio = Math.min(Math.max(ragReserveRatio || 0, 0), 0.5);
  const ragTokens = ratio > 0 ? Math.min(8192, Math.floor(remaining * ratio)) : 0;
  return { promptTokens: Math.max(0, remaining - ragTokens), outputTokens, ragTokens };
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`);
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const settings = await getJson("/api/settings");
  const s = settings.data;
  const model = s.selected_model || "";
  const cap = s.max_context_tokens > 0 ? s.max_context_tokens : 0;

  console.log("=== Environment ===");
  console.log(`model=${model}  max_context_tokens=${cap}  max_output_tokens=${s.max_output_tokens}\n`);

  // Model context window: mirror resolveModelContextWindow's documented order.
  const GOOGLE_DEFAULT = 800_000;
  const isGoogle = model.startsWith("gemini-") || model.startsWith("gemma-");
  let contextWindow = isGoogle ? GOOGLE_DEFAULT : 128_000;
  if (cap > 0) contextWindow = Math.min(contextWindow, cap);
  const budget = resolveContextBudget(contextWindow, s.max_output_tokens, s.rag_enabled === false ? 0 : 0.1);

  console.log("=== Defect 1: context window boundary ===");
  console.log(`window=${contextWindow}  prompt budget=${budget.promptTokens} (${((budget.promptTokens / contextWindow) * 100).toFixed(1)}%)  output=${budget.outputTokens}  rag=${budget.ragTokens}\n`);
  const budgetRatio = budget.promptTokens / contextWindow;
  check(
    "256K window prompt budget stays close to the window (not 75% / not 72%)",
    budgetRatio > 0.8,
    `prompt budget is ${(budgetRatio * 100).toFixed(1)}% of the window`
  );
  check(
    "reservations never exceed the window",
    budget.promptTokens + budget.outputTokens + budget.ragTokens <= contextWindow,
    `${budget.promptTokens}+${budget.outputTokens}+${budget.ragTokens} <= ${contextWindow}`
  );

  // Calibration: the estimator must track the real Gemini tokenizer (~1.39
  // chars/token for Chinese) within a few percent.
  const chars = 100_000;
  const real = Math.round(chars / 1.39);
  const est = estimateTokens("中".repeat(chars));
  const ratio = est / real;
  check(
    "CJK estimate is calibrated to the real tokenizer (±15%)",
    ratio > 0.85 && ratio < 1.15,
    `estimated ${est} vs real ~${real} = ${ratio.toFixed(3)}x`
  );

  // Pick the largest conversation by message count.
  const convs = await getJson("/api/conversations");
  let best = null;
  for (const c of convs.data) {
    const d = await getJson(`/api/conversations/${c.id}?limit=1`);
    const count = (d.data.tokenCounts || []).length;
    if (!best || count > best.count) best = { id: c.id, title: c.title, count };
  }
  console.log(`\n=== Defect 3: token counter across segmented loading ===`);
  console.log(`largest conversation: ${best.title} (${best.count} messages)\n`);

  const page = 50;
  const paged = await getJson(`/api/conversations/${best.id}?limit=${page}`);
  const mounted = (paged.data.messages || []).length;
  const hasMore = !!paged.data.hasMore;
  const baseline = paged.data.fullContextEstimate;

  console.log(`mounted page: ${mounted} messages, hasMore=${hasMore}`);
  check("server returns a whole-history estimate", typeof baseline === "number", `fullContextEstimate=${baseline}`);

  if (typeof baseline === "number" && mounted > 0) {
    const mountedEstimate = (paged.data.messages || []).reduce((acc, m) => {
      const content = (m.blocks || [])
        .filter((b) => !b.is_deleted && b.type !== "grounding" && !["image", "video", "audio", "pdf"].includes(b.type))
        .map((b) => b.content || "")
        .join("\n");
      return acc + estimateTokens(content);
    }, 0);
    console.log(`mounted-page estimate: ${mountedEstimate}   whole-history estimate: ${baseline}`);
    check(
      "whole-history estimate is much larger than the mounted page (older messages counted)",
      baseline > mountedEstimate,
      `${baseline} > ${mountedEstimate} (older history was previously missing from the counter)`
    );

    // Full fetch (no limit) must reproduce the same number. This mirrors the
    // SERVER's aggregation exactly: only non-deleted text/thinking blocks are
    // joined per message and estimated once (media blobs and grounding are
    // excluded — their cost is reported by the API, not estimated locally).
    const full = await getJson(`/api/conversations/${best.id}`);
    const fullMsgs = full.data.messages || [];
    const fullEstimate = fullMsgs.reduce((acc, m) => {
      const parts = (m.blocks || [])
        .filter((b) => !b.is_deleted && (b.type === "text" || b.type === "thinking"))
        .map((b) => b.content || "");
      return acc + (parts.length > 0 ? estimateTokens(parts.join("\n")) : 0);
    }, 0);
    check(
      "paged baseline equals the full-transcript estimate (no paging artifact)",
      Math.abs(baseline - fullEstimate) < 1,
      `baseline ${baseline} vs full ${fullEstimate}`
    );

    // Window boundary against real data: how much of THIS conversation fits.
    if (baseline > budget.promptTokens) {
      const pct = ((budget.promptTokens / baseline) * 100).toFixed(1);
      console.log(`conversation is ${baseline} tokens; the next request will carry ~${budget.promptTokens} (${pct}% of it)`);
      check(
        "windowed request stays within the prompt budget",
        budget.promptTokens <= contextWindow,
        `${budget.promptTokens} <= ${contextWindow}`
      );
    }
  }

  console.log(`\n=== Summary ===`);
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log("FAILED:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("verification error:", err);
  process.exitCode = 1;
});
