import { test } from "node:test";
import assert from "node:assert/strict";
import { stripTrailingModelTurns } from "@/lib/api-client";

// ============ stripTrailingModelTurns ============
// Gemini rejects requests whose `contents` end with a model turn (400
// "Requests ending with a model turn are not supported"). Regenerate/rerun
// context rebuilds can produce such sequences — the guard must restore a
// user-terminated sequence without touching valid alternations.

test("keeps properly alternating user/model sequences unchanged", () => {
  const contents = [
    { role: "user", parts: [{ text: "a" }] },
    { role: "model", parts: [{ text: "b" }] },
    { role: "user", parts: [{ text: "c" }] },
  ];
  const out = stripTrailingModelTurns(contents);
  assert.equal(out.length, 3);
  assert.equal(out[out.length - 1].role, "user");
});

test("drops a single trailing model turn", () => {
  const contents = [
    { role: "user", parts: [{ text: "a" }] },
    { role: "model", parts: [{ text: "b" }] },
    { role: "user", parts: [{ text: "c" }] },
    { role: "model", parts: [{ text: "d" }] },
  ];
  const out = stripTrailingModelTurns(contents);
  assert.equal(out.length, 3);
  assert.deepEqual(out[2].parts, [{ text: "c" }]);
});

test("drops multiple consecutive trailing model turns", () => {
  const contents = [
    { role: "user", parts: [{ text: "a" }] },
    { role: "model", parts: [{ text: "b" }] },
    { role: "model", parts: [{ text: "c" }] },
  ];
  const out = stripTrailingModelTurns(contents);
  assert.equal(out.length, 1);
  assert.equal(out[0].role, "user");
});

test("returns an empty array for an all-model sequence (caller must reject)", () => {
  const contents = [
    { role: "model", parts: [{ text: "a" }] },
    { role: "model", parts: [{ text: "b" }] },
  ];
  assert.deepEqual(stripTrailingModelTurns(contents), []);
});

test("does not mutate the input array", () => {
  const contents = [
    { role: "user", parts: [{ text: "a" }] },
    { role: "model", parts: [{ text: "b" }] },
  ];
  stripTrailingModelTurns(contents);
  assert.equal(contents.length, 2);
});
