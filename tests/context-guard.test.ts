/**
 * Focused tests for the v1.8.6 context-lifecycle guards.
 *
 * The store now carries two flags that gate every path which reads or writes the
 * transcript:
 *   - isContextLoading  — the active conversation's messages are being fetched.
 *   - isContextMutating — a long DB operation (message/block delete, branch) is
 *                         in flight and the transcript is about to be replaced.
 *
 * These tests pin the invariants the UI relies on: the flags start false, only
 * their setters flip them, and they are independent of each other so a load can
 * never be cleared by a mutation completing (or vice versa).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { useChatStore } from "@/store/chatStore";

const getState = () => useChatStore.getState();

test("context lifecycle flags default to false", () => {
  assert.equal(getState().isContextLoading, false);
  assert.equal(getState().isContextMutating, false);
});

test("setters toggle the flags independently", () => {
  getState().setIsContextLoading(true);
  assert.equal(getState().isContextLoading, true);
  assert.equal(getState().isContextMutating, false, "a load must not imply a mutation");

  getState().setIsContextMutating(true);
  assert.equal(getState().isContextLoading, true, "a mutation must not clear the load flag");
  assert.equal(getState().isContextMutating, true);

  getState().setIsContextLoading(false);
  assert.equal(getState().isContextLoading, false);
  assert.equal(getState().isContextMutating, true, "finishing a load must not clear a mutation");

  getState().setIsContextMutating(false);
  assert.equal(getState().isContextMutating, false);
});

test("the flags are plain state, reset to false without side effects", () => {
  getState().setIsContextLoading(true);
  getState().setIsContextMutating(true);
  getState().setIsContextLoading(false);
  getState().setIsContextMutating(false);
  assert.equal(getState().isContextLoading, false);
  assert.equal(getState().isContextMutating, false);
});
