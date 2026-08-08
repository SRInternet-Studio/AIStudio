import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGeminiThinkingConfig } from "@/lib/api-client";

// ============ buildGeminiThinkingConfig ============
// Gemini 2.5 models take a thinkingBudget (tokens); Gemini 3+ take a
// thinkingLevel enum. Gemini 3 additionally ENCRYPTS the reasoning trace
// (only an opaque thoughtSignature is returned), so includeThoughts=true is
// mandatory for the thinking bubble to have any text to display
// (verified against the live endpoint: thinkingSummaries inside
// thinkingConfig is silently ignored).

test("Gemini 2.5 models get a thinkingBudget, never includeThoughts", () => {
  assert.deepEqual(buildGeminiThinkingConfig("gemini-2.5-pro", "minimal"), { thinkingBudget: 0 });
  assert.deepEqual(buildGeminiThinkingConfig("gemini-2.5-flash", "low"), { thinkingBudget: 1024 });
  assert.deepEqual(buildGeminiThinkingConfig("gemini-2.5-flash", "medium"), { thinkingBudget: 4096 });
  assert.deepEqual(buildGeminiThinkingConfig("gemini-2.5-flash-lite", "high"), { thinkingBudget: 8192 });
});

test("Gemini 3+ models get a thinkingLevel plus includeThoughts=true", () => {
  for (const model of ["gemini-3-pro-preview", "gemini-3.1-flash-lite", "gemini-3.5-flash"]) {
    const high = buildGeminiThinkingConfig(model, "high");
    assert.equal(high.thinkingLevel, "HIGH");
    assert.equal(high.includeThoughts, true, "includeThoughts required so encrypted thinking is displayable");
    assert.equal(high.thinkingSummaries, undefined, "thinkingSummaries is ignored inside thinkingConfig");
    const low = buildGeminiThinkingConfig(model, "low");
    assert.equal(low.thinkingLevel, "LOW");
    assert.equal(low.includeThoughts, true);
  }
});

test("non-Gemini / unknown models fall back to the budget shape", () => {
  assert.deepEqual(buildGeminiThinkingConfig("some-other-model", "high"), { thinkingBudget: 8192 });
});
