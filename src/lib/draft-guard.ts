/**
 * Unsaved-draft guard for browser navigation (reload / tab close).
 *
 * The draft check is a pure function so it can be unit-tested without a DOM;
 * the listener itself must stay attached for the whole page session.
 */

export interface DraftState {
  /** Composer text. Whitespace-only counts as empty. */
  input?: string | null;
  /** Attachments / recordings still pending send. */
  attachmentCount?: number | null;
}

/**
 * True when the composer holds something that a reload would destroy.
 *
 * Whitespace-only text is not a draft (a stray newline from pressing Enter in
 * an empty box must not trigger the confirmation), but any attachment counts
 * even when the text box is empty.
 */
export function hasUnsavedDraft(state: DraftState): boolean {
  if ((state.attachmentCount ?? 0) > 0) return true;
  return (state.input ?? "").trim().length > 0;
}

/**
 * Attach the `beforeunload` guard.
 *
 * The listener is always registered and stays registered; `shouldWarn` is read
 * at event time so a draft that is sent or cleared mid-session stops triggering
 * the confirmation without re-subscribing. Returns the cleanup function.
 */
export function attachUnsavedDraftGuard(shouldWarn: () => boolean): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: BeforeUnloadEvent) => {
    if (!shouldWarn()) return;
    // Legacy path for older engines; modern browsers ignore the value but
    // still require preventDefault() on a cancelable event.
    event.preventDefault();
    event.returnValue = "";
  };

  // Capture the target once: the cleanup must not re-read the global, which
  // may already be gone when React unmounts (or the environment is torn down).
  const target = window;
  target.addEventListener("beforeunload", handler);
  return () => target.removeEventListener("beforeunload", handler);
}
