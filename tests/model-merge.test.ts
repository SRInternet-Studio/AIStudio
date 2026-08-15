import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeModelLists } from "@/lib/models";
import type { ModelInfo } from "@/types";

const m = (id: string, displayName = id): ModelInfo => ({
  id,
  displayName,
  description: "",
  category: "All",
  contextWindow: 128_000,
});

test("mergeModelLists appends new endpoint models", () => {
  const merged = mergeModelLists([m("a")], [m("b"), m("c")]);
  assert.deepEqual(merged.map((x) => x.id), ["a", "b", "c"]);
});

test("mergeModelLists never drops locally known models", () => {
  // Endpoint no longer returns "legacy" — it must survive the sync.
  const merged = mergeModelLists([m("legacy"), m("a")], [m("b")]);
  assert.ok(merged.some((x) => x.id === "legacy"));
  assert.ok(merged.some((x) => x.id === "a"));
  assert.ok(merged.some((x) => x.id === "b"));
  assert.equal(merged.length, 3);
});

test("mergeModelLists: duplicate ID takes the endpoint definition", () => {
  const merged = mergeModelLists(
    [m("gemini-3.6-flash", "Old name")],
    [{ ...m("gemini-3.6-flash", "Fresh name"), contextWindow: 1_000_000 }]
  );
  const hit = merged.find((x) => x.id === "gemini-3.6-flash");
  assert.ok(hit);
  assert.equal(hit.displayName, "Fresh name");
  assert.equal(hit.contextWindow, 1_000_000);
  assert.equal(merged.length, 1);
});

test("mergeModelLists handles empty inputs", () => {
  assert.deepEqual(mergeModelLists([], [m("a")]).map((x) => x.id), ["a"]);
  assert.deepEqual(mergeModelLists([m("a")], []).map((x) => x.id), ["a"]);
  assert.deepEqual(mergeModelLists([], []), []);
});

test("mergeModelLists: missing endpoint fields fall back to the local record", () => {
  const local: ModelInfo = {
    id: "gemini-3.6-flash",
    displayName: "Gemini 3.6 Flash",
    description: "Local description",
    category: "Featured",
    contextWindow: 800_000,
  };
  // Relay returns a bare entry: no description, empty category, no context.
  const incomingEntry = {
    id: "gemini-3.6-flash",
    displayName: "",
    description: "",
    category: "",
    contextWindow: 0,
  } as ModelInfo;
  const merged = mergeModelLists([local], [incomingEntry]);
  const hit = merged.find((x) => x.id === "gemini-3.6-flash");
  assert.ok(hit);
  assert.equal(hit.displayName, "Gemini 3.6 Flash");
  assert.equal(hit.description, "Local description");
  assert.equal(hit.category, "Featured");
  assert.equal(hit.contextWindow, 800_000);
});

test("mergeModelLists: partial endpoint data keeps its own provided fields", () => {
  const local: ModelInfo = {
    id: "x",
    displayName: "Old name",
    description: "Old desc",
    category: "Featured",
    contextWindow: 100_000,
  };
  const incomingEntry = {
    id: "x",
    displayName: "New name",
    description: "",
    category: "",
    contextWindow: 200_000,
  } as ModelInfo;
  const merged = mergeModelLists([local], [incomingEntry]);
  const hit = merged.find((mm) => mm.id === "x");
  assert.ok(hit);
  assert.equal(hit.displayName, "New name"); // endpoint value wins
  assert.equal(hit.description, "Old desc"); // empty -> local fallback
  assert.equal(hit.category, "Featured"); // empty -> local fallback
  assert.equal(hit.contextWindow, 200_000); // endpoint value wins
});
