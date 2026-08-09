/**
 * Markdown → plain text for speech synthesis (Edge-TTS).
 *
 * Strips markdown SYNTAX (headings, emphasis markers, links, code fences,
 * list markers, footnote references/definitions, table pipes…) while keeping
 * the actual prose and all ordinary punctuation (，。！？,.!? etc.), so the
 * TTS voice reads natural sentences instead of "asterisk asterisk bold
 * asterisk asterisk". URLs and footnote definitions are dropped entirely —
 * reading them aloud is never useful.
 */

export function markdownToPlainText(md: string): string {
  if (!md) return "";
  let text = md;

  // Footnote definitions ([^1]: [title](url)) — whole lines, mostly URLs
  text = text.replace(/^\[\^[^\]]+\]:.*$/gm, "");
  // Footnote references [^1]
  text = text.replace(/\[\^[^\]]+\]/g, "");
  // Images ![alt](url) → keep alt text
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Links [text](url) → keep link text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Autolinks <https://...>
  text = text.replace(/<https?:\/\/[^>]+>/g, " ");
  // Fenced code block markers (content handled by caller's code-block policy;
  // any remaining fences here are just stripped)
  text = text.replace(/^\s*```.*$/gm, "");
  // Inline code backticks — keep the content
  text = text.replace(/`([^`]*)`/g, "$1");
  // Heading markers
  text = text.replace(/^(\s*)#{1,6}\s+/gm, "$1");
  // Blockquote markers
  text = text.replace(/^(\s*)>\s?/gm, "$1");
  // Horizontal rules
  text = text.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "");
  // Table separator rows (| --- | :--: |)
  text = text.replace(/^\s*\|?[\s:|-]*\|[\s:|-]*$/gm, "");
  // Table rows: drop the outer pipes, then inner pipes → comma-ish pause
  // reads more naturally than silence
  text = text.replace(/^\s*\|(.*)\|\s*$/gm, "$1");
  text = text.replace(/\|/g, "，");
  // Unordered list markers at line start
  text = text.replace(/^(\s*)[-*+]\s+/gm, "$1");
  // Ordered list markers at line start
  text = text.replace(/^(\s*)\d+[.)]\s+/gm, "$1");
  // Emphasis pairs: **bold**, __bold__, *em*, _em_, ~~strike~~
  text = text.replace(/(\*\*|__)([\s\S]*?)\1/g, "$2");
  text = text.replace(/(\*|_)([^*_\n]+)\1/g, "$2");
  text = text.replace(/~~([\s\S]*?)~~/g, "$1");
  // Stray marker characters in emphasis positions (before/after word
  // boundaries) — e.g. leftovers from nested/broken markup. Multiplication
  // like "2*3" and mid-word underscores stay untouched.
  text = text.replace(/(^|\s)[*_]+/gm, "$1");
  text = text.replace(/[*_]+(\s|$)/gm, "$1");
  // Collapse blank-line runs into one newline
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}
