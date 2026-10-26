import type { Block, ChatMessage, Message } from "@/types";

/**
 * Rough token estimation, CJK-aware.
 *
 * Gemini-family tokenizers encode CJK text far denser than Latin text: a flat
 * "3 chars/token" estimate underestimates CJK-heavy history by ~2.5x (measured
 * 1.39 chars/token for a Chinese conversation), so the sliding window never
 * trimmed and the entire history was re-sent every turn.
 *
 * Overestimating is equally costly, because the sliding window trims on this
 * local estimate — a constant 1.39x too high makes a configured 256K window cut
 * off at ~188K real input tokens, with the loss scaling linearly by window size.
 *
 * The constants below are calibrated to the measured density (1.39 CJK
 * chars/token = 0.72 tokens/char) with a small safety margin, so the effective
 * cutoff lands within a few percent of the configured window while still
 * erring on the side of trimming a little early rather than overflowing.
 */
const CHARS_PER_TOKEN_LATIN = 4;
const TOKENS_PER_CHAR_CJK = 0.75;

// CJK ideographs + extensions, kana, hangul, CJK punctuation and fullwidth
// forms — everything a Gemini tokenizer encodes at roughly one token each.
const CJK_CHAR_REGEX = /[\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F\u3040-\u30FF]/g;

// Media blocks carry a base64 data URL as their content (image/video/audio/
// pdf) — those bytes are NOT text, so they must NOT be fed to the text token
// estimator. Doing so inflated the context estimate by millions of tokens for
// any conversation with attachments (e.g. a 10MB PNG ≈ 10M base64 chars ≈
// 2.5M fake tokens). Their real cost is captured by the API-reported
// usageMetadata (media tokens), never by the local CJK text estimator.
const MEDIA_BLOB_BLOCK_TYPES = new Set(["image", "video", "audio", "pdf"]);

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
 * Share of the window the reply may claim, expressed as a CAPACITY RATIO.
 *
 * The provider bills prompt and completion against the same window, so the
 * sliding window must leave room for the reply. The amount reserved is the
 * smaller of the user's `max_output_tokens` and this share of the window — a
 * percentage ceiling, not a percentage floor.
 *
 * The ratio is a CEILING, not a floor: reserving a fixed share of the window
 * would shrink the prompt budget proportionally as the window grows, turning the
 * reservation into a second, hidden context cap. With the ceiling, a 256K window
 * keeps 229376 (87.5%) for the prompt and the relative accuracy is identical at
 * every window size.
 */
const OUTPUT_RESERVE_RATIO = 0.125;

/** Hard floor for the output reservation, so tiny caps stay usable. */
const OUTPUT_RESERVE_MIN_TOKENS = 1024;

/** Hard ceiling for the RAG reservation — memory is a recall aid, not a quota. */
const RAG_RESERVE_MAX_TOKENS = 8192;

export interface ContextBudgetOptions {
  /** The model's (or user-capped) context window. */
  contextWindow: number;
  /** Per-response output cap from settings (max_output_tokens). */
  maxOutputTokens?: number;
  /**
   * Share of the window reserved for RAG-retrieved memory, 0..1. Retrieved
   * chunks are appended to the system instruction and count against the same
   * window as the conversation. Capped in absolute terms (see
   * RAG_RESERVE_MAX_TOKENS) so it never becomes a second context cap.
   */
  ragReserveRatio?: number;
}

export interface ContextBudget {
  /** Tokens available for conversation history + system instructions. */
  promptTokens: number;
  /** Tokens reserved for the model's output. */
  outputTokens: number;
  /** Tokens reserved for RAG-retrieved memory chunks. */
  ragTokens: number;
}

/**
 * Split the configured context window into prompt / output / RAG shares.
 *
 * Every reservation is explicit and subtracted from the SAME window, so the
 * prompt budget plus both reservations can never exceed the window. Pure and
 * unit-tested, so the request path and the UI counter derive their budgets from
 * one place instead of re-deriving the arithmetic.
 */
