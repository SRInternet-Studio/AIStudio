/**
 * Grounding-with-Google-Search helpers.
 *
 * Gemini's generateContent response carries citation data in
 * `candidates[0].groundingMetadata`:
 *   - groundingChunks[]:  the cited sources ({ web: { uri, title } })
 *   - groundingSupports[]: which text spans cite which chunks
 *     ({ segment: { startIndex, endIndex, text }, groundingChunkIndices[] })
 *
 * `insertGroundingFootnotes` converts that metadata into GFM footnotes
 * (`[^n]` markers at each cited span + `[^n]: [title](uri)` definitions at
 * the end), which remark-gfm renders as clickable footnote references and a
 * source list. The stored text block is never modified — insertion happens
 * at render time only.
 */

export interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

export interface GroundingSupport {
  segment?: { startIndex?: number; endIndex?: number; text?: string };
  groundingChunkIndices?: number[];
  confidenceScores?: number[];
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
  webSearchQueries?: string[];
  searchEntryPoint?: unknown;
  [key: string]: unknown;
}

/** Whether the metadata actually contains usable citation info. */
export function hasGrounding(m: GroundingMetadata | null | undefined): boolean {
  return !!(m && ((m.groundingSupports?.length ?? 0) > 0 || (m.groundingChunks?.length ?? 0) > 0));
}

// Characters that would break the generated markdown link syntax.
function escapeLinkText(s: string): string {
  return s.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}
function escapeLinkUrl(s: string): string {
  return s.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

function utf8ByteLengthOfCodePoint(cp: string): number {
  const code = cp.codePointAt(0)!;
  if (code <= 0x7f) return 1;
  if (code <= 0x7ff) return 2;
  if (code <= 0xffff) return 3;
  return 4;
}

/**
 * Convert a UTF-8 BYTE offset (what Gemini actually returns in
 * groundingSupports segments — verified against live responses: CJK spans
 * where byte offset ≠ char index) into a UTF-16 code-unit index usable with
 * String.slice. Returns -1 when the offset does not land on a codepoint
 * boundary or lies past the text.
 */
export function utf16IndexFromByteOffset(text: string, byteOffset: number): number {
  if (byteOffset < 0) return -1;
  let bytePos = 0;
  let utf16Pos = 0;
  for (const cp of text) {
    if (bytePos === byteOffset) return utf16Pos;
    bytePos += utf8ByteLengthOfCodePoint(cp);
    utf16Pos += cp.length; // 1 unit, or 2 for astral codepoints
  }
  return bytePos === byteOffset ? utf16Pos : -1;
}

/**
 * Insert GFM footnote markers for every grounded span and append the footnote
 * definitions. Pure function (exported for unit tests).
 *
 * Robustness rules (citation data must NEVER break the answer text):
 *  - segment indices arrive as UTF-8 BYTE offsets (verified against live
 *    Gemini responses) and are converted to UTF-16 indices; a raw-index
 *    fallback covers endpoints that use character offsets;
 *  - when the segment carries its own `text`, it must match the resolved
 *    span — otherwise the indices are stale (message edited) and the support
 *    is skipped;
 *  - one footnote number per unique chunk (deduplicated by chunk index);
 *  - numbers are assigned in order of appearance in the text.
 *
 * Returns `text` unchanged when there is nothing to cite.
 */
export function insertGroundingFootnotes(text: string, metadata: GroundingMetadata | null | undefined): string {
  if (!text || !metadata) return text;
  const chunks = metadata.groundingChunks || [];

  // Resolve each support's segment into UTF-16 indices. Gemini returns UTF-8
  // BYTE offsets (verified live); try that interpretation first, then fall
  // back to raw UTF-16 indices (older/other endpoints). When segment.text is
  // present it acts as the arbiter: the candidate whose slice matches wins;
  // without it the byte-offset interpretation is used when in range.
  const resolved = (metadata.groundingSupports || [])
    .map((s) => {
      const seg = s.segment;
      if (!seg || typeof seg.endIndex !== "number" || seg.endIndex <= 0) return null;
      if (!(s.groundingChunkIndices || []).some((i) => chunks[i]?.web?.uri)) return null;
      const start = typeof seg.startIndex === "number" ? seg.startIndex : 0;
      if (start < 0 || start > seg.endIndex) return null;
      const candidates: [number, number][] = [];
      const bStart = utf16IndexFromByteOffset(text, start);
      const bEnd = utf16IndexFromByteOffset(text, seg.endIndex);
      if (bStart >= 0 && bEnd > bStart) candidates.push([bStart, bEnd]);
      if (seg.endIndex <= text.length && start <= text.length) candidates.push([start, seg.endIndex]);
      for (const [cs, ce] of candidates) {
        if (!seg.text || text.slice(cs, ce) === seg.text) {
          return { support: s, start: cs, end: ce };
        }
      }
      return null; // stale indices (message edited) — never corrupt the text
    })
    .filter((x): x is { support: GroundingSupport; start: number; end: number } => x !== null);
  if (resolved.length === 0) return text;

  // One footnote number per cited chunk, assigned by first appearance
  const numberByChunkIdx = new Map<number, number>();
  const definitions: string[] = [];
  const chunkNumber = (chunkIdx: number): number => {
    const cached = numberByChunkIdx.get(chunkIdx);
    if (cached) return cached;
    const web = chunks[chunkIdx].web!;
    const n = definitions.length + 1;
    numberByChunkIdx.set(chunkIdx, n);
    const title = escapeLinkText((web.title || web.uri!).trim() || web.uri!);
    definitions.push(`[^${n}]: [${title}](${escapeLinkUrl(web.uri!)})`);
    return n;
  };

  // Insert markers left-to-right while tracking the growing offset
  const sorted = [...resolved].sort((a, b) => a.end - b.end);
  let result = text;
  let offset = 0;
  for (const { support, end } of sorted) {
    const seen = new Set<number>();
    const markers: string[] = [];
    for (const i of support.groundingChunkIndices || []) {
      if (!chunks[i]?.web?.uri || seen.has(i)) continue;
      seen.add(i);
      markers.push(`[^${chunkNumber(i)}]`);
    }
    if (markers.length === 0) continue;
    const marker = markers.join("");
    const pos = end + offset;
    result = result.slice(0, pos) + marker + result.slice(pos);
    offset += marker.length;
  }

  return `${result}\n\n${definitions.join("\n")}`;
}
