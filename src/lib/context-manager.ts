import type { ChatMessage } from "@/types";

/**
 * Rough token estimation, CJK-aware.
 *
 * Gemini-family tokenizers encode CJK text far denser than Latin text:
 * ~1 token per CJK character versus ~4 Latin characters per token. A flat
 * "3 chars/token" estimate dramatically UNDERESTIMATES CJK-heavy history
 * (measured 1.39 chars/token for a Chinese conversation whose estimate was
 * 3 chars/token), so the sliding window never trimmed and the entire history
 * was re-sent every turn — a 572K-char diary conversation billed ~412K input
 * tokens per message while the estimator claimed ~190K. Slightly
 * overestimating is the safe direction: trimming engages a bit earlier instead
 * of the request overflowing the model's real context window.
 */
const CHARS_PER_TOKEN_LATIN = 4;
const TOKENS_PER_CHAR_CJK = 1;

// CJK ideographs + extensions, kana, hangul, CJK punctuation and fullwidth
// forms — everything a Gemini tokenizer encodes at roughly one token each.
const CJK_CHAR_REGEX = /[\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F\u3040-\u30FF]/g;

export interface ContextWindowOptions {
  maxTokens: number;
  systemInstructions?: string;
}

/**
 * Estimate token count for a string
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjkCount = (text.match(CJK_CHAR_REGEX) || []).length;
  const latinChars = text.length - cjkCount;
  return Math.ceil(cjkCount * TOKENS_PER_CHAR_CJK + latinChars / CHARS_PER_TOKEN_LATIN);
}

/**
 * Select messages that fit within the context window.
 * Strategy: Always include system instructions, then fill from newest message backwards.
 * Messages that don't fit are skipped (no truncation) — they remain in the database
 * and visible in the conversation, but are not sent to the API.
 */
export function selectContextMessages(
  allMessages: ChatMessage[],
  options: ContextWindowOptions
): ChatMessage[] {
  const { maxTokens, systemInstructions } = options;

  let remainingTokens = maxTokens;
  const conversation: ChatMessage[] = [];

  // Reserve tokens for system instructions
  if (systemInstructions) {
    remainingTokens -= estimateTokens(systemInstructions);
  }

  // Fill from newest to oldest — include whole messages only, never truncate.
  // A message that doesn't fit is SKIPPED (not a hard stop): a huge middle
  // message must not silently erase every older turn.
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const msg = allMessages[i];
    const msgTokens = estimateTokens(msg.content);

    if (msgTokens <= remainingTokens) {
      conversation.unshift(msg);
      remainingTokens -= msgTokens;
    }
  }

  // Safety net: the newest message (usually the turn being answered) must survive
  // even if it alone exceeds the window — otherwise the API request would contain
  // no conversation at all. Oversize here is the model/provider's problem to reject.
  const newest = allMessages[allMessages.length - 1];
  if (newest && !conversation.includes(newest)) {
    conversation.push(newest); // stays last = chronologically newest
  }

  // System message always goes FIRST (previously it ended up last in the trimmed
  // path, which several providers reject or mis-handle).
  const selected: ChatMessage[] = [];
  if (systemInstructions) {
    selected.push({ role: "system", content: systemInstructions });
  }
  selected.push(...conversation);

  return selected;
}

/**
 * Build the full message list for API request, including system instructions.
 * If total tokens exceed maxTokens, applies sliding window to trim old messages.
 * Returns the messages and whether trimming occurred.
 */
export function buildApiMessagesWithSlidingWindow(
  conversationMessages: ChatMessage[],
  systemInstructions?: string,
  maxTokens?: number
): { messages: ChatMessage[]; trimmed: boolean; originalCount: number } {
  const originalCount = conversationMessages.length;

  // If no context limit specified, just build normally
  if (!maxTokens || maxTokens <= 0) {
    return { messages: buildApiMessages(conversationMessages, systemInstructions), trimmed: false, originalCount };
  }

  // Estimate total tokens
  let totalTokens = 0;
  if (systemInstructions) {
    totalTokens += estimateTokens(systemInstructions);
  }
  for (const msg of conversationMessages) {
    totalTokens += estimateTokens(msg.content);
  }

  // If within limit, build normally
  if (totalTokens <= maxTokens) {
    return { messages: buildApiMessages(conversationMessages, systemInstructions), trimmed: false, originalCount };
  }

  // Apply sliding window
  const selected = selectContextMessages(conversationMessages, {
    maxTokens,
    systemInstructions,
  });

  console.log(`[context-manager] Sliding window: ${originalCount} messages -> ${selected.filter(m => m.role !== "system").length} messages (estimated ${totalTokens} tokens, limit ${maxTokens})`);

  return {
    messages: selected,
    trimmed: true,
    originalCount,
  };
}

/**
 * Build the full message list for API request, including system instructions
 */
export function buildApiMessages(
  conversationMessages: ChatMessage[],
  systemInstructions?: string
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (systemInstructions) {
    messages.push({ role: "system", content: systemInstructions });
  }

  messages.push(...conversationMessages);
  return messages;
}
