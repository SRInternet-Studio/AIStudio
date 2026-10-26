/**
 * End-to-end verification of per-message grounding anchors against a running
 * AIStudio dev server and the live local SQLite data. Read-only.
 *
 * For every message that carries a grounding block, derives its footnote labels
 * the way ChatArea does and asserts the resulting anchor ids are unique across
 * the whole conversation. Also reports how many ids the unscoped (legacy)
 * labelling would have duplicated.
 *
 * Usage: node scripts/verify-grounding-anchors.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3123";

function footnoteNamespace(messageId) {
  const safe = (messageId || "").trim().replace(/[^\p{L}\p{N}_-]/gu, "");
  return safe.length > 0 ? safe : "m";
}
function label(ns, n) {
  return `${ns}-${n}`;
}

/**
 * Minimal re-implementation of insertGroundingFootnotes' label logic: we only
 * need the label shape (namespace + number), not the span resolution.
 */
function footnoteLabelsFor(metadata, messageId) {
  const ns = footnoteNamespace(messageId);
  const chunks = metadata?.groundingChunks || [];
  const used = [];
  for (const s of metadata?.groundingSupports || []) {
    for (const i of s?.groundingChunkIndices || []) {
      if (chunks[i]?.web?.uri && !used.includes(i)) used.push(i);
    }
  }
  // One number per unique chunk, in order of first appearance.
  const numberByChunk = new Map();
  used.forEach((chunkIdx, n) => numberByChunk.set(chunkIdx, n + 1));
  return [...numberByChunk.values()].map((n) => label(ns, n));
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
  const convs = await getJson("/api/conversations");

  let totalGrounded = 0;
  let totalCitations = 0;
  let conversationsWithGrounding = 0;

  for (const c of convs.data) {
    const full = await getJson(`/api/conversations/${c.id}`);
    const msgs = full.data.messages || [];

    // Every anchor id this conversation renders, plus the anchors that would
    // have been produced WITHOUT namespacing (the old, colliding behaviour).
    const namespaced = [];
    const legacy = [];

    for (const m of msgs) {
      const gb = (m.blocks || []).find((b) => b.type === "grounding" && !b.is_deleted);
      if (!gb) continue;
      let meta;
      try {
        meta = JSON.parse(gb.content);
      } catch {
        continue;
      }
      const labels = footnoteLabelsFor(meta, m.id);
      totalGrounded++;
      totalCitations += labels.length;
      for (const l of labels) {
        namespaced.push(`user-content-fn-${l}`);
        legacy.push(`user-content-fn-${Number(l.split("-").pop())}`);
      }
    }

    if (namespaced.length === 0) continue;
    conversationsWithGrounding++;

    const dupes = namespaced.filter((v, i) => namespaced.indexOf(v) !== i);
    const legacyDupes = legacy.filter((v, i) => legacy.indexOf(v) !== i);

    console.log(
      `\n--- ${String(c.title).slice(0, 40)} (${msgs.length} msgs, ${namespaced.length} citations) ---`
    );
    console.log(`  namespaced anchors: ${namespaced.length}, duplicates: ${dupes.length}`);
    console.log(`  legacy (pre-fix) anchors: duplicates ${legacyDupes.length} of ${legacy.length}`);

    check(
      `[${String(c.title).slice(0, 24)}] no duplicate anchors with the fix`,
      dupes.length === 0,
      dupes.length ? `duplicates: ${JSON.stringify([...new Set(dupes)].slice(0, 4))}` : undefined
    );
  }

  console.log(`\n=== Totals ===`);
  console.log(`conversations with grounding: ${conversationsWithGrounding}`);
  console.log(`grounded messages: ${totalGrounded}, citations: ${totalCitations}`);

  if (conversationsWithGrounding === 0) {
    console.log("\nNo grounded messages in the database — nothing to verify.");
    return;
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
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
