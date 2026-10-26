/**
 * Focused test: message position allocation + context windowing logic.
 *
 * Covers two invariants:
 *  1. Next position must come from MAX(position), never the row count —
 *     after deletions, length+1 reuses an occupied position.
 *  2. The sliding window keeps whole messages newest-first, skips (never
 *     truncates) what doesn't fit, always keeps the newest message, and
 *     places the system instruction first.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextMessagePosition } from "@/lib/chat-persistence";
import {
  estimateTokens,
  selectContextMessages,
  buildApiMessages,
  buildApiMessagesWithSlidingWindow,
  resolveContextBudget,
} from "@/lib/context-manager";
import type { ChatMessage } from "@/types";

const msg = (role: ChatMessage["role"], content: string): ChatMessage => ({ role, content });

test("nextMessagePosition: empty conversation starts at 1", () => {
  assert.equal(nextMessagePosition([]), 1);
});

test("nextMessagePosition: comes from MAX(position), not row count", () => {
  // Positions 1 and 3 remain after position 2 was deleted. Row count + 1
  // would give 3 (a collision); MAX + 1 correctly gives 4.
  const rows = [{ position: 1 }, { position: 3 }];
  assert.equal(nextMessagePosition(rows), 4);
});

test("nextMessagePosition: tolerates string positions from the DB driver", () => {
  const rows = [{ position: "2" }, { position: "7" }];
  assert.equal(nextMessagePosition(rows), 8);
});

test("estimateTokens is monotonic and positive for non-empty text", () => {
  assert.equal(estimateTokens(""), 0);
  assert.ok(estimateTokens("hello world") > 0);
  assert.ok(estimateTokens("a".repeat(300)) > estimateTokens("a".repeat(30)));
});

test("estimateTokens: CJK text is estimated far denser than Latin text", () => {
  // A flat chars/token ratio under-counts CJK-heavy history ~2.5x (Gemini
  // tokenizes Chinese at ~1.39 chars/token), so CJK is estimated at 0.75
  // tokens per character — the measured density plus a small safety margin.
  // Rounding UP to a full 1 token/char over-corrects by 1.39x and was the
  // 256K-window defect: the sliding window then cut off at ~190K.
  const cjk = "中".repeat(100);
  const latin = "a".repeat(100);
  assert.equal(estimateTokens(cjk), 75, "~0.75 tokens per CJK character");
  assert.equal(estimateTokens(latin), 25, "~4 Latin characters per token");
  assert.ok(estimateTokens(cjk) > estimateTokens(latin) * 2);
});

test("estimateTokens: CJK estimate stays within a few percent of the real tokenizer", () => {
  // Real Gemini billing for the same payload (measured): Chinese text encodes
  // at ~1.39 chars/token. The local estimate must land within ±15% of that so
  // the configured window boundary is honored at every window size.
  const chars = 262_144; // 256K CJK characters
  const realTokens = Math.round(chars / 1.39);
  const estimated = estimateTokens("中".repeat(chars));
  const ratio = estimated / realTokens;
  assert.ok(
    ratio > 0.85 && ratio < 1.15,
    `estimate ${estimated} vs real ${realTokens} = ${ratio.toFixed(3)}x — outside the ±15% calibration band`
  );
});

test("buildApiMessagesWithSlidingWindow: CJK history trims against a realistic window", () => {
  // 300 turns of ~200 CJK chars each ≈ 60k tokens — must trim under a 20k
  // window even though a flat chars-per-token ratio would claim only ~20k.
  const messages: ChatMessage[] = [];
  for (let i = 0; i < 300; i++) {
    messages.push(msg(i % 2 === 0 ? "user" : "assistant", "这是一段中文对话内容。".repeat(20)));
  }
  const { messages: out, trimmed } = buildApiMessagesWithSlidingWindow(messages, undefined, 20_000);
  assert.equal(trimmed, true, "CJK-heavy history must trigger the sliding window");
  assert.ok(out.length < messages.length);
  assert.equal(out[out.length - 1].content, messages[messages.length - 1].content);
});

test("selectContextMessages: keeps everything when within budget", () => {
  const messages = [msg("user", "hi"), msg("assistant", "hello"), msg("user", "how are you?")];
  const selected = selectContextMessages(messages, { maxTokens: 10_000 });
  assert.deepEqual(selected, messages);
});

test("selectContextMessages: system instruction always first", () => {
  const messages = [msg("user", "hi"), msg("assistant", "hello")];
  const selected = selectContextMessages(messages, {
    maxTokens: 10_000,
    systemInstructions: "You are helpful.",
  });
  assert.equal(selected[0].role, "system");
  assert.equal(selected[0].content, "You are helpful.");
  assert.equal(selected.length, 3);
});

test("selectContextMessages: newest message survives even when it alone exceeds the window", () => {
  const huge = "x".repeat(30_000); // ~7.5k tokens at 4 chars/token
  const messages = [msg("user", "old turn"), msg("user", huge)];
  const selected = selectContextMessages(messages, { maxTokens: 100 });
  assert.equal(selected[selected.length - 1].content, huge);
});

test("selectContextMessages: oversize middle message is skipped, older small ones kept", () => {
  const messages = [
    msg("user", "first small turn"),
    msg("assistant", "y".repeat(30_000)), // too big — must be skipped, not a hard stop
    msg("user", "latest small turn"),
  ];
  const selected = selectContextMessages(messages, { maxTokens: 100 });
  const contents = selected.map((m) => m.content);
  assert.ok(contents.includes("first small turn"), "older small message survives");
  assert.ok(contents.includes("latest small turn"), "newest message survives");
  assert.ok(!contents.some((c) => c.length > 1000), "oversize message skipped");
});

test("buildApiMessages prepends system instructions", () => {
  const out = buildApiMessages([msg("user", "hi")], "sys");
  assert.equal(out[0].role, "system");
  assert.equal(out[1].content, "hi");
});

test("buildApiMessagesWithSlidingWindow: no trimming within budget", () => {
  const messages = [msg("user", "hi"), msg("assistant", "hello")];
  const { messages: out, trimmed } = buildApiMessagesWithSlidingWindow(messages, "sys", 100_000);
  assert.equal(trimmed, false);
  assert.equal(out.length, 3); // system + 2 messages
});

test("buildApiMessagesWithSlidingWindow: trims and flags when over budget", () => {
  const messages: ChatMessage[] = [];
  for (let i = 0; i < 20; i++) messages.push(msg(i % 2 === 0 ? "user" : "assistant", "word ".repeat(600)));
  const { messages: out, trimmed, originalCount } = buildApiMessagesWithSlidingWindow(
    messages,
    undefined,
    1_000
  );
  assert.equal(trimmed, true);
  assert.equal(originalCount, 20);
  assert.ok(out.length < 20, "window dropped old messages");
  // The newest message must always be present (last non-system entry).
  const last = out[out.length - 1];
  assert.equal(last.content, messages[messages.length - 1].content);
});

test("buildApiMessagesWithSlidingWindow: maxTokens=0 disables the window", () => {
  const messages = [msg("user", "hi")];
  const { trimmed } = buildApiMessagesWithSlidingWindow(messages, undefined, 0);
  assert.equal(trimmed, false);
});

// ============ Context window boundary accuracy ============
//
// The sliding window trims on the LOCAL token estimate, so a constant biased
// high silently shrinks the usable budget — and the shortfall scales linearly
// with the configured window. These tests pin the boundary.

/**
 * Feed CJK history into the window and report how much SURVIVED, i.e. the
 * real effective cutoff. The history is sized to comfortably exceed the window
 * so the window is genuinely exercised rather than passing everything through.
 */
