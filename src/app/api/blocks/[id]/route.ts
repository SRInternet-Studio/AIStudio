import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, execute } from "@/lib/db";
import { deleteEmbeddingsForMessages } from "@/lib/rag";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getDb();
    const block = await queryOne("SELECT message_id FROM blocks WHERE id = ?", [params.id]);
    await execute("UPDATE blocks SET is_deleted = 1 WHERE id = ?", [params.id]);
    // RAG: the message's text changed — drop its vectors so retrieval
    // re-embeds the remaining content on the next pass.
    if (block?.message_id) {
      await deleteEmbeddingsForMessages([block.message_id as string]);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
