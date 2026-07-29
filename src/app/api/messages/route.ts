import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

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
