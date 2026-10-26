/**
 * Unit tests for calculateCurrentContextTokens: the local, CJK-aware estimate
 * of the current session's context usage (whole conversation and the
 * sliding-window subset), independent of the API-reported cumulative totals.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCurrentContextTokens,
  estimateTokens,
} from "@/lib/context-manager";
import type { Block, BlockType, Message } from "@/types";

let seq = 0;
const block = (type: BlockType, content: string, is_deleted = false): Block => ({
  id: `b-${++seq}`,
  message_id: "m",
  type,
  content,
  position: 0,
  is_deleted,
  created_at: "",
});

const msg = (
  role: Message["role"],
  blocks: Block[]
): Message & { blocks: Block[] } => ({
  id: `m-${++seq}`,
  conversation_id: "c",
  parent_message_id: null,
  role,
  position: 0,
  created_at: "",
  blocks,
});

test("counts every visible block across user and assistant messages", () => {
  const messages = [
    msg("user", [block("text", "你好世界")]), // 4 CJK chars -> 4 tokens
    msg("assistant", [
      block("thinking", "abcd"), // 4 latin chars -> 1 token
      block("text", "回答"), // 2 CJK chars -> 2 tokens
    ]),
  ];
  const result = calculateCurrentContextTokens(messages);
  // Blocks within a message are joined with "\n" before estimation.
  assert.equal(
    result.fullContextTokens,
    estimateTokens("你好世界") + estimateTokens("abcd\n回答")
  );
  assert.equal(result.windowContextTokens, result.fullContextTokens);
  assert.equal(result.trimmed, false);
});

test("excludes deleted blocks and grounding metadata", () => {
  const messages = [
    msg("user", [block("text", "保留内容")]),
    msg("assistant", [
      block("text", "删除内容", true),
      block("grounding", '{"sources":[]}'),
    ]),
  ];
  const result = calculateCurrentContextTokens(messages);
  assert.equal(result.fullContextTokens, estimateTokens("保留内容"));
});

test("excludes media blob blocks (base64 data URLs) from the estimate", () => {
  const base64DataUrl = "data:image/png;base64," + "A".repeat(2_000_000);
  const messages = [
    msg("user", [block("text", "看图"), block("image", base64DataUrl)]),
    msg("assistant", [block("text", "好")]),
  ];
  const result = calculateCurrentContextTokens(messages);
  // Only the CJK text blocks are estimated — the 2M-char base64 data URL would
  // otherwise add ~500K fake latin tokens and inflate the context estimate.
  assert.equal(result.fullContextTokens, estimateTokens("看图") + estimateTokens("好"));
});

test("excludes video/audio/pdf blob blocks too", () => {
  const messages = [
    msg("user", [
      block("video", "data:video/mp4;base64," + "A".repeat(1_000_000)),
      block("audio", "data:audio/webm;base64," + "A".repeat(500_000)),
      block("pdf", "data:application/pdf;base64," + "B".repeat(300_000)),
      block("text", "视频说明"),
    ]),
  ];
  const result = calculateCurrentContextTokens(messages);
  assert.equal(result.fullContextTokens, estimateTokens("视频说明"));
});

test("thinking block is counted once within its message (no double-count with text)", () => {
  const messages = [
    msg("assistant", [
      block("thinking", "思考过程内容"),
      block("text", "正式回答内容"),
    ]),
  ];
  const result = calculateCurrentContextTokens(messages);
  // Blocks within a message are joined with "\n" and estimated ONCE, so the
  // message contributes the joined estimate — the thinking blocks are never
  // summed separately from their sibling text block (no double-count).
  assert.equal(result.fullContextTokens, estimateTokens("思考过程内容\n正式回答内容"));
});

test("messages without visible blocks contribute nothing", () => {
  const messages = [
    msg("user", [block("text", "有效消息")]),
    msg("assistant", []),
  ];
  const result = calculateCurrentContextTokens(messages);
  assert.equal(result.fullContextTokens, estimateTokens("有效消息"));
});

test("includes system instructions in both dimensions", () => {
  const messages = [msg("user", [block("text", "hello")])];
  const withSystem = calculateCurrentContextTokens(messages, {
    systemInstructions: "你是一个助手",
  });
  const without = calculateCurrentContextTokens(messages);
  assert.equal(
    withSystem.fullContextTokens - without.fullContextTokens,
    estimateTokens("你是一个助手")
  );
});

test("without a context limit the window equals the full conversation", () => {
  const messages = [
    msg("user", [block("text", "长".repeat(500))]),
    msg("assistant", [block("text", "长".repeat(500))]),
  ];
  const result = calculateCurrentContextTokens(messages);
  assert.equal(result.trimmed, false);
  assert.equal(result.windowContextTokens, result.fullContextTokens);
});

test("with a small context limit the window trims older turns", () => {
  const messages = [
    msg("user", [block("text", "旧".repeat(400))]), // ~400 tokens
    msg("assistant", [block("text", "旧".repeat(400))]), // ~400 tokens
    msg("user", [block("text", "新问题")]), // newest
  ];
  const result = calculateCurrentContextTokens(messages, { maxTokens: 500 });
  assert.equal(result.trimmed, true);
  assert.ok(result.windowContextTokens < result.fullContextTokens);
  // The newest message must survive the window.
  assert.ok(result.windowContextTokens >= estimateTokens("新问题"));
});
