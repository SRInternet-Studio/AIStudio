/**
 * Focused test: OpenAI-compatible protocol support in the /api/models route.
 *
 * The regression this covers: when the active API protocol is "openai", the
 * model selector must list models from the provider's `GET /v1/models`
 * endpoint instead of silently falling back to the local FALLBACK_MODELS. The
 * route normalizes the Base URL, summons /v1/models with a Bearer token, maps
 * the response into ModelInfo[], and degrades gracefully on any failure.
 *
 * These unit tests exercise the pure mapping/normalization helpers that the
 * route uses, against a mock /v1/models response body, plus the merge step so
 * a fresh endpoint list never drops the locally known models.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOpenAIModelsResponse,
  normalizeOpenAIBaseUrl,
  mergeModelLists,
  FALLBACK_MODELS,
} from "@/lib/models";
import type { ModelInfo } from "@/types";

test("normalizeOpenAIBaseUrl appends /v1/models to a bare host", () => {
  assert.equal(normalizeOpenAIBaseUrl("https://api.example.com"), "https://api.example.com/v1/models");
  assert.equal(normalizeOpenAIBaseUrl("https://api.example.com/"), "https://api.example.com/v1/models");
});

test("normalizeOpenAIBaseUrl keeps an existing /v1 and appends /models", () => {
  assert.equal(normalizeOpenAIBaseUrl("https://api.example.com/v1"), "https://api.example.com/v1/models");
  assert.equal(normalizeOpenAIBaseUrl("https://api.example.com/v1/"), "https://api.example.com/v1/models");
});

test("normalizeOpenAIBaseUrl returns empty for empty input", () => {
  assert.equal(normalizeOpenAIBaseUrl(""), "");
});

test("parseOpenAIModelsResponse maps a standard { data } /v1/models envelope", () => {
  const json = {
    object: "list",
    data: [
      { id: "gpt-4o", object: "model", created: 1710000000, owned_by: "openai" },
      { id: "gpt-4o-mini", object: "model", created: 1710000001, owned_by: "openai" },
      { id: "llama-3.1-70b", object: "model", created: 1710000002, owned_by: "meta" },
    ],
  };
  const models = parseOpenAIModelsResponse(json);

  assert.equal(models.length, 3);
  assert.equal(models[0].id, "gpt-4o");
  assert.equal(models[0].displayName, "gpt-4o");
  assert.equal(models[0].category, "openai");
  assert.equal(models[1].category, "openai");
  assert.equal(models[2].category, "meta");
  assert.equal(models[0].contextWindow, 128_000);
});

test("parseOpenAIModelsResponse accepts a bare array (some relays)", () => {
  const models = parseOpenAIModelsResponse([{ id: "x1", owned_by: "x" }]);
  assert.equal(models.length, 1);
  assert.equal(models[0].id, "x1");
});

test("parseOpenAIModelsResponse drops entries without an id", () => {
  const models = parseOpenAIModelsResponse({ data: [{ object: "model" }, { id: "ok" }] });
  assert.equal(models.length, 1);
  assert.equal(models[0].id, "ok");
});

test("parseOpenAIModelsResponse returns [] for malformed / empty bodies", () => {
  assert.deepEqual(parseOpenAIModelsResponse(null), []);
  assert.deepEqual(parseOpenAIModelsResponse(undefined), []);
  assert.deepEqual(parseOpenAIModelsResponse({}), []);
  assert.deepEqual(parseOpenAIModelsResponse({ data: "not-an-array" }), []);
});

test("parseOpenAIModelsResponse defaults owned_by to OpenAI when missing", () => {
  const models = parseOpenAIModelsResponse({ data: [{ id: "custom-model" }] });
  assert.equal(models[0].category, "OpenAI");
});

test("parseOpenAIModelsResponse prefers display_name and opencode context when present", () => {
  const models = parseOpenAIModelsResponse({
    object: "list",
    data: [
      { id: "deepseek-v4-flash", display_name: "DeepSeek v4 Flash", owned_by: "voidswitch",
        description: "Official DeepSeek release", opencode: { limit: { context: 1_000_000 } } },
    ],
  });
  assert.equal(models[0].displayName, "DeepSeek v4 Flash");
  assert.equal(models[0].description, "Official DeepSeek release");
  assert.equal(models[0].contextWindow, 1_000_000);
});

test("mergeModelLists keeps a fresh openai endpoint model absent from fallback", () => {
  const merged = mergeModelLists(FALLBACK_MODELS, [
    { id: "gpt-4o-mini", displayName: "gpt-4o-mini", description: "", category: "openai", contextWindow: 128_000 } as ModelInfo,
  ]);
  assert.ok(merged.some((m) => m.id === "gpt-4o-mini"));
});

test("mergeModelLists fills empty openai fields from the local record", () => {
  const local = [
    { id: "gpt-4o", displayName: "GPT-4o", description: "OpenAI flagship", category: "All", contextWindow: 128_000 } as ModelInfo,
  ];
  // The endpoint omits description and contextWindow — the local record must win.
  const merged = mergeModelLists(local, [
    { id: "gpt-4o", displayName: "", description: "", category: "openai", contextWindow: undefined } as ModelInfo,
  ]);
  const m = merged.find((x) => x.id === "gpt-4o")!;
  assert.equal(m.displayName, "GPT-4o"); // endpoint empty -> local
  assert.equal(m.description, "OpenAI flagship"); // endpoint empty -> local
  assert.equal(m.contextWindow, 128_000); // endpoint non-positive -> local
});
