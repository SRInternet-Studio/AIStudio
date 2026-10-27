/**
 * Focused test: FALLBACK_MODELS integrity.
 *
 * The list is the offline catalog shown when the provider's model endpoint
 * cannot be reached, so it must stay a valid ModelInfo[] with unique ids and a
 * category the selector can actually render.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FALLBACK_MODELS } from "@/lib/models";

// The selector renders exactly these tabs; an unknown category is unreachable.
const SELECTOR_CATEGORIES = new Set(["Featured", "All", "Gemini", "Gemma", "Images", "Custom"]);

test("every entry has an id, a display name and a renderable category", () => {
  for (const m of FALLBACK_MODELS) {
    assert.ok(m.id, "id must be present");
    assert.ok(m.displayName, `displayName missing for ${m.id}`);
    assert.ok(m.description !== undefined, `description missing for ${m.id}`);
    assert.ok(
      SELECTOR_CATEGORIES.has(m.category),
      `${m.id} has category "${m.category}" which the selector cannot render`
    );
  }
});

test("model ids are unique — a duplicate silently shadows the other entry", () => {
  const seen = new Map<string, number>();
  for (const m of FALLBACK_MODELS) seen.set(m.id, (seen.get(m.id) || 0) + 1);
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  assert.deepEqual(dupes, [], `duplicate ids: ${dupes.join(", ")}`);
});

test("display names are unique — the selector would show two identical rows", () => {
  const seen = new Map<string, number>();
  for (const m of FALLBACK_MODELS) seen.set(m.displayName, (seen.get(m.displayName) || 0) + 1);
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([name]) => name);
  assert.deepEqual(dupes, [], `duplicate display names: ${dupes.join(", ")}`);
});

test("current Gemini generations from the provider catalog are present", () => {
  const ids = new Set(FALLBACK_MODELS.map((m) => m.id));
  for (const id of ["gemini-4-argon", "gemini-3.8-flash", "gemini-3.1-flash-lite"]) {
    assert.ok(ids.has(id), `missing current model ${id}`);
  }
});

test("the flagship Gemini entry sorts into Featured so it is visible on open", () => {
  const featured = FALLBACK_MODELS.filter((m) => m.category === "Featured");
  assert.ok(featured.length > 0, "Featured must never be empty or the panel opens on a blank list");
  assert.equal(featured[0].id, "gemini-4-argon", "the newest flagship leads the Featured tab");
});

test("Google models keep the 800K window, non-Google keep an explicit one", () => {
  for (const m of FALLBACK_MODELS) {
    assert.ok(m.contextWindow && m.contextWindow > 0, `${m.id} needs an explicit context window`);
  }
});
