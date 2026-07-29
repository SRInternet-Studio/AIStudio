import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, queryAll, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const { message_id } = body;

    if (!message_id) {
      return NextResponse.json(
        { success: false, error: "message_id is required" },
        { status: 400 }
      );
    }

    const sourceMsg = await queryOne("SELECT * FROM messages WHERE id = ?", [message_id]);
    if (!sourceMsg) {
      return NextResponse.json({ success: false, error: "Message not found" }, { status: 404 });
    }

    const sourceConv = await queryOne("SELECT * FROM conversations WHERE id = ?", [sourceMsg.conversation_id]);
    if (!sourceConv) {
      return NextResponse.json({ success: false, error: "Source conversation not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const newConvId = uuidv4();

    await execute(
      `INSERT INTO conversations (id, title, parent_conversation_id, branch_from_message_id, model, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newConvId, `Branch: ${sourceConv.title}`, sourceConv.id, message_id, sourceConv.model, now, now]
    );

    const historyMsgs = await queryAll(
      "SELECT * FROM messages WHERE conversation_id = ? AND position <= ? ORDER BY position ASC",
      [sourceMsg.conversation_id, sourceMsg.position]
    );

    for (const msg of historyMsgs) {
      const newMsgId = uuidv4();
      await execute(
        `INSERT INTO messages (id, conversation_id, parent_message_id, role, position, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newMsgId, newConvId, msg.id, msg.role, msg.position, now]
      );

      const blocks = await queryAll(
        "SELECT * FROM blocks WHERE message_id = ? AND is_deleted = 0 ORDER BY position ASC",
        [msg.id]
      );

      for (const block of blocks) {
        const newBlockId = uuidv4();
        await execute(
          `INSERT INTO blocks (id, message_id, type, content, position, is_deleted, created_at)
           VALUES (?, ?, ?, ?, ?, 0, ?)`,
          [newBlockId, newMsgId, block.type, block.content, block.position, now]
        );
      }
    }

    const newConv = await queryOne("SELECT * FROM conversations WHERE id = ?", [newConvId]);
    return NextResponse.json({ success: true, data: newConv });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
