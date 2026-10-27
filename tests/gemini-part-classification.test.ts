/**
 * Focused test: Gemini response part classification.
 *
 * A thoughtSignature is reasoning-continuity metadata that can attach to ANY
 * part in the generateContent API — including the final visible answer part.
 * Classifying it as "thinking" routes the answer into the thinking bubble and
 * leaves the reply empty, which shows up as "the model cannot read the URL"
 * whenever a tool (Google Search + URL context) is enabled.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { geminiPartDeltas, parseGeminiGenerateContentResponse } from "@/lib/api-client";

function texts(deltas: { type: string; text?: string }[]) {
  return {
    text: deltas.filter((d) => d.type === "text").map((d) => d.text).join(""),
    thinking: deltas.filter((d) => d.type === "thinking").map((d) => d.text).join(""),
  };
}

test("an answer part carrying only thoughtSignature is TEXT, not thinking", () => {
  // Live shape of the final answer part: text + thoughtSignature, no flags.
  const { text, thinking } = texts(geminiPartDeltas({ text: "20 URLs / 34MB limit", thoughtSignature: "CqMBIk..." }));
  assert.equal(text, "20 URLs / 34MB limit");
  assert.equal(thinking, "");
});

test("part.thought === true is still thinking", () => {
  const { text, thinking } = texts(geminiPartDeltas({ text: "reasoning trace", thought: true }));
  assert.equal(thinking, "reasoning trace");
  assert.equal(text, "");
});

test("part.thinking === true is still thinking (alternate marker)", () => {
  const { text, thinking } = texts(geminiPartDeltas({ text: "reasoning trace", thinking: true }));
  assert.equal(thinking, "reasoning trace");
  assert.equal(text, "");
});

test("thought:false with a signature is text, not thinking", () => {
  const { text, thinking } = texts(geminiPartDeltas({ text: "answer", thought: false, thoughtSignature: "sig" }));
  assert.equal(text, "answer");
  assert.equal(thinking, "");
});

test("a thought summary followed by the signed answer keeps both", () => {
  // Order mirrors the live stream: summary first, answer last.
  const deltas = [
    ...geminiPartDeltas({ text: "Let me check the docs.", thought: true, thoughtSignature: "s1" }),
    ...geminiPartDeltas({ text: "The limit is 20 URLs.", thoughtSignature: "s2" }),
  ];
  assert.deepEqual(deltas.map((d) => d.type), ["thinking", "text"]);
  assert.equal(texts(deltas).thinking, "Let me check the docs.");
  assert.equal(texts(deltas).text, "The limit is 20 URLs.");
});

test("tool parts keep their own delta types", () => {
  assert.deepEqual(geminiPartDeltas({ functionCall: { name: "f", args: {} } }), [
    { type: "tool_result", toolResult: { type: "function_call", content: JSON.stringify({ name: "f", args: {} }) } },
  ]);
  assert.deepEqual(geminiPartDeltas({ executableCode: { code: "print(1)" } })[0].toolResult, {
    type: "code_execution",
    content: "print(1)",
  });
  assert.deepEqual(geminiPartDeltas({ codeExecutionResult: { output: "1" } })[0].toolResult, {
    type: "code_execution_result",
    content: "1",
  });
});

test("full non-streaming response: url_context + google_search answer is not swallowed", () => {
  const parsed = parseGeminiGenerateContentResponse({
    candidates: [
      {
        content: {
          parts: [
            { text: "Checking the URL context tool docs.", thought: true, thoughtSignature: "sigA" },
            { text: "URL context allows up to 20 URLs and 34 MB.", thoughtSignature: "sigB" },
          ],
        },
        groundingMetadata: {
          groundingChunks: [{ web: { uri: "https://ai.google.dev/gemini-api/docs/url-context", title: "URL context" } }],
          groundingSupports: [{ segment: { startIndex: 0, endIndex: 10, text: "URL context" }, groundingChunkIndices: [0] }],
        },
      },
    ],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
  });

  assert.equal(parsed.text, "URL context allows up to 20 URLs and 34 MB.");
  assert.equal(parsed.thinking, "Checking the URL context tool docs.");
  assert.ok(parsed.groundingMetadata, "grounding metadata still captured alongside url context");
});

test("an answer with no signature at all is plain text (backward compatible)", () => {
  assert.equal(texts(geminiPartDeltas({ text: "plain answer" })).text, "plain answer");
});
