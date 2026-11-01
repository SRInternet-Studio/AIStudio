/**
 * Focused test: unsaved-draft guard for reload / tab close.
 *
 * The composer must trigger the browser's native "Leave site?" confirmation
 * while it holds an unsent draft, and stay silent once the draft is sent,
 * cleared, or never existed. Attachments count as a draft on their own.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hasUnsavedDraft, attachUnsavedDraftGuard } from "@/lib/draft-guard";

test("typed text is a draft", () => {
  assert.equal(hasUnsavedDraft({ input: "hello" }), true);
});

test("an empty composer is not a draft", () => {
  assert.equal(hasUnsavedDraft({ input: "" }), false);
  assert.equal(hasUnsavedDraft({}), false);
  assert.equal(hasUnsavedDraft({ input: null }), false);
});

test("whitespace-only text is not a draft", () => {
  // A stray newline left by pressing Enter in an empty box must not nag.
  assert.equal(hasUnsavedDraft({ input: "   \n\t " }), false);
  assert.equal(hasUnsavedDraft({ input: "\n" }), false);
});

test("an attachment alone is a draft even with an empty box", () => {
  assert.equal(hasUnsavedDraft({ input: "", attachmentCount: 1 }), true);
  assert.equal(hasUnsavedDraft({ attachmentCount: 3 }), true);
});

test("text and attachments together are a draft", () => {
  assert.equal(hasUnsavedDraft({ input: "look at this", attachmentCount: 2 }), true);
});

test("after sending, the composer is clean", () => {
  // handleSend clears both the text and the attachment list.
  assert.equal(hasUnsavedDraft({ input: "", attachmentCount: 0 }), false);
});

test("text with surrounding whitespace still counts when it has content", () => {
  assert.equal(hasUnsavedDraft({ input: "  draft  " }), true);
});

test("zero attachments with text is still a draft", () => {
  assert.equal(hasUnsavedDraft({ input: "draft", attachmentCount: 0 }), true);
});

// ============ attachUnsavedDraftGuard ============

// Minimal window stub: only what the guard touches.
function stubWindow() {
  const listeners = new Map<string, Set<(e: any) => void>>();
  return {
    addEventListener(type: string, fn: (e: any) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: (e: any) => void) {
      listeners.get(type)?.delete(fn);
    },
    fire(type: string) {
      const e: { defaultPrevented: boolean; returnValue: unknown; preventDefault: () => void } = {
        defaultPrevented: false,
        returnValue: undefined,
        preventDefault() {
          this.defaultPrevented = true;
        },
      };
      for (const fn of listeners.get(type) ?? []) fn(e);
      return e;
    },
    count(type: string) {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

function withWindow<T>(win: unknown, fn: () => T): T {
  const prev = (globalThis as any).window;
  (globalThis as any).window = win;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = prev;
  }
}

test("guard cancels the event while a draft exists", () => {
  const win = stubWindow();
  withWindow(win, () => {
    attachUnsavedDraftGuard(() => true);
    const e = win.fire("beforeunload");
    assert.equal(e.defaultPrevented, true, "preventDefault() is what makes the browser confirm");
    assert.equal(e.returnValue, "", "legacy returnValue is still set for older engines");
  });
});

test("guard stays silent when there is no draft", () => {
  const win = stubWindow();
  withWindow(win, () => {
    attachUnsavedDraftGuard(() => false);
    const e = win.fire("beforeunload");
    assert.equal(e.defaultPrevented, false);
    assert.equal(e.returnValue, undefined);
  });
});

test("the draft check is evaluated at event time, not at subscribe time", () => {
  // Typing, then sending: the SAME subscription must stop warning once the
  // composer is cleared, without re-subscribing.
  const win = stubWindow();
  let draft = false;
  withWindow(win, () => {
    attachUnsavedDraftGuard(() => draft);
    assert.equal(win.fire("beforeunload").defaultPrevented, false);
    draft = true;
    assert.equal(win.fire("beforeunload").defaultPrevented, true);
    draft = false; // handleSend cleared the composer
    assert.equal(win.fire("beforeunload").defaultPrevented, false);
  });
});

test("cleanup removes the listener so an unmounted composer never warns", () => {
  const win = stubWindow();
  const detach = withWindow(win, () => attachUnsavedDraftGuard(() => true));
  assert.equal(win.count("beforeunload"), 1);
  detach();
  assert.equal(win.count("beforeunload"), 0);
});

test("re-subscribing does not stack duplicate listeners", () => {
  // The effect re-runs on every keystroke; without cleanup this would leak.
  const win = stubWindow();
  withWindow(win, () => {
    for (let i = 0; i < 5; i++) attachUnsavedDraftGuard(() => true)();
    assert.equal(win.count("beforeunload"), 0, "each subscription is immediately cleaned up");
    const detach = attachUnsavedDraftGuard(() => true);
    assert.equal(win.count("beforeunload"), 1);
    detach();
  });
});

test("without a window (SSR) the guard is a no-op and does not throw", () => {
  const detach = withWindow(undefined, () => attachUnsavedDraftGuard(() => true));
  assert.equal(typeof detach, "function");
  detach(); // must not throw
});
