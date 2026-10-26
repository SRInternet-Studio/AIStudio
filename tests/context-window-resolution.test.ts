/**
 * Focused tests for resolveModelContextWindow — the context-window resolution
 * order used when building a chat request:
 *   1. custom_models override (user's manual, persisted value)
 *   2. FALLBACK_MODELS curated entry
 *   3. Google default (800K) for gemini-/gemma- ids
 *   4. 128K last-resort default
 *
 * Relays never report context_window, so without steps 1-2 a 1M-token Gemini
 * model would be silently capped at 128K.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveModelContextWindow,
  FALLBACK_MODELS,
  GOOGLE_DEFAULT_CONTEXT_WINDOW,
} from "@/lib/models";

test("a user override wins over every other source", () => {
  assert.equal(resolveModelContextWindow("gemini-3.7-flash", 1_048_576), 1_048_576);
  assert.equal(resolveModelContextWindow("totally-unknown-model", 999), 999);
});

test("falls back to the curated FALLBACK entry when there is no override", () => {
  const entry = FALLBACK_MODELS.find((m) => m.contextWindow && m.contextWindow > 0);
  assert.ok(entry, "FALLBACK_MODELS should contain at least one explicit context window");
  assert.equal(resolveModelContextWindow(entry!.id), entry!.contextWindow);
});

test("google-style ids not in FALLBACK get the Google default, not 128K", () => {
  assert.equal(resolveModelContextWindow("gemini-nonexistent-xyz"), GOOGLE_DEFAULT_CONTEXT_WINDOW);
  assert.equal(resolveModelContextWindow("gemma-nonexistent-xyz"), GOOGLE_DEFAULT_CONTEXT_WINDOW);
});

test("unknown non-google ids fall back to 128K", () => {
  assert.equal(resolveModelContextWindow("totally-unknown-model-123"), 128_000);
});

test("invalid overrides (0 / negative / NaN) are ignored", () => {
  assert.equal(resolveModelContextWindow("totally-unknown-model-123", 0), 128_000);
  assert.equal(resolveModelContextWindow("totally-unknown-model-123", -5), 128_000);
  assert.equal(resolveModelContextWindow("totally-unknown-model-123", Number.NaN), 128_000);
});
