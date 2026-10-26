/**
 * Focused test: defensive DB-reload application (applyDbMessages).
 *
 * After a failed send (e.g. the reverse proxy rejecting an oversized media
 * request) the UI holds unsaved local state — the optimistic user bubble and
 * a client-only error bubble. Any DB reload racing with that state must NOT
 * wipe it: an empty response is refused, and error bubbles survive non-empty
 * reloads. Switching conversations must still replace the transcript.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useChatStore, applyDbMessages } from "@/store/chatStore";
import type { Message } from "@/types";

function makeMsg(id: string, convId: string, role: "user" | "assistant", blockTypes: string[] = ["text"]): Message {
  return {
    id,
    conversation_id: convId,
    parent_message_id: null,
    role,
    position: 0,
    created_at: "2026-09-02T00:00:00.000Z",
    blocks: blockTypes.map((t, i) => ({
      id: `${id}-b${i}`,
      message_id: id,
      type: t as any,
      content: `${t} content`,
      position: i,
      is_deleted: false,
      created_at: "2026-09-02T00:00:00.000Z",
    })),
  } as Message;
}

beforeEach(() => {
  useChatStore.setState({ messages: [] });
});

test("empty DB response never wipes unsaved local messages of the same conversation", () => {
  // Proxy rejected the request: user bubble exists locally but nothing was persisted.
  useChatStore.setState({ messages: [makeMsg("u1", "conv-a", "user")] });

  const applied = applyDbMessages("conv-a", []);

  assert.equal(applied, false);
  const msgs = useChatStore.getState().messages;
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].id, "u1"); // user bubble survives the reload
});

test("empty DB response still clears the view when switching to an empty conversation", () => {
  useChatStore.setState({ messages: [makeMsg("u1", "conv-a", "user")] });

  const applied = applyDbMessages("conv-b", []);

  assert.equal(applied, true);
  assert.equal(useChatStore.getState().messages.length, 0);
});

test("client-only error bubbles survive a non-empty reload", () => {
  const errorBubble = makeMsg("e1", "conv-a", "assistant", ["error"]);
  useChatStore.setState({ messages: [makeMsg("u1", "conv-a", "user"), errorBubble] });

  const applied = applyDbMessages("conv-a", [makeMsg("u1-db", "conv-a", "user")]);

  assert.equal(applied, true);
  const msgs = useChatStore.getState().messages;
  assert.deepEqual(msgs.map((m) => m.id), ["u1-db", "e1"]); // error re-appended after DB content
});

test("non-empty reload without local error bubbles replaces the transcript normally", () => {
  useChatStore.setState({ messages: [makeMsg("tmp", "conv-a", "user")] });

  const applied = applyDbMessages("conv-a", [
    makeMsg("m1", "conv-a", "user"),
    makeMsg("m2", "conv-a", "assistant"),
  ]);

  assert.equal(applied, true);
  assert.deepEqual(useChatStore.getState().messages.map((m) => m.id), ["m1", "m2"]);
});

test("non-array payload is rejected without touching the store", () => {
  useChatStore.setState({ messages: [makeMsg("u1", "conv-a", "user")] });

  const applied = applyDbMessages("conv-a", undefined as any);

  assert.equal(applied, false);
  assert.equal(useChatStore.getState().messages.length, 1);
});

test("optimistic user message (failed send, sentinel position) survives a non-empty reload", () => {
  // Send failed BEFORE the server persisted it: an optimistic user bubble sits
  // at the sentinel position and is absent from the non-empty DB snapshot.
  const optimistic = { ...makeMsg("opt-1", "conv-a", "user", ["text"]), position: 9999 };
  optimistic.blocks![0].content = "未入库消息";
  useChatStore.setState({ messages: [optimistic] });

  const applied = applyDbMessages("conv-a", [
    makeMsg("m1", "conv-a", "user"),
    makeMsg("m2", "conv-a", "assistant"),
  ]);

  assert.equal(applied, true);
  // The user bubble is kept (appended), so the reload does not wipe it.
  assert.deepEqual(useChatStore.getState().messages.map((m) => m.id), ["m1", "m2", "opt-1"]);
});

test("optimistic user message is NOT duplicated when the turn was already persisted", () => {
  // Successful send: the optimistic temp matches an already-persisted user msg.
  const persisted = makeMsg("user-1", "conv-a", "user", ["text"]);
  persisted.blocks![0].content = "你好";
  const optimistic = { ...makeMsg("opt-1", "conv-a", "user", ["text"]), position: 9999 };
  optimistic.blocks![0].content = "你好";
  useChatStore.setState({ messages: [optimistic] });

  const applied = applyDbMessages("conv-a", [persisted, makeMsg("m2", "conv-a", "assistant")]);

  assert.equal(applied, true);
  // The temp is superseded by the persisted user message — no duplicate bubble.
  assert.deepEqual(useChatStore.getState().messages.map((m) => m.id), ["user-1", "m2"]);
});

test("optimistic attachment-only user message is preserved when not persisted", () => {
  const optimistic = { ...makeMsg("opt-1", "conv-a", "user", ["image"]), position: 9999 };
  useChatStore.setState({ messages: [optimistic] });

  const applied = applyDbMessages("conv-a", [makeMsg("m1", "conv-a", "assistant")]);

  assert.equal(applied, true);
  assert.deepEqual(useChatStore.getState().messages.map((m) => m.id), ["m1", "opt-1"]);
});
