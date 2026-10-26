/**
 * Focused test: auto-read firing decision (shouldAutoReadReply).
 *
 * The regression this guards against: TTS auto-read repeatedly speaking the
 * PREVIOUS turn's assistant message instead of the freshly generated reply.
 *
 * Why it happens: when a stream ends `isAnyStreaming` flips false BEFORE the
 * final DB reload inserts the new assistant message into `messages`. The last
 * assistant visible at that instant is still the earlier turn — especially in a
 * CONTINUED conversation that already has an assistant transcript. If that
 * stale snapshot is not distinguished from the fresh reply, it gets spoken
 * (and the freshly loaded reply then gets double-read).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldAutoReadReply } from "@/lib/context-manager";

test("never fires while nothing is pending or something is still streaming", () => {
  // Not armed at all
  let d = shouldAutoReadReply({
    pendingAutoRead: false,
    isAnyStreaming: false,
    armedLastAssistantId: "a1",
    lastAutoReadId: null,
    currentLastAssistantId: "a2",
    hasReadableText: true,
  });
  assert.equal(d.fire, false);

  // Armed but the response is still streaming
  d = shouldAutoReadReply({
    pendingAutoRead: true,
    isAnyStreaming: true,
    armedLastAssistantId: "a1",
    lastAutoReadId: null,
    currentLastAssistantId: "a1",
    hasReadableText: true,
  });
  assert.equal(d.fire, false);
});

test("continued conversation: the PREVIOUS turn (stale snapshot) is NOT spoken", () => {
  // Stream just ended and `messages` still hold the OLD transcript. The last
  // assistant visible at arm time ('a1', the previous reply) must not be read.
  const d = shouldAutoReadReply({
    pendingAutoRead: true,
    isAnyStreaming: false,
    armedLastAssistantId: "a1", // id snapped when the reply completed
    lastAutoReadId: null,
    currentLastAssistantId: "a1", // still the previous turn — reload not landed
    hasReadableText: true,
  });

  assert.equal(d.fire, false);
  assert.equal(d.settledId, null); // stays armed for the fresh reply
});

test("continued conversation: the fresh reply (different id) fires exactly once", () => {
  // Reload landed: a NEW assistant id 'a2' now appears. This is the reply that
  // was just generated — it must fire, and mark itself as the settled id.
  const d = shouldAutoReadReply({
    pendingAutoRead: true,
    isAnyStreaming: false,
    armedLastAssistantId: "a1",
    lastAutoReadId: null,
    currentLastAssistantId: "a2",
    hasReadableText: true,
  });

  assert.equal(d.fire, true);
  assert.equal(d.settledId, "a2");
});

test("multi-turn stability: each new reply fires, and a repeated id does not re-fire", () => {
  // Turn 1 settles: a2 is new and fires.
  const t1 = shouldAutoReadReply({
    pendingAutoRead: true,
    isAnyStreaming: false,
    armedLastAssistantId: "a1",
    lastAutoReadId: null,
    currentLastAssistantId: "a2",
    hasReadableText: true,
  });
  assert.equal(t1.fire, true);

  // After t1, next arm snapshot is 'a2'. Turn 2 reload surfaces 'a3' — fires.
  const t2 = shouldAutoReadReply({
    pendingAutoRead: true,
    isAnyStreaming: false,
    armedLastAssistantId: "a2",
    lastAutoReadId: "a2", // a2 was already spoken
    currentLastAssistantId: "a3",
    hasReadableText: true,
  });
  assert.equal(t2.fire, true);
  assert.equal(t2.settledId, "a3");

  // An effect re-run with the SAME already-read id must NOT fire again.
  const t2repeat = shouldAutoReadReply({
    pendingAutoRead: true,
    isAnyStreaming: false,
    armedLastAssistantId: "a2",
    lastAutoReadId: "a3", // already spoken
    currentLastAssistantId: "a3",
    hasReadableText: true,
  });
  assert.equal(t2repeat.fire, false);
});

test("brand-new conversation: no prior assistant means the first reply fires", () => {
  // armed snapshot is null (no previous assistant) and the fresh reply arrives.
  const d = shouldAutoReadReply({
    pendingAutoRead: true,
    isAnyStreaming: false,
    armedLastAssistantId: null,
    lastAutoReadId: null,
    currentLastAssistantId: "a1",
    hasReadableText: true,
  });
  assert.equal(d.fire, true);
  assert.equal(d.settledId, "a1");
});

test("an error bubble (no readable text) is never spoken", () => {
  const d = shouldAutoReadReply({
    pendingAutoRead: true,
    isAnyStreaming: false,
    armedLastAssistantId: "a1",
    lastAutoReadId: null,
    currentLastAssistantId: "err-1", // error bubble, role assistant, no text
    hasReadableText: false,
  });
  assert.equal(d.fire, false);
});
