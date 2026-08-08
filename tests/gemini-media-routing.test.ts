import { test } from "node:test";
import assert from "node:assert/strict";
import { routeGeminiMedia, geminiMediaResolutionField } from "@/lib/api-client";

// ============ routeGeminiMedia ============
// Media must be recognized as media by Gemini (file_data / typed inline_data)
// to be billed by tiles/seconds/pages instead of as base64 text.

test("text files always stay inline", () => {
  assert.equal(routeGeminiMedia("text/plain", 100), "inline");
  assert.equal(routeGeminiMedia("text/plain", 50 * 1024 * 1024), "inline");
});

test("images go through the Files API at ANY size (no base64 inline)", () => {
  // Even a tiny image: base64 inline risks text-token billing on relays
  // (~400k tokens for one 150KB photo vs ~1.5k billed as media).
  assert.equal(routeGeminiMedia("image/png", 1024), "files");
  assert.equal(routeGeminiMedia("image/jpeg", 150 * 1024), "files");
  assert.equal(routeGeminiMedia("image/png", 10 * 1024 * 1024), "files");
});

test("video / audio / PDF always go through the Files API", () => {
  assert.equal(routeGeminiMedia("video/mp4", 100), "files");
  assert.equal(routeGeminiMedia("audio/mpeg", 100), "files");
  assert.equal(routeGeminiMedia("application/pdf", 100), "files");
});

// ============ geminiMediaResolutionField ============
// Per-content-item media_resolution is Gemini 3+ only and uses the
// MEDIA_RESOLUTION_* REST enum.

test("returns the REST enum for valid levels on Gemini 3+", () => {
  assert.equal(geminiMediaResolutionField("low", "gemini-3-pro-preview"), "MEDIA_RESOLUTION_LOW");
  assert.equal(geminiMediaResolutionField("medium", "gemini-3-flash"), "MEDIA_RESOLUTION_MEDIUM");
  assert.equal(geminiMediaResolutionField("high", "gemini-3-pro-preview"), "MEDIA_RESOLUTION_HIGH");
  assert.equal(geminiMediaResolutionField("ultra_high", "gemini-3-pro-preview"), "MEDIA_RESOLUTION_ULTRA_HIGH");
});

test("returns null for unspecified / missing / invalid levels", () => {
  assert.equal(geminiMediaResolutionField(undefined, "gemini-3-pro-preview"), null);
  assert.equal(geminiMediaResolutionField("unspecified", "gemini-3-pro-preview"), null);
  assert.equal(geminiMediaResolutionField("bogus", "gemini-3-pro-preview"), null);
});

test("returns null on pre-Gemini-3 models (field would 400)", () => {
  assert.equal(geminiMediaResolutionField("high", "gemini-2.5-pro"), null);
  assert.equal(geminiMediaResolutionField("low", "gemini-2.0-flash"), null);
  assert.equal(geminiMediaResolutionField("high", "some-other-model"), null);
});
