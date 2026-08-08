import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, queryAll, execute } from "@/lib/db";
import { deleteEmbeddingsForConversation } from "@/lib/rag";
import { requireUnlock } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const conv = await queryOne("SELECT * FROM conversations WHERE id = ?", [params.id]);

    if (!conv) {
      return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
    }

    // Issue 2: lazy loading. When `limit` is provided, only the newest `limit` messages
    // (optionally older than `before_position`) are loaded WITH their heavy blocks, so a
    // ~900k-token conversation no longer forces the whole transcript into memory at once.
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
          [params.id, beforePosition, limit]
        );
      } else {
        msgs = await queryAll(
          "SELECT * FROM messages WHERE conversation_id = ? ORDER BY position DESC LIMIT ?",
          [params.id, limit]
        );
      }
      msgs = msgs.reverse(); // DESC batch -> ASC for rendering
    } else {
      msgs = await queryAll(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY position ASC",
        [params.id]
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
        [params.id, oldestPosition]
      );
      hasMore = Number(olderRow?.cnt || 0) > 0;
    }

    // Lightweight token-count list for ALL messages (id/role/token_count + breakdown,
    // no blocks) so the header token counter stays accurate even though only a slice
    // of messages is materialized.
    let tokenCounts: any[] | undefined;
    if (limit != null) {
      tokenCounts = await queryAll(
        "SELECT id, role, token_count, input_tokens, output_tokens, thought_tokens FROM messages WHERE conversation_id = ? ORDER BY position ASC",
        [params.id]
      );
    }

    console.log("[conv/id] GET returning", messagesWithBlocks.length, "messages (limit:", limit,
      "before:", beforePosition, "hasMore:", hasMore, "oldestPosition:", oldestPosition, ")");

    return NextResponse.json({
      success: true,
      data: {
        conversation: conv,
        messages: messagesWithBlocks,
        hasMore,
        oldestPosition,
        tokenCounts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const body = await request.json();
    const now = new Date().toISOString();

    if (body.title !== undefined) {
      await execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", [
        body.title,
        now,
        params.id,
      ]);
    }

    const conv = await queryOne("SELECT * FROM conversations WHERE id = ?", [params.id]);
    return NextResponse.json({ success: true, data: conv });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const msgs = await queryAll("SELECT id FROM messages WHERE conversation_id = ?", [params.id]);

    for (const msg of msgs) {
      await execute("DELETE FROM blocks WHERE message_id = ?", [msg.id]);
    }

    await execute("DELETE FROM messages WHERE conversation_id = ?", [params.id]);
    await execute("DELETE FROM conversations WHERE id = ?", [params.id]);
    // RAG: drop the conversation's stored embeddings alongside its messages.
    await deleteEmbeddingsForConversation(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
