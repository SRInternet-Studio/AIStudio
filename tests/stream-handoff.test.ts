/**
 * Focused test: the post-stream handoff that keeps a finished reply on screen.
 *
 * The streaming bubble is a render artifact of `isStreaming`, so it unmounts the
 * moment the stream ends, while the DB write and reload are asynchronous. The
 * accumulated buffer is promoted into a regular message before the streaming
 * state clears, and `applyDbMessages` drops it once the persisted row (same
 * text) arrives. These tests pin both halves.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  buildOptimisticAssistantMessage,
  hasPersistableContent,
  OPTIMISTIC_POSITION,
} from "@/lib/chat-persistence";
import { useChatStore, applyDbMessages } from "@/store/chatStore";
import type { Message } from "@/types";

const NOW = "2026-10-26T10:00:00.000Z";

function makeMsg(
  id: string,
  convId: string,
  role: "user" | "assistant",
  opts: { position?: number; blocks?: any[] } = {}
): Message {
  return {
    id,
    conversation_id: convId,
    parent_message_id: null,
    role,
    position: opts.position ?? 0,
    created_at: NOW,
    blocks: opts.blocks ?? [
      {
        id: `${id}-b`,
        message_id: id,
        type: "text",
        content: `${role} content`,
        position: 0,
        is_deleted: false,
        created_at: NOW,
      },
    ],
  } as Message;
}

beforeEach(() => {
  useChatStore.setState({ messages: [] });
});

// ============ buildOptimisticAssistantMessage ============

test("promoted reply carries the streamed text and is not empty", () => {
  const m = buildOptimisticAssistantMessage({
    conversationId: "c1",
    id: "a1",
    text: "完整的回答内容",
    now: NOW,
  });
  const blocks = m.blocks || [];
  assert.equal(m.role, "assistant");
  assert.equal(m.conversation_id, "c1");
  assert.equal(m.position, OPTIMISTIC_POSITION);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "text");
  assert.equal(blocks[0].content, "完整的回答内容");
  assert.equal(blocks[0].is_deleted, false);
});

test("promoted reply keeps thinking before text (render order matches the DB)", () => {
  const m = buildOptimisticAssistantMessage({
    conversationId: "c1",
    id: "a1",
    text: "回答",
    thinking: "思考过程",
    now: NOW,
  });
  const blocks = m.blocks || [];
  assert.deepEqual(
    blocks.map((b) => b.type),
    ["thinking", "text"]
  );
  assert.equal(blocks[0].content, "思考过程");
  assert.equal(blocks[1].content, "回答");
});

test("promoted reply is renderable even with thinking only", () => {
  const m = buildOptimisticAssistantMessage({
    conversationId: "c1",
    id: "a1",
    text: "",
    thinking: "只有思考",
    now: NOW,
  });
  // A thinking-only reply must still render (ChatArea skips messages whose
  // blocks are all non-visible, and thinking blocks ARE visible).
  const hasVisible = (m.blocks || []).some((b) => !b.is_deleted && b.type !== "grounding");
  assert.equal(hasVisible, true);
});

test("empty stream output is never promoted (nothing was generated)", () => {
  assert.equal(hasPersistableContent("", ""), false);
  assert.equal(hasPersistableContent("", "thinking"), true);
  assert.equal(hasPersistableContent("text"), true);
});

// ============ applyDbMessages: the handoff must not flicker or duplicate ============

test("promoted reply SURVIVES a reload that does not yet contain it", () => {
  // The DB write is still in flight: the reload returns only the user turn.
  const optimistic = buildOptimisticAssistantMessage({
    conversationId: "c1",
    id: "optimistic-a",
    text: "流式生成的回答",
    now: NOW,
  });
  useChatStore.setState({
    messages: [makeMsg("u1", "c1", "user", { position: 1 }), optimistic],
  });

  applyDbMessages("c1", [makeMsg("u1", "c1", "user", { position: 1 })]);

  const msgs = useChatStore.getState().messages;
  assert.equal(msgs.length, 2, "the reply must stay visible while the write is in flight");
  assert.ok(msgs.some((m) => m.id === "optimistic-a"));
});

test("promoted reply is REPLACED by the persisted row, never duplicated", () => {
  // The write has landed: the reload now carries the real assistant row with a
  // different id but the same text.
  const optimistic = buildOptimisticAssistantMessage({
    conversationId: "c1",
    id: "optimistic-a",
    text: "流式生成的回答",
    now: NOW,
  });
  useChatStore.setState({
    messages: [makeMsg("u1", "c1", "user", { position: 1 }), optimistic],
  });

  const persistedAssistant = makeMsg("db-a", "c1", "assistant", {
    position: 2,
    blocks: [
      {
        id: "db-a-b",
        message_id: "db-a",
        type: "text",
        content: "流式生成的回答",
        position: 0,
        is_deleted: false,
        created_at: NOW,
      },
    ],
  });
  applyDbMessages("c1", [
    makeMsg("u1", "c1", "user", { position: 1 }),
    persistedAssistant,
  ]);

  const msgs = useChatStore.getState().messages;
  assert.equal(msgs.length, 2, "exactly one user turn + one assistant turn");
  assert.ok(msgs.some((m) => m.id === "db-a"), "the persisted row is shown");
  assert.ok(!msgs.some((m) => m.id === "optimistic-a"), "the optimistic twin is gone");
  // The persisted row keeps its real position (ordering stays correct).
  assert.equal(msgs[1].position, 2);
});

test("a thinking-only promoted reply is also superseded by its persisted row", () => {
  const optimistic = buildOptimisticAssistantMessage({
    conversationId: "c1",
    id: "optimistic-a",
    text: "",
    thinking: "只有思考内容",
    now: NOW,
  });
  useChatStore.setState({
    messages: [makeMsg("u1", "c1", "user", { position: 1 }), optimistic],
  });

  const persisted = makeMsg("db-a", "c1", "assistant", {
    position: 2,
    blocks: [
      {
        id: "db-a-t",
        message_id: "db-a",
        type: "thinking",
        content: "只有思考内容",
        position: 0,
        is_deleted: false,
        created_at: NOW,
      },
    ],
  });
  applyDbMessages("c1", [makeMsg("u1", "c1", "user", { position: 1 }), persisted]);

  const msgs = useChatStore.getState().messages;
  assert.equal(msgs.length, 2, "no duplicate thinking-only reply");
  assert.ok(!msgs.some((m) => m.id === "optimistic-a"));
});

test("a promoted reply from ANOTHER conversation is never mixed in", () => {
  // The optimistic reply belongs to a different conversation: applying a reload
  // for c1 must replace the transcript entirely, so the foreign reply is
  // dropped rather than leaking into another conversation's view.
  const optimistic = buildOptimisticAssistantMessage({
    conversationId: "other",
    id: "optimistic-other",
    text: "别处的回答",
    now: NOW,
  });
  useChatStore.setState({ messages: [optimistic] });

  applyDbMessages("c1", [makeMsg("u1", "c1", "user", { position: 1 })]);

  const msgs = useChatStore.getState().messages;
  assert.equal(msgs.length, 1);
  assert.ok(msgs.some((m) => m.id === "u1"), "the target conversation's transcript is shown");
  assert.ok(!msgs.some((m) => m.id === "optimistic-other"), "no foreign reply leaks in");
});

test("an empty reload still refuses to wipe a promoted reply", () => {
  // A failed reload must not take the reply back off the screen either.
  const optimistic = buildOptimisticAssistantMessage({
    conversationId: "c1",
    id: "optimistic-a",
    text: "回答",
    now: NOW,
  });
  useChatStore.setState({
    messages: [makeMsg("u1", "c1", "user", { position: 1 }), optimistic],
  });

  const applied = applyDbMessages("c1", []);
  assert.equal(applied, false);
  assert.equal(useChatStore.getState().messages.length, 2);
});
