import { test } from "node:test";
import assert from "node:assert/strict";
import { insertGroundingFootnotes, hasGrounding, utf16IndexFromByteOffset, type GroundingMetadata } from "@/lib/grounding";

// ============ insertGroundingFootnotes ============
// Converts Gemini groundingMetadata (groundingChunks + groundingSupports) into
// GFM footnotes at render time. Citation data must NEVER corrupt the answer.

const meta = (chunks: any[], supports: any[]): GroundingMetadata => ({
  groundingChunks: chunks,
  groundingSupports: supports,
});

test("basic: one cited span gets a footnote marker and a definition", () => {
  const text = "Spain won Euro 2024. Great match.";
  const out = insertGroundingFootnotes(
    text,
    meta(
      [{ web: { uri: "https://uefa.com/euro", title: "uefa.com" } }],
      [{ segment: { startIndex: 0, endIndex: 20, text: "Spain won Euro 2024." }, groundingChunkIndices: [0] }]
    )
  );
  assert.ok(out.startsWith("Spain won Euro 2024.[^1] Great match."), "marker inserted right after the cited span");
  assert.ok(out.includes("[^1]: [uefa.com](https://uefa.com/euro)"), "definition lists the source title as link text");
});

test("two spans citing different sources get sequential numbers in order of appearance", () => {
  const text = "AAAA BBBB.";
  const out = insertGroundingFootnotes(
    text,
    meta(
      [
        { web: { uri: "https://a.example", title: "A" } },
        { web: { uri: "https://b.example", title: "B" } },
      ],
      [
        // Deliberately out of order — insertion must still be left-to-right
        { segment: { startIndex: 5, endIndex: 9 }, groundingChunkIndices: [1] },
        { segment: { startIndex: 0, endIndex: 4 }, groundingChunkIndices: [0] },
      ]
    )
  );
  assert.ok(out.startsWith("AAAA[^1] BBBB[^2]."), `got: ${out.split("\n")[0]}`);
});

test("the same source cited twice keeps one footnote number", () => {
  const text = "AAAA BBBB.";
  const out = insertGroundingFootnotes(
    text,
    meta(
      [{ web: { uri: "https://a.example", title: "A" } }],
      [
        { segment: { startIndex: 0, endIndex: 4 }, groundingChunkIndices: [0] },
        { segment: { startIndex: 5, endIndex: 9 }, groundingChunkIndices: [0] },
      ]
    )
  );
  assert.ok(out.startsWith("AAAA[^1] BBBB[^1]."));
  assert.equal(out.match(/\[\^1\]:/g)?.length, 1, "only one definition per source");
});

test("supports are skipped when their segment is stale or out of range", () => {
  const text = "Edited answer text.";
  // endIndex beyond text length
  const outOfRange = insertGroundingFootnotes(
    text,
    meta([{ web: { uri: "https://x.example", title: "X" } }], [{ segment: { startIndex: 0, endIndex: 999 }, groundingChunkIndices: [0] }])
  );
  assert.equal(outOfRange, text);
  // segment.text no longer matches the span (message edited after generation)
  const stale = insertGroundingFootnotes(
    text,
    meta(
      [{ web: { uri: "https://x.example", title: "X" } }],
      [{ segment: { startIndex: 0, endIndex: 6, text: "Original" }, groundingChunkIndices: [0] }]
    )
  );
  assert.equal(stale, text);
});

test("supports without a usable web source are skipped", () => {
  const text = "Some answer.";
  const out = insertGroundingFootnotes(
    text,
    meta(
      [{ web: {} }, {}],
      [
        { segment: { startIndex: 0, endIndex: 4 }, groundingChunkIndices: [0] }, // no uri
        { segment: { startIndex: 5, endIndex: 11 }, groundingChunkIndices: [1] }, // no web
      ]
    )
  );
  assert.equal(out, text);
});

