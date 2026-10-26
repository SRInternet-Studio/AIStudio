/**
 * Focused test: opt-in media compression for the outgoing chat payload.
 *
 * Guarantees the data-isolation constraint: compression (when enabled) only
 * rewrites the wire copy sent to the model; the untouched original always
 * rides along in `original_data_url` so /api/chat persists pristine bytes.
 * With the toggle OFF (default), attachments pass through byte-identical.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildWireAttachments,
  IMAGE_COMPRESS_THRESHOLD,
  IMAGE_MAX_WIDTH,
} from "@/lib/media-compress";

const ORIGINAL_URL = "data:image/png;base64,ORIGINALORIGINAL";
const COMPRESSED_URL = "data:image/jpeg;base64,COMPRESSED";

function file(overrides: Partial<{ name: string; type: string; dataUrl: string; size: number }> = {}) {
  return {
    name: "photo.png",
    type: "image/png",
    dataUrl: ORIGINAL_URL,
    size: IMAGE_COMPRESS_THRESHOLD + 1, // just above the 2MB threshold
    ...overrides,
  };
}

/** Stub compressor: always succeeds with a smaller JPEG copy. */
const okCompressor = async () => ({ dataUrl: COMPRESSED_URL, type: "image/jpeg", size: 500_000 });
/** Stub compressor that cannot improve on the original. */
const nullCompressor = async () => null;

test("compression OFF (default): payload is the untouched original, no original_data_url", async () => {
  const wire = await buildWireAttachments([file()], false, okCompressor);
  assert.equal(wire.length, 1);
  assert.deepEqual(wire[0], {
    data_url: ORIGINAL_URL,
    mime_type: "image/png",
    name: "photo.png",
  });
  assert.equal(wire[0].original_data_url, undefined);
});

test("compression ON: large image gets a compressed wire copy and keeps the original for the DB", async () => {
  const wire = await buildWireAttachments([file()], true, okCompressor);
  assert.equal(wire[0].data_url, COMPRESSED_URL); // model receives the small copy
  assert.equal(wire[0].mime_type, "image/jpeg");
  assert.equal(wire[0].original_data_url, ORIGINAL_URL); // server persists this one
});

test("compression ON: images at/below the 2MB threshold are never touched", async () => {
  let calls = 0;
  const spy = async () => { calls++; return okCompressor(); };
  const wire = await buildWireAttachments(
    [file({ size: IMAGE_COMPRESS_THRESHOLD })],
    true,
    spy
  );
  assert.equal(calls, 0);
  assert.equal(wire[0].data_url, ORIGINAL_URL);
  assert.equal(wire[0].original_data_url, undefined);
});

test("compression ON: non-image attachments (video/audio/pdf/text) are never touched", async () => {
  let calls = 0;
  const spy = async () => { calls++; return okCompressor(); };
  const wire = await buildWireAttachments(
    [
      file({ name: "clip.mp4", type: "video/mp4", size: 40 * 1024 * 1024 }),
      file({ name: "doc.pdf", type: "application/pdf", size: 5 * 1024 * 1024 }),
    ],
    true,
    spy
  );
  assert.equal(calls, 0);
  assert.equal(wire[0].data_url, ORIGINAL_URL);
  assert.equal(wire[1].mime_type, "application/pdf");
});

test("compression ON but the compressor cannot shrink the image: fall back to the original", async () => {
  const wire = await buildWireAttachments([file()], true, nullCompressor);
  assert.equal(wire[0].data_url, ORIGINAL_URL);
  assert.equal(wire[0].original_data_url, undefined);
});

test("threshold/width constants match the documented behavior (2MB, 1920px)", () => {
  assert.equal(IMAGE_COMPRESS_THRESHOLD, 2 * 1024 * 1024);
  assert.equal(IMAGE_MAX_WIDTH, 1920);
});
