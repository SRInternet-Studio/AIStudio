import { v4 as uuidv4 } from "uuid";
import type { Block, Message } from "@/types";

/**
 * Server-side persistence helpers for the chat pipeline.
 *
 * Extracted from src/app/api/chat/route.ts so the focused test suite can run
 * them under `node --test` against a scratch SQLite database — this module
 * deliberately has no Next.js or DB-driver imports; the caller injects the
 * DB helpers (see DbAdapter).
 */

export interface DbAdapter {
  queryOne(sql: string, params?: any[]): Promise<any | null>;
  execute(sql: string, params?: any[]): Promise<void>;
}

export interface PersistAssistantOptions {
  conversationId: string;
  messageId: string;
  /** Target position for the assistant reply (user position + 1). */
  position: number;
  /** Set for in-place regeneration (target user message position), else null. */
  regeneratePosition: number | null;
  text: string;
  thinking?: string;
  toolResults?: { type: string; content: string }[];
  /**
   * Google Search grounding citations (chunks + supports) serialized as JSON
   * into a dedicated `grounding` block; the UI turns them into footnotes at
   * render time. Optional — absent for non-grounded responses.
   */
  groundingMetadata?: unknown;
  now: string;
}

/**
 * The next message position MUST come from MAX(position), never from the row
 * count: after messages are deleted, length+1 can reuse a position that a
 * later message still occupies, which corrupts conversation ordering
 * (duplicate positions).
 */
export function nextMessagePosition(existingMessages: Array<{ position: unknown }>): number {
  const max = existingMessages.reduce(
    (m: number, msg) => Math.max(m, Number(msg.position) || 0),
    0
  );
  return max + 1;
}

/**
 * Whether partial stream output is worth persisting after a stream error.
 * Empty text AND empty thinking means nothing was generated (and nothing
 * billed) — storing an empty assistant message would just pollute the
 * conversation.
 */
export function hasPersistableContent(text: string, thinking?: string): boolean {
  return text.length > 0 || (thinking || "").length > 0;
}

/**
 * Sentinel position for client-only messages that have no DB row yet.
 *
 * Real positions start at 1 and grow monotonically, so anything at or above
 * this mark is unambiguously local. `applyDbMessages` uses it to tell an
 * optimistic bubble (must survive a reload) apart from persisted history.
 */
export const OPTIMISTIC_POSITION = 9999;

/**
 * Build the local assistant message that keeps a finished reply on screen while
 * the DB write + reload is still in flight.
 *
 * The streaming bubble is a pure render artifact of `isStreaming`: it unmounts
 * the instant the stream ends, while the DB write and the reload that follows
 * are asynchronous. Promoting the accumulated buffer into a regular message
 * before clearing the streaming state keeps the reply continuously visible.
 *
 * The caller supplies a fresh id; `applyDbMessages` drops this message once the
 * persisted row with the same text arrives, so it is never shown twice.
 */
export function buildOptimisticAssistantMessage(opts: {
  conversationId: string;
  text: string;
  thinking?: string;
  now: string;
  id: string;
}): Message {
  const blocks: Block[] = [];
  if (opts.thinking) {
    blocks.push({
      id: `optimistic-thinking-${opts.id}`,
      message_id: opts.id,
      type: "thinking",
      content: opts.thinking,
      position: blocks.length,
      is_deleted: false,
      created_at: opts.now,
    });
  }
  blocks.push({
    id: `optimistic-text-${opts.id}`,
    message_id: opts.id,
    type: "text",
    content: opts.text,
    position: blocks.length,
    is_deleted: false,
    created_at: opts.now,
  });
  return {
    id: opts.id,
    conversation_id: opts.conversationId,
    parent_message_id: null,
    role: "assistant",
    position: OPTIMISTIC_POSITION,
    created_at: opts.now,
    blocks,
  };
}

/**
 * Idempotently persist an assistant reply: message row + thinking/text/
 * tool_result blocks.
 *
 * Safe to call from both the normal completion path and the stream-error
 * path — a second call with the same messageId is a no-op, so partial
 * content saved after a stream failure is never duplicated on retry, and
 * already-generated content (the user was billed for those tokens) is never
 * lost when the stream errors out.
 *
 * For in-place regeneration the reply must land exactly at P+1. The rerun
 * endpoint already removed the old reply there; if something still occupies
 * the slot (legacy data with collided positions), it and every later message
 * are shifted up by one so earlier and later history both stay intact.
 *
 * Returns true when this call stored the message, false when it already
 * existed (idempotent no-op).
 */
export async function persistAssistantMessage(
  db: DbAdapter,
  opts: PersistAssistantOptions
): Promise<boolean> {
  // Idempotency guard: the completion path and the error path can both call
  // this for the same messageId — only the first call may write.
  const existing = await db.queryOne("SELECT id FROM messages WHERE id = ?", [opts.messageId]);
  if (existing) return false;

  if (opts.regeneratePosition !== null) {
    const occupant = await db.queryOne(
      "SELECT id, role FROM messages WHERE conversation_id = ? AND position = ?",
      [opts.conversationId, opts.position]
    );
    if (occupant) {
      console.warn(
        `[chat-persistence] Regenerate: position ${opts.position} still occupied by ${occupant.role} message - shifting it and later messages +1`
      );
      await db.execute(
        "UPDATE messages SET position = position + 1 WHERE conversation_id = ? AND position >= ?",
        [opts.conversationId, opts.position]
      );
    }
  }

  await db.execute(
    "INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES (?, ?, 'assistant', ?, ?)",
    [opts.messageId, opts.conversationId, opts.position, opts.now]
  );

  let blockPosition = 0;
  if (opts.thinking) {
    await db.execute(
      "INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'thinking', ?, ?, ?)",
      [uuidv4(), opts.messageId, opts.thinking, blockPosition++, opts.now]
    );
  }
  await db.execute(
    "INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'text', ?, ?, ?)",
    [uuidv4(), opts.messageId, opts.text, blockPosition++, opts.now]
  );
  for (const tr of opts.toolResults || []) {
    await db.execute(
      "INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'tool_result', ?, ?, ?)",
      [uuidv4(), opts.messageId, JSON.stringify(tr), blockPosition++, opts.now]
    );
  }
  if (opts.groundingMetadata) {
    await db.execute(
      "INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'grounding', ?, ?, ?)",
      [uuidv4(), opts.messageId, JSON.stringify(opts.groundingMetadata), blockPosition++, opts.now]
    );
  }
  return true;
}