test("empty / null metadata returns the text unchanged", () => {
  assert.equal(insertGroundingFootnotes("hello", undefined), "hello");
  assert.equal(insertGroundingFootnotes("hello", null), "hello");
  assert.equal(insertGroundingFootnotes("hello", {}), "hello");
  assert.equal(insertGroundingFootnotes("", meta([{ web: { uri: "https://a.example" } }], [{ segment: { endIndex: 5 }, groundingChunkIndices: [0] }])), "");
});

test("special characters in titles/urls cannot break the markdown link", () => {
  const out = insertGroundingFootnotes(
    "Cited text.",
    meta(
      [{ web: { uri: "https://a.example/path_(detail)", title: "Weird [title]" } }],
      [{ segment: { startIndex: 0, endIndex: 10 }, groundingChunkIndices: [0] }]
    )
  );
  assert.ok(out.includes("[Weird \\[title\\]](https://a.example/path_%28detail%29)"));
});

test("hasGrounding detects usable citation data", () => {
  assert.equal(hasGrounding(undefined), false);
  assert.equal(hasGrounding({}), false);
  assert.equal(hasGrounding({ groundingChunks: [] }), false);
  assert.equal(hasGrounding({ groundingChunks: [{ web: { uri: "https://a.example" } }] }), true);
  assert.equal(hasGrounding({ groundingSupports: [{ segment: { endIndex: 1 } }] }), true);
});

test("utf16IndexFromByteOffset converts UTF-8 byte offsets to JS string indices", () => {
  // CJK codepoints are 3 bytes each in UTF-8 but 1 UTF-16 unit
  assert.equal(utf16IndexFromByteOffset("中文测试", 0), 0);
  assert.equal(utf16IndexFromByteOffset("中文测试", 3), 1);
  assert.equal(utf16IndexFromByteOffset("中文测试", 12), 4);
  // Mixed: "a中b" -> bytes: a=1, 中=3, b=1
  assert.equal(utf16IndexFromByteOffset("a中b", 4), 2);
  // ASCII: byte offset == char index
  assert.equal(utf16IndexFromByteOffset("hello", 3), 3);
  // Non-boundary / out of range
  assert.equal(utf16IndexFromByteOffset("中", 1), -1);
  assert.equal(utf16IndexFromByteOffset("中", 99), -1);
  assert.equal(utf16IndexFromByteOffset("abc", -1), -1);
});

test("CJK text: segment indices are UTF-8 BYTE offsets (live Gemini behavior)", () => {
  // Regression from browser verification: real groundingSupports for a
  // Chinese answer carried endIndex values like 537 for spans ending at
  // char index 211 — pure UTF-16 interpretation skipped every citation.
  const text = "第一条新闻内容。第二条新闻内容。";
  const spanA = "第一条新闻内容。"; // chars 0..8, bytes 0..24
  const spanB = "第二条新闻内容。"; // chars 8..16, bytes 24..48
  const out = insertGroundingFootnotes(
    text,
    meta(
      [
        { web: { uri: "https://a.example", title: "来源A" } },
        { web: { uri: "https://b.example", title: "来源B" } },
      ],
      [
        { segment: { startIndex: 0, endIndex: 24, text: spanA }, groundingChunkIndices: [0] },
        { segment: { startIndex: 24, endIndex: 48, text: spanB }, groundingChunkIndices: [1] },
      ]
    )
  );
  assert.ok(out.startsWith(`${spanA}[^1]${spanB}[^2]`), `got: ${out.split("\n")[0]}`);
  assert.ok(out.includes("[^1]: [来源A](https://a.example)"));
  assert.ok(out.includes("[^2]: [来源B](https://b.example)"));
});

test("byte-offset segments without segment.text still resolve for CJK", () => {
  const text = "中文答案文本。";
  const out = insertGroundingFootnotes(
    text,
    meta(
      [{ web: { uri: "https://a.example", title: "A" } }],
      // chars 0..4 == bytes 0..12, no segment.text to arbitrate
      [{ segment: { startIndex: 0, endIndex: 12 }, groundingChunkIndices: [0] }]
    )
  );
  assert.ok(out.startsWith("中文答案[^1]文本。"), `got: ${out.split("\n")[0]}`);
});