function effectiveCutoff(windowTokens: number): number {
  const perMessageChars = 1000;
  // Enough messages to overflow the largest window under test.
  const count = Math.ceil((windowTokens * 2) / Math.ceil(perMessageChars * 0.75)) + 10;
  const messages: ChatMessage[] = [];
  for (let i = 0; i < count; i++) {
    messages.push(msg(i % 2 === 0 ? "user" : "assistant", "中".repeat(perMessageChars)));
  }
  const budget = resolveContextBudget({ contextWindow: windowTokens, maxOutputTokens: 65536 });
  const { messages: out } = buildApiMessagesWithSlidingWindow(messages, undefined, budget.promptTokens);
  return out.reduce((acc, m) => acc + estimateTokens(m.content), 0);
}

test("context window: 256K window keeps ~256K of history, not ~190K", () => {
  const window = 262_144;
  const budget = resolveContextBudget({ contextWindow: window, maxOutputTokens: 65536 });
  // The prompt budget reserves the output cap and the RAG share, so it sits
  // below the window — but it must stay close to it.
  const budgetRatio = budget.promptTokens / window;
  assert.ok(
    budgetRatio > 0.8,
    `prompt budget ${budget.promptTokens} is only ${(budgetRatio * 100).toFixed(1)}% of the window`
  );

  const kept = effectiveCutoff(window);
  // The estimate tracks the real tokenizer, so the retained history must be
  // within ±15% of the prompt budget.
  const ratio = kept / budget.promptTokens;
  assert.ok(
    ratio > 0.85 && ratio < 1.05,
    `kept ${kept} of a ${budget.promptTokens}-token prompt budget (${(ratio * 100).toFixed(1)}%)`
  );
});

