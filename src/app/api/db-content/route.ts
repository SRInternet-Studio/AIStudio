import { NextRequest, NextResponse } from "next/server";
import { getDb, queryAll, queryOne, execute } from "@/lib/db";
import { deleteEmbeddingsForConversation } from "@/lib/rag";
import { requireUnlock } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");

    if (conversationId) {
      // Get full conversation with messages and blocks
      const conv = await queryOne("SELECT * FROM conversations WHERE id = ?", [conversationId]);
      if (!conv) {
        return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
      }

      const messages = await queryAll(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY position ASC",
        [conversationId]
      );

      const messagesWithBlocks = [];
      for (const msg of messages) {
        const blocks = await queryAll(
          "SELECT * FROM blocks WHERE message_id = ? AND is_deleted = 0 ORDER BY position ASC",
          [msg.id]
        );
        messagesWithBlocks.push({ ...msg, blocks });
      }

      return NextResponse.json({ success: true, data: { ...conv, messages: messagesWithBlocks } });
    }

    // Get all conversations with summary
    const conversations = await queryAll(
      "SELECT * FROM conversations ORDER BY created_at DESC"
    );

    const convsWithCounts = [];
    for (const conv of conversations) {
      const msgCount = await queryOne(
        "SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?",
        [conv.id]
      );
      convsWithCounts.push({ ...conv, message_count: msgCount?.count || 0 });
    }

    return NextResponse.json({ success: true, data: convsWithCounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const body = await request.json();
    const { id, title } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    await execute(
      "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
      [title, now, id]
    );

    const conv = await queryOne("SELECT * FROM conversations WHERE id = ?", [id]);
    return NextResponse.json({ success: true, data: conv });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "conversation_id is required" }, { status: 400 });
    }

    // Cascade delete: blocks -> messages -> conversation
    const messages = await queryAll(
      "SELECT id FROM messages WHERE conversation_id = ?",
      [conversationId]
    );

    for (const msg of messages) {
      await execute("DELETE FROM blocks WHERE message_id = ?", [msg.id]);
    }

    await execute("DELETE FROM messages WHERE conversation_id = ?", [conversationId]);
    await execute("DELETE FROM conversations WHERE id = ?", [conversationId]);
    // RAG: drop the conversation's stored embeddings alongside its messages
    // (mirrors DELETE /api/conversations/[id]).
    await deleteEmbeddingsForConversation(conversationId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
