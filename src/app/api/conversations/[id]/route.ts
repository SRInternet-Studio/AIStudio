import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, queryAll, execute } from "@/lib/db";
import { deleteEmbeddingsForConversation } from "@/lib/rag";
import { requireUnlock } from "@/lib/auth";
import { estimateTokens } from "@/lib/context-manager";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next 15+: dynamic route params are async.
    const { id } = await params;
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const conv = await queryOne("SELECT * FROM conversations WHERE id = ?", [id]);

    if (!conv) {
      return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
    }

    // Lazy loading. When `limit` is provided, only the newest `limit` messages
    // (optionally older than `before_position`) are loaded WITH their heavy blocks,
    // so very long conversations don't force the whole transcript into memory at once.
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const beforeParam = url.searchParams.get("before_position");
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : null;
    const beforePosition = beforeParam != null ? parseInt(beforeParam, 10) : null;

    let msgs: any[];
    if (limit != null) {
      if (beforePosition != null) {
        msgs = await queryAll(
          "SELECT * FROM messages WHERE conversation_id = ? AND position < ? ORDER BY position DESC LIMIT ?",
          [id, beforePosition, limit]
        );
      } else {
        msgs = await queryAll(
          "SELECT * FROM messages WHERE conversation_id = ? ORDER BY position DESC LIMIT ?",
          [id, limit]
        );
      }
      msgs = msgs.reverse(); // DESC batch -> ASC for rendering
    } else {
      msgs = await queryAll(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY position ASC",
        [id]
      );
    }

    const messagesWithBlocks = [];
    for (const msg of msgs) {
      const blocks = await queryAll(
        "SELECT * FROM blocks WHERE message_id = ? AND is_deleted = 0 ORDER BY position ASC",
        [msg.id]
      );
      messagesWithBlocks.push({ ...msg, blocks });
    }

    // Determine whether older messages remain, and the oldest loaded position (paging cursor).
    const oldestPosition = messagesWithBlocks.length > 0 ? messagesWithBlocks[0].position : null;
    let hasMore = false;
    if (limit != null && oldestPosition != null) {
      const olderRow = await queryOne(
        "SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND position < ?",
        [id, oldestPosition]
      );
      hasMore = Number(olderRow?.cnt || 0) > 0;
    }

    // Lightweight token-count list for ALL messages (id/role/token_count + breakdown,
    // no blocks) so the header token counter stays accurate even though only a slice
    // of messages is materialized.
    let tokenCounts: any[] | undefined;
    // Whole-history context estimate (tokens) over the text blocks of EVERY
    // message, not just the materialized page — the header counter must not
    // depend on how many messages the client has loaded.
    let fullContextEstimate: number | undefined;
    if (limit != null) {
      // Messages with no visible blocks don't render in the transcript, so
      // their token fields are excluded from the header counter.
      tokenCounts = await queryAll(
        `SELECT id, role, token_count, input_tokens, output_tokens, thought_tokens FROM messages m
         WHERE conversation_id = ?
           AND EXISTS (SELECT 1 FROM blocks b WHERE b.message_id = m.id AND b.is_deleted = 0)
         ORDER BY position ASC`,
        [id]
      );

      // Text content of every non-deleted text block in the conversation. Media
      // and grounding blocks are excluded — they carry no prompt text and their
      // token cost is reported by the API, not estimated locally.
      const allTextRows = await queryAll(
        `SELECT m.id AS message_id, b.type AS type, b.content AS content
         FROM messages m
         JOIN blocks b ON b.message_id = m.id
         WHERE m.conversation_id = ? AND b.is_deleted = 0 AND b.type IN ('text', 'thinking')
         ORDER BY m.position ASC, b.position ASC`,
        [id]
      );
      // Per message, the same way calculateCurrentContextTokens does it: join the
      // message's visible blocks with "\n" and estimate the result once, so a
      // message with several blocks is not double-counted.
      const perMessage = new Map<string, string[]>();
      for (const row of allTextRows) {
        const list = perMessage.get(row.message_id as string) || [];
        list.push((row.content as string) || "");
        perMessage.set(row.message_id as string, list);
      }
      fullContextEstimate = 0;
      for (const parts of perMessage.values()) {
        if (parts.length > 0) fullContextEstimate += estimateTokens(parts.join("\n"));
      }
    }

    console.log("[conv/id] GET returning", messagesWithBlocks.length, "messages (limit:", limit,
      "before:", beforePosition, "hasMore:", hasMore, "oldestPosition:", oldestPosition,
      "fullContextEstimate:", fullContextEstimate, ")");

    return NextResponse.json({
      success: true,
      data: {
        conversation: conv,
        messages: messagesWithBlocks,
        hasMore,
        oldestPosition,
        tokenCounts,
        fullContextEstimate,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const body = await request.json();
    const now = new Date().toISOString();

    if (body.title !== undefined) {
      await execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", [
        body.title,
        now,
        id,
      ]);
    }

    const conv = await queryOne("SELECT * FROM conversations WHERE id = ?", [id]);
    return NextResponse.json({ success: true, data: conv });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const msgs = await queryAll("SELECT id FROM messages WHERE conversation_id = ?", [id]);

    for (const msg of msgs) {
      await execute("DELETE FROM blocks WHERE message_id = ?", [msg.id]);
    }

    await execute("DELETE FROM messages WHERE conversation_id = ?", [id]);
    await execute("DELETE FROM conversations WHERE id = ?", [id]);
    // RAG: drop the conversation's stored embeddings alongside its messages.
    await deleteEmbeddingsForConversation(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