test("context window: the boundary error does not grow with the window size", () => {
  // A proportional estimator error would cost more absolute tokens as the window
  // grows. The calibrated estimator must keep the relative error flat.
  const sizes = [16_384, 65_536, 131_072, 262_144, 524_288];
  const ratios = sizes.map((w) => {
    const budget = resolveContextBudget({ contextWindow: w, maxOutputTokens: 65536 });
    return effectiveCutoff(w) / budget.promptTokens;
  });
  for (const [i, ratio] of ratios.entries()) {
    assert.ok(
      ratio > 0.85 && ratio < 1.05,
      `window ${sizes[i]}: kept ${(ratio * 100).toFixed(1)}% of the prompt budget — outside ±15%`
    );
  }
});

test("resolveContextBudget: prompt + output + rag never exceed the window", () => {
  for (const window of [16_384, 65_536, 262_144, 1_048_576]) {
    const b = resolveContextBudget({ contextWindow: window, maxOutputTokens: 65536, ragReserveRatio: 0.1 });
    assert.ok(
      b.promptTokens + b.outputTokens + b.ragTokens <= window,
      `window ${window}: ${b.promptTokens}+${b.outputTokens}+${b.ragTokens} > ${window}`
    );
    assert.ok(b.promptTokens > 0, `window ${window}: no prompt budget left`);
  }
});

test("resolveContextBudget: the output reservation is clamped for small windows", () => {
  // A 4K window must not hand the whole thing to the prompt with a 64K output
  // cap attached, and must never invert (negative prompt budget).
  const b = resolveContextBudget({ contextWindow: 4096, maxOutputTokens: 65536 });
  assert.ok(b.outputTokens <= 4096);
  assert.ok(b.promptTokens >= 0);
  assert.ok(b.promptTokens + b.outputTokens <= 4096);
});

test("resolveContextBudget: zero window yields a zero budget", () => {
  assert.deepEqual(resolveContextBudget({ contextWindow: 0 }), {
    promptTokens: 0,
    outputTokens: 0,
    ragTokens: 0,
  });
});

test("resolveContextBudget: ragReserveRatio 0 holds nothing back", () => {
  const b = resolveContextBudget({ contextWindow: 262_144, maxOutputTokens: 65536, ragReserveRatio: 0 });
  assert.equal(b.ragTokens, 0);
});
