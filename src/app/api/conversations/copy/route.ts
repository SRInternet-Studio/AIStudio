import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, queryAll, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const { conversation_id } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { success: false, error: "conversation_id is required" },
        { status: 400 }
      );
    }

    // Get original conversation
    const origConv = await queryOne("SELECT * FROM conversations WHERE id = ?", [conversation_id]);
    if (!origConv) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const newConvId = uuidv4();
    const newTitle = `${origConv.title} (Copy)`;

    // Create new conversation
    await execute(
      `INSERT INTO conversations (id, title, model, parent_conversation_id, branch_from_message_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newConvId, newTitle, origConv.model, null, null, now, now]
    );

    // Copy all messages and their blocks
    const origMsgs = await queryAll(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY position ASC",
      [conversation_id]
    );

    for (const msg of origMsgs) {
      const newMsgId = uuidv4();
      // Carry token_count + breakdown over so the copy keeps the per-message usage counters.
      await execute(
        `INSERT INTO messages (id, conversation_id, parent_message_id, role, position, token_count, input_tokens, output_tokens, thought_tokens, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newMsgId, newConvId, msg.parent_message_id, msg.role, msg.position, msg.token_count || 0, msg.input_tokens || 0, msg.output_tokens || 0, msg.thought_tokens || 0, now]
      );

      // Copy blocks for this message
      const origBlocks = await queryAll(
        "SELECT * FROM blocks WHERE message_id = ? ORDER BY position ASC",
        [msg.id]
      );
      for (const block of origBlocks) {
        await execute(
          `INSERT INTO blocks (id, message_id, type, content, position, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), newMsgId, block.type, block.content, block.position, block.is_deleted ? 1 : 0, now]
        );
      }
    }

    const newConv = await queryOne("SELECT * FROM conversations WHERE id = ?", [newConvId]);
    return NextResponse.json({ success: true, data: newConv });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
