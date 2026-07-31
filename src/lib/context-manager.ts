import type { ChatMessage } from "@/types";

/**
 * Rough token estimation: ~4 chars per token for English, ~2 chars for Chinese
 * Using a conservative average of 3 chars/token
 */
const CHARS_PER_TOKEN = 3;

export interface ContextWindowOptions {
  maxTokens: number;
  systemInstructions?: string;
}

/**
 * Estimate token count for a string
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Select messages that fit within the context window.
 * Strategy: Always include system instructions, then fill from newest message backwards.
 * Messages that don't fit are excluded entirely (no truncation) — they remain in the
 * database for potential RAG retrieval but are not sent to the API.
 */
export function selectContextMessages(
  allMessages: ChatMessage[],
  options: ContextWindowOptions
): ChatMessage[] {
  const { maxTokens, systemInstructions } = options;

  let remainingTokens = maxTokens;
  const selected: ChatMessage[] = [];

  // Reserve tokens for system instructions
  if (systemInstructions) {
    const sysTokens = estimateTokens(systemInstructions);
    remainingTokens -= sysTokens;
    selected.unshift({ role: "system", content: systemInstructions });
  }

  // Fill from newest to oldest — include whole messages only, never truncate
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const msg = allMessages[i];
    const msgTokens = estimateTokens(msg.content);

    if (msgTokens <= remainingTokens) {
      selected.unshift(msg);
      remainingTokens -= msgTokens;
    } else {
      // Skip this message entirely (no truncation)
      break;
    }
  }

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
