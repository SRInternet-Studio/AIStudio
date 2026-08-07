import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, queryAll, execute } from "@/lib/db";
import { deleteEmbeddingsForMessages } from "@/lib/rag";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const { conversation_id, role, content, position } = body;

    if (!conversation_id || !role || !content) {
      return NextResponse.json(
        { success: false, error: "conversation_id, role, and content are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const msgId = uuidv4();
    const pos = position ?? 0;

    await execute(
      `INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES (?, ?, ?, ?, ?)`,
      [msgId, conversation_id, role, pos, now]
    );

    const blockId = uuidv4();
    await execute(
      `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'text', ?, 0, ?)`,
      [blockId, msgId, content, now]
    );

    const msg = await queryOne("SELECT * FROM messages WHERE id = ?", [msgId]);
    return NextResponse.json({ success: true, data: msg });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const { message_id, content } = body;

    if (!message_id || !content) {
      return NextResponse.json(
        { success: false, error: "message_id and content are required" },
        { status: 400 }
      );
    }

    // Update the text block content for this message
    await execute(
      `UPDATE blocks SET content = ? WHERE message_id = ? AND type = 'text'`,
      [content, message_id]
    );
    // RAG: edited content invalidates the stored vectors — drop them so the
    // message gets re-embedded (with its new content) on the next retrieval pass.
    await deleteEmbeddingsForMessages([message_id]);

    const msg = await queryOne("SELECT * FROM messages WHERE id = ?", [message_id]);
    return NextResponse.json({ success: true, data: msg });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
