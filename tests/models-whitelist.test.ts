/**
 * Focused test: endpoint-driven "whitelist" filtering (applyEndpointWhitelist).
 *
 * The regression this covers: with an OpenAI-compatible backend, the model
 * selector must list ONLY the models that backend actually serves, hiding
 * locally known static models (Gemini / Claude / GPT fallbacks) that the
 * endpoint did not return.
 *
 * A second regression: a custom model that the user DELETED must actually
 * disappear from the selector. Custom models are merged into the endpoint list
 * by /api/models from the custom_models table, so a deleted one is no longer in
 * `endpointModels` — and must NOT be resurrected from a stale local cache.
 * When the endpoint returns nothing, the list degrades to the known local set
 * so the selector never strands on an empty drop-down.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEndpointWhitelist, FALLBACK_MODELS } from "@/lib/models";
import type { ModelInfo } from "@/types";

const oai = (id: string): ModelInfo => ({
  id,
  displayName: id,
  description: "",
  category: "voidswitch",
  contextWindow: 128_000,
});

const custom = (id: string): ModelInfo => ({
  id,
  displayName: id,
  description: "",
  category: "Custom",
  contextWindow: 800_000,
});

test("whitelist keeps only endpoint models (with existing customs), dropping Gemini/Claude static", () => {
  // What /api/models returned: the 3 served OpenAI models plus the still-existing
  // custom model (merged in from custom_models). The local static Gemini/Claude/GPT
  // fallbacks are NOT on the whitelist and must be dropped.
  const endpoint = [
    oai("deepseek-v4-flash"),
    oai("kimi-k2.5"),
    oai("glm-4.5-air"),
    custom("my-custom-model"),
  ];
  const result = applyEndpointWhitelist([...FALLBACK_MODELS], endpoint);
  const ids = result.map((m) => m.id).sort();

  assert.deepEqual(ids, ["deepseek-v4-flash", "glm-4.5-air", "kimi-k2.5", "my-custom-model"]);
  assert.ok(!ids.includes("gemini-2.5-flash"));
  assert.ok(!ids.includes("claude-3.5-sonnet"));
  assert.ok(!ids.includes("gpt-4o"));
});

test("a DELETED custom model (absent from endpoint list) is dropped, not resurrected", () => {
  // The custom model was removed from custom_models, so /api/models no longer
  // returns it. Even though a stale copy sits in the local cache, the whitelist
  // sync must NOT re-add it.
  const staleCache = [...FALLBACK_MODELS, custom("deleted-model")];
  const endpoint = [oai("deepseek-v4-flash"), oai("kimi-k2.5")];
  const result = applyEndpointWhitelist(staleCache, endpoint);
  const ids = result.map((m) => m.id);

  assert.ok(ids.includes("deepseek-v4-flash"));
  assert.ok(ids.includes("kimi-k2.5"));
  assert.ok(!ids.includes("deleted-model")); // deleted custom must NOT return
});

test("an existing custom model still returned by the endpoint is preserved", () => {
  const endpoint = [oai("deepseek-v4-flash"), custom("my-custom-model")];
  const result = applyEndpointWhitelist(FALLBACK_MODELS, endpoint);
  const ids = result.map((m) => m.id);
  assert.ok(ids.includes("my-custom-model"));
});

test("empty endpoint list degrades to all known local models (no stranded drop-down)", () => {
  const known = [oai("a"), oai("b")];
  const result = applyEndpointWhitelist(known, []);
  assert.deepEqual(result.map((m) => m.id), ["a", "b"]);
});

test("empty endpoint + empty known degrades to the static fallback list", () => {
  const result = applyEndpointWhitelist([], []);
  assert.deepEqual(result.map((m) => m.id), FALLBACK_MODELS.map((m) => m.id));
});

test("a locally known model already on the whitelist is not duplicated", () => {
  const local: ModelInfo = {
    id: "kimi-k2.5",
    displayName: "Kimi K2.5",
    description: "rich local desc",
    category: "Featured",
    contextWindow: 256_000,
  };
  const endpoint = [
    { id: "kimi-k2.5", displayName: "kimi-k2.5", description: "", category: "voidswitch", contextWindow: 128_000 } as ModelInfo,
  ];
  const result = applyEndpointWhitelist([local], endpoint);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "kimi-k2.5");
  // The curated local category is authoritative — a coarse endpoint value must
  // not override the FALLBACK group (Featured / Gemma / Images / Custom).
  assert.equal(result[0].category, "Featured");
});

test("a legacy custom model with a non-Custom category + isCustom marker is preserved", () => {
  // A custom model whose category was saved as something other than "Custom"
  // (legacy dirty data) is still flagged isCustom by /api/models — the whitelist
  // keeps it, so the UI can render its delete action.
  const legacyCustom: ModelInfo = {
    id: "legacy-custom",
    displayName: "Legacy Custom",
    description: "",
    category: "SomeCategory",
    isCustom: true,
    contextWindow: 800_000,
  };
  const endpoint = [oai("deepseek-v4-flash"), legacyCustom];
  const result = applyEndpointWhitelist(FALLBACK_MODELS, endpoint);
  const ids = result.map((m) => m.id);
  assert.ok(ids.includes("legacy-custom"));
});

test("applyEndpointWhitelist backfills thin endpoint fields from the local record", () => {
  // A provider that returns a model id with empty displayName/description/category
  // — the whitelist MUST fill these from the richer local static record so the
  // selector shows a human-friendly name instead of the bare id (BUG-021).
  const local: ModelInfo = {
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    description: "Google flagship",
    category: "Gemini",
    contextWindow: 1_000_000,
  };
  const endpoint = [{ id: "gemini-2.5-pro", displayName: "", description: "", category: "" } as ModelInfo];
  const result = applyEndpointWhitelist([local], endpoint);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "gemini-2.5-pro");
  assert.equal(result[0].displayName, "Gemini 2.5 Pro");
  assert.equal(result[0].description, "Google flagship");
  assert.equal(result[0].category, "Gemini");
  assert.equal(result[0].contextWindow, 1_000_000);
});

test("applyEndpointWhitelist prefers the local curated category over a coarse endpoint one", () => {
  // A provider returns a coarse (non-empty) category such as "Gemini"/
  // "All" derived from the model id prefix. The curated local FALLBACK group
  // (Featured / Gemma / Images) must NOT be overridden by that coarse guess.
  const local: ModelInfo = {
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    description: "",
    category: "Featured",
    contextWindow: 1_000_000,
  };
  const endpoint = [{ id: "gemini-2.5-flash", category: "Gemini" } as ModelInfo];
  const result = applyEndpointWhitelist([local], endpoint);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "gemini-2.5-flash");
  assert.equal(result[0].category, "Featured");
});