export function resolveContextBudget(options: ContextBudgetOptions): ContextBudget {
  const window = Math.max(0, Math.floor(Number(options.contextWindow) || 0));
  if (window === 0) return { promptTokens: 0, outputTokens: 0, ragTokens: 0 };

  // Reserve the smaller of the configured output cap and a fixed share of the
  // window, so the reply always has room without the reservation growing into a
  // second, hidden context cap.
  const requestedOutput = Number(options.maxOutputTokens);
  const outputTokens = Math.min(
    Math.max(OUTPUT_RESERVE_MIN_TOKENS, Number.isFinite(requestedOutput) && requestedOutput > 0 ? Math.floor(requestedOutput) : OUTPUT_RESERVE_MIN_TOKENS),
    Math.floor(window * OUTPUT_RESERVE_RATIO)
  );

  const remaining = Math.max(0, window - outputTokens);
  const ragRatio = Math.min(Math.max(Number(options.ragReserveRatio) || 0, 0), 0.5);
  // RAG memory is a recall aid, never a reason to shrink the live prompt: its
  // share is taken from the window AFTER the output reservation, and only when
  // RAG is actually going to inject something.
  const ragTokens = ragRatio > 0 ? Math.min(RAG_RESERVE_MAX_TOKENS, Math.floor(remaining * ragRatio)) : 0;
  const promptTokens = Math.max(0, remaining - ragTokens);

  return { promptTokens, outputTokens, ragTokens };
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

  // System message always goes FIRST — several providers reject or mishandle a
  // system turn that is not leading.
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
 * Two token metrics that must never be conflated in the UI:
 * - `fullContextTokens` / `windowContextTokens`: local estimates of what the
 *   current conversation occupies (whole history / the subset the sliding
 *   window keeps for the next request).
 * - Cumulative consumption: the raw `usageMetadata` totals reported by the
 *   API — because AIStudio is a stateless proxy, each response's total also
 *   covers all history inside the window, so it is kept separately (stored in
 *   the chat store's per-message usage) for billing/history reference.
 */
export interface CurrentContextTokens {
  /** Estimated tokens of every visible block in the conversation (+ system instructions). */
  fullContextTokens: number;
  /** Estimated tokens of the portion the sliding window would actually send next. */
  windowContextTokens: number;
  /** True when the conversation exceeds the window and older turns are dropped from the request. */
  trimmed: boolean;
}

/**
 * Estimate the current conversation's context usage using the same CJK-aware
 * estimator as the request pipeline.
 *
 * Flattens every message's visible blocks (user text, model replies, thinking
 * blocks) into a single content string per message, then reports both the
 * whole-conversation estimate and, when a context limit is supplied, the
 * sliding-windowed subset. Deleted blocks and grounding metadata are excluded.
 */
export function calculateCurrentContextTokens(
  messages: (Message & { blocks?: Block[] })[],
  options: { maxTokens?: number; systemInstructions?: string } = {}
): CurrentContextTokens {
  const chatMessages: ChatMessage[] = [];
  for (const m of messages) {
    const content = (m.blocks || [])
      .filter(
        (b) =>
          !b.is_deleted &&
          b.type !== "grounding" &&
          !MEDIA_BLOB_BLOCK_TYPES.has(b.type)
      )
      .map((b) => b.content || "")
      .join("\n");
    if (content) chatMessages.push({ role: m.role, content });
  }

  const systemTokens = options.systemInstructions
    ? estimateTokens(options.systemInstructions)
    : 0;
  const fullContextTokens =
    systemTokens +
    chatMessages.reduce((acc, m) => acc + estimateTokens(m.content), 0);

  if (!options.maxTokens || options.maxTokens <= 0) {
    return { fullContextTokens, windowContextTokens: fullContextTokens, trimmed: false };
  }

  const { messages: windowed, trimmed } = buildApiMessagesWithSlidingWindow(
    chatMessages,
    options.systemInstructions,
    options.maxTokens
  );
  const windowContextTokens = windowed.reduce(
    (acc, m) => acc + estimateTokens(m.content),
    0
  );
  return { fullContextTokens, windowContextTokens, trimmed };
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

/**
 * Auto-read trigger decision for the settled reply (streaming or rerun).
 *
 * The subtle bug this guards against: when a stream ends, `isAnyStreaming`
 * flips to false BEFORE the final DB reload inserts the fresh assistant
 * message into `messages`. So the last assistant visible at that instant is
 * still the PREVIOUS turn — and in a continued conversation (where a real
 * transcript already exists) that stale snapshot would be spoken as if it were
 * the new reply, or the new reply would be double-read.
 *
 * The fix snapshots that stale id at arm time and refuses to speak the message
 * until `messages` expose a DIFFERENT (fresh) assistant id. This keeps the flag
 * armed across the reload so the new reply fires exactly once.
 */
export interface AutoReadDecisionInput {
  /** Whether auto-read was armed on the streaming -> idle transition. */
  pendingAutoRead: boolean;
  /** Whether anything is still streaming / rerunning. */
  isAnyStreaming: boolean;
  /** Id of the last assistant message visible when the reply completed. */
  armedLastAssistantId: string | null;
  /** Id of the last assistant message we already auto-read (never repeat). */
  lastAutoReadId: string | null;
  /** Id of the last assistant message currently in the transcript. */
  currentLastAssistantId: string | null;
  /** Whether that message carries readable (non-empty) prose. */
  hasReadableText: boolean;
}

export interface AutoReadDecision {
  /** Whether the settled assistant message should be spoken now. */
  fire: boolean;
  /** The id to store as the snapshot / last-read marker on a successful fire. */
  settledId: string | null;
}

export function shouldAutoReadReply(input: AutoReadDecisionInput): AutoReadDecision {
  if (!input.pendingAutoRead || input.isAnyStreaming) {
    return { fire: false, settledId: null };
  }

  // No assistant message yet (first turn still loading) — keep waiting.
  if (!input.currentLastAssistantId) {
    return { fire: false, settledId: null };
  }
  // Still the pre-settlement snapshot (the PREVIOUS turn's reply) — wait for the
  // final DB reload to land before we speak anything.
  if (input.currentLastAssistantId === input.armedLastAssistantId) {
    return { fire: false, settledId: null };
  }
  // Already read this exact message — never repeat it.
  if (input.currentLastAssistantId === input.lastAutoReadId) {
    return { fire: false, settledId: null };
  }
  // Nothing speakable (e.g. an error bubble whose blocks are all non-text).
  if (!input.hasReadableText) {
    return { fire: false, settledId: null };
  }

  return { fire: true, settledId: input.currentLastAssistantId };
}
