import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, queryAll, execute } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getDb();
    const conv = await queryOne("SELECT * FROM conversations WHERE id = ?", [params.id]);

    if (!conv) {
      return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 });
    }

    const msgs = await queryAll(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY position ASC",
      [params.id]
    );

    const messagesWithBlocks = [];
    for (const msg of msgs) {
      const blocks = await queryAll(
        "SELECT * FROM blocks WHERE message_id = ? AND is_deleted = 0 ORDER BY position ASC",
        [msg.id]
      );
      messagesWithBlocks.push({ ...msg, blocks });
    }

    return NextResponse.json({
      success: true,
      data: { conversation: conv, messages: messagesWithBlocks },
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
    await getDb();
    const msgs = await queryAll("SELECT id FROM messages WHERE conversation_id = ?", [params.id]);

    for (const msg of msgs) {
      await execute("DELETE FROM blocks WHERE message_id = ?", [msg.id]);
    }

    await execute("DELETE FROM messages WHERE conversation_id = ?", [params.id]);
    await execute("DELETE FROM conversations WHERE id = ?", [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
