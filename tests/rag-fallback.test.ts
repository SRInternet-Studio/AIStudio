/**
 * Focused test: RAG failure degradation.
 *
 * RAG is an optional enhancement of the sliding window — ANY embedding/
 * retrieval failure (missing Base URL, unreachable endpoint, bad response)
 * must degrade to plain sliding-window behavior instead of breaking the chat
 * request. retrieveMemoriesSafe() is the single choke point the /api/chat
 * route calls, and it must never throw.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveRagConfig,
  retrieveMemoriesSafe,
  embedTexts,
  chunkText,
  RAG_DEFAULT_MODELS,
} from "@/lib/rag";

test("resolveRagConfig: defaults (enabled, api provider, openai default model, topK 5)", () => {
  const cfg = resolveRagConfig({});
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.provider, "api");
  assert.equal(cfg.embeddingModel, RAG_DEFAULT_MODELS.api.openai);
  assert.equal(cfg.topK, 5);
});

test("resolveRagConfig: gemini protocol picks the gemini default model", () => {
  const cfg = resolveRagConfig({ api_protocol: "gemini" });
  assert.equal(cfg.embeddingModel, RAG_DEFAULT_MODELS.api.gemini);
});

test("resolveRagConfig: local provider uses the on-device model", () => {
  const cfg = resolveRagConfig({ rag_provider: "local" });
  assert.equal(cfg.provider, "local");
  assert.equal(cfg.embeddingModel, RAG_DEFAULT_MODELS.local);
});

test("resolveRagConfig: rag_enabled=0 disables RAG", () => {
  const cfg = resolveRagConfig({ rag_enabled: 0 });
  assert.equal(cfg.enabled, false);
});

test("resolveRagConfig: topK is clamped into [1, 20]", () => {
  assert.equal(resolveRagConfig({ rag_top_k: "999" }).topK, 20);
  assert.equal(resolveRagConfig({ rag_top_k: "not-a-number" }).topK, 5);
  assert.equal(resolveRagConfig({ rag_top_k: "3" }).topK, 3);
});

test("embedTexts: api provider without Base URL rejects (documented contract)", async () => {
  await assert.rejects(
    embedTexts(["hello"], { enabled: true, provider: "api", embeddingModel: "m", topK: 5 }),
    /Base URL/
  );
});

test("retrieveMemoriesSafe: embedding failure degrades to empty memories instead of throwing", async () => {
  // provider=api with no Base URL makes every embedding call fail — exactly
  // the situation when the user's endpoint doesn't support /v1/embeddings.
  const result = await retrieveMemoriesSafe(
    "conv-1",
    "what did we talk about?",
    [{ id: "m1", role: "user", position: 1, content: "older turn that fell out of the window" }],
    new Set<string>(),
    resolveRagConfig({}),
    8_000,
    { baseUrl: "", apiKey: "", protocol: "openai" }
  );
  assert.deepEqual(result, { text: "", count: 0, indexed: 0 });
});

test("retrieveMemoriesSafe: unreachable embedding endpoint still degrades gracefully", async () => {
  // A Base URL that cannot be connected to must also degrade, not throw.
  const result = await retrieveMemoriesSafe(
    "conv-1",
    "query",
    [],
    new Set<string>(),
    resolveRagConfig({}),
    8_000,
    { baseUrl: "http://127.0.0.1:1", apiKey: "", protocol: "openai" }
  );
  assert.deepEqual(result, { text: "", count: 0, indexed: 0 });
});

test("chunkText: short text stays whole, long text is chunked with overlap", () => {
  assert.deepEqual(chunkText("  "), []);
  assert.deepEqual(chunkText("short text"), ["short text"]);
  const long = "a".repeat(2500);
  const chunks = chunkText(long);
  assert.ok(chunks.length >= 3);
  assert.ok(chunks.every((c) => c.length <= 1000));
});
