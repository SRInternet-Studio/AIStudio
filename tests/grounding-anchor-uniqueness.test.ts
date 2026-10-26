/**
 * Focused test: per-message footnote namespacing for grounding citations.
 *
 * remark-gfm derives footnote DOM ids from the label, and a message's footnote
 * numbers are local ordinals — so unscoped labels make every message emit the
 * same ids and `document.getElementById` resolve to the wrong turn. Labels are
 * namespaced with the message id, yielding `user-content-fn-<messageId>-<n>`.
 *
 * Historical citations need no migration: metadata is stored raw and labels are
 * generated at render time.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  insertGroundingFootnotes,
  footnoteNamespace,
  footnoteLabel,
  type GroundingMetadata,
} from "@/lib/grounding";

const meta = (chunks: any[], supports: any[]): GroundingMetadata => ({
  groundingChunks: chunks,
  groundingSupports: supports,
});

const twoSourceMeta = (prefix: string): GroundingMetadata =>
  meta(
    [
      { web: { uri: `https://${prefix}-a.example`, title: `${prefix} A` } },
      { web: { uri: `https://${prefix}-b.example`, title: `${prefix} B` } },
    ],
    [
      { segment: { startIndex: 0, endIndex: 4 }, groundingChunkIndices: [0] },
      { segment: { startIndex: 5, endIndex: 9 }, groundingChunkIndices: [1] },
    ]
  );

const TEXT = "AAAA BBBB.";

function render(md: string): string {
  return renderToStaticMarkup(
    React.createElement(ReactMarkdown as any, { remarkPlugins: [remarkGfm] }, md)
  );
}

const idsOf = (html: string) =>
  [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]).filter((i) => i.includes("user-content-fn"));
const hrefsOf = (html: string) =>
  [...html.matchAll(/href="(#[^"]+)"/g)].map((m) => m[1]).filter((h) => h.includes("user-content-fn"));

// ============ footnoteNamespace / footnoteLabel ============

test("footnoteNamespace keeps a UUID-shaped message id verbatim", () => {
  const id = "d397cd95-288f-43a1-b506-c9fb111ab944";
  assert.equal(footnoteNamespace(id), id);
  assert.equal(footnoteLabel(id, 1), `${id}-1`);
});

test("footnoteNamespace strips characters that would break a GFM label", () => {
  // Whitespace and brackets cannot appear in a footnote label.
  assert.equal(footnoteNamespace("msg 1"), "msg1");
  assert.equal(footnoteNamespace("msg[1]"), "msg1");
  assert.equal(footnoteNamespace("temp-abc"), "temp-abc");
});

test("footnoteNamespace falls back to a stable token for empty/invalid ids", () => {
  assert.equal(footnoteNamespace(""), "m");
  assert.equal(footnoteNamespace(null), "m");
  assert.equal(footnoteNamespace("   "), "m");
  assert.equal(footnoteNamespace("[[]]"), "m");
});

// ============ insertGroundingFootnotes with a namespace ============

test("without a namespace the labels stay plain integers (backward compatible)", () => {
  const out = insertGroundingFootnotes(TEXT, twoSourceMeta("x"));
  assert.ok(out.startsWith("AAAA[^1] BBBB[^2]."), `got: ${out.split("\n")[0]}`);
  assert.ok(out.includes("[^1]: [x A](https://x-a.example)"));
  assert.ok(out.includes("[^2]: [x B](https://x-b.example)"));
});

test("with a namespace both markers AND definitions carry it", () => {
  const out = insertGroundingFootnotes(TEXT, twoSourceMeta("x"), "msg-1");
  assert.ok(out.startsWith("AAAA[^msg-1-1] BBBB[^msg-1-2]."), `got: ${out.split("\n")[0]}`);
  assert.ok(out.includes("[^msg-1-1]: [x A](https://x-a.example)"));
  assert.ok(out.includes("[^msg-1-2]: [x B](https://x-b.example)"));
});

test("the same source cited twice keeps one namespaced number", () => {
  const out = insertGroundingFootnotes(
    TEXT,
    meta([{ web: { uri: "https://a.example", title: "A" } }], [
      { segment: { startIndex: 0, endIndex: 4 }, groundingChunkIndices: [0] },
      { segment: { startIndex: 5, endIndex: 9 }, groundingChunkIndices: [0] },
    ]),
    "msg-1"
  );
  assert.ok(out.startsWith("AAAA[^msg-1-1] BBBB[^msg-1-1]."));
  assert.equal(out.match(/\[\^msg-1-1\]:/g)?.length, 1, "only one definition per source");
});

// ============ Anchor uniqueness across messages ============

test("two messages citing the same source produce DIFFERENT anchor ids", () => {
  // Both messages cite their own first source — footnote #1 in each.
  const htmlA = render(insertGroundingFootnotes(TEXT, twoSourceMeta("a"), "msg-aaaa"));
  const htmlB = render(insertGroundingFootnotes(TEXT, twoSourceMeta("b"), "msg-bbbb"));

  const idsA = idsOf(htmlA);
  const idsB = idsOf(htmlB);

  assert.ok(idsA.every((i) => i.includes("msg-aaaa")), `A ids: ${JSON.stringify(idsA)}`);
  assert.ok(idsB.every((i) => i.includes("msg-bbbb")), `B ids: ${JSON.stringify(idsB)}`);
  // No id is shared between the two messages.
  const overlap = idsA.filter((i) => idsB.includes(i));
  assert.deepEqual(overlap, [], `duplicate ids across messages: ${JSON.stringify(overlap)}`);
});

test("every footnote href resolves to its OWN message's target (no cross-turn jumps)", () => {
  const htmlA = render(insertGroundingFootnotes(TEXT, twoSourceMeta("a"), "msg-aaaa"));
  const hrefs = hrefsOf(htmlA).filter((h) => h.startsWith("#user-content-fn-"));
  assert.ok(hrefs.length > 0, "the rendered markdown must contain footnote references");
  for (const href of hrefs) {
    const targetId = href.slice(1);
    assert.ok(targetId.includes("msg-aaaa"), `${href} points outside its own message`);
    // The href must resolve to an element that exists in the SAME message.
    assert.ok(
      htmlA.includes(`id="${targetId}"`),
      `${href} has no matching element in this message`
    );
  }
});

test("a whole conversation of grounded messages yields zero duplicate anchors", () => {
  // 5 turns, each citing two sources.
  let allIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const html = render(insertGroundingFootnotes(TEXT, twoSourceMeta(`t${i}`), `msg-${i}`));
    allIds = allIds.concat(idsOf(html));
  }
  const dupes = allIds.filter((v, idx) => allIds.indexOf(v) !== idx);
  assert.deepEqual(dupes, [], `duplicate anchor ids: ${JSON.stringify(dupes)}`);
});

test("backrefs (↩) also stay inside their own message", () => {
  const html = render(insertGroundingFootnotes(TEXT, twoSourceMeta("a"), "msg-aaaa"));
  // The ↩ link points at the fnref element, which must also be namespaced.
  assert.ok(html.includes('href="#user-content-fnref-msg-aaaa-1"'));
  assert.ok(html.includes('id="user-content-fnref-msg-aaaa-1"'));
});

test("a namespaced citation still renders its source link as a real URL", () => {
  const html = render(insertGroundingFootnotes(TEXT, twoSourceMeta("a"), "msg-aaaa"));
  // The source list must keep the real (non-anchor) href. `target="_blank"` is
  // added by the app's own <a> override, which this raw render does not apply.
  assert.ok(html.includes('href="https://a-a.example"'));
  assert.ok(html.includes('href="https://a-b.example"'));
});

test("stale/empty metadata still returns the text unchanged with a namespace", () => {
  assert.equal(insertGroundingFootnotes("hello", undefined, "msg-1"), "hello");
  assert.equal(insertGroundingFootnotes("hello", null, "msg-1"), "hello");
  assert.equal(insertGroundingFootnotes("hello", {}, "msg-1"), "hello");
  const outOfRange = insertGroundingFootnotes(
    TEXT,
    meta([{ web: { uri: "https://x.example" } }], [{ segment: { startIndex: 0, endIndex: 999 }, groundingChunkIndices: [0] }]),
    "msg-1"
  );
  assert.equal(outOfRange, TEXT);
});

test("a message id with odd characters still yields a renderable citation", () => {
  // Optimistic/streaming messages use synthetic ids — sanitizing must not
  // break the footnote (a malformed label would drop the citation entirely).
  const html = render(insertGroundingFootnotes(TEXT, twoSourceMeta("a"), "temp-[weird] id"));
  assert.ok(html.includes("https://a-a.example"), "citation survived the sanitized namespace");
  assert.ok(idsOf(html).length > 0, "anchors were still generated");
});
