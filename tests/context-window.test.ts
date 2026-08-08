/**
 * Focused test: message position allocation + context windowing logic.
 *
 * Covers two past corruption bugs:
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
  // Regression: the old flat 3-chars/token estimate under-counted CJK-heavy
  // history ~2.5x (Gemini tokenizes Chinese at ~1.4 chars/token), so the
  // sliding window never trimmed and every turn re-sent the whole history.
  const cjk = "中".repeat(100);
  const latin = "a".repeat(100);
  assert.equal(estimateTokens(cjk), 100, "~1 token per CJK character");
  assert.equal(estimateTokens(latin), 25, "~4 Latin characters per token");
  assert.ok(estimateTokens(cjk) > estimateTokens(latin) * 2);
});

test("buildApiMessagesWithSlidingWindow: CJK history trims against a realistic window", () => {
  // 300 turns of ~200 CJK chars each ≈ 60k tokens — must trim under a 20k
  // window even though the legacy estimator would have claimed only ~20k.
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
