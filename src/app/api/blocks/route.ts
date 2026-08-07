import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, execute } from "@/lib/db";
import { deleteEmbeddingsForMessages } from "@/lib/rag";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const { message_id, type, content, position } = body;

    if (!message_id || !type || content === undefined) {
      return NextResponse.json(
        { success: false, error: "message_id, type, and content are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const id = uuidv4();
    const pos = position ?? 0;

    await execute(
      `INSERT INTO blocks (id, message_id, type, content, position, is_deleted, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, message_id, type, content, pos, now]
    );

    const block = await queryOne("SELECT * FROM blocks WHERE id = ?", [id]);
    return NextResponse.json({ success: true, data: block });
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
    const block = await queryOne("SELECT message_id FROM blocks WHERE id = ?", [params.id]);
    await execute("UPDATE blocks SET is_deleted = 1 WHERE id = ?", [params.id]);
    // RAG: the message's text changed — drop its vectors (see blocks/[id] DELETE).
    if (block?.message_id) {
      await deleteEmbeddingsForMessages([block.message_id as string]);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
