import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, execute } from "@/lib/db";
import { deleteEmbeddingsForMessages } from "@/lib/rag";
import { requireUnlock } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next 15+: dynamic route params are async.
    const { id } = await params;
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const block = await queryOne("SELECT message_id FROM blocks WHERE id = ?", [id]);
    await execute("UPDATE blocks SET is_deleted = 1 WHERE id = ?", [id]);
    // RAG: the message's text changed — drop its vectors so retrieval
    // re-embeds the remaining content on the next pass.
    if (block?.message_id) {
      await deleteEmbeddingsForMessages([block.message_id as string]);
      // When the last visible block of a message is removed, purge the message
      // row too — otherwise it would render as an empty placeholder bubble
      // (header / token stats only).
      const remaining = await queryOne(
        "SELECT COUNT(*) AS c FROM blocks WHERE message_id = ? AND is_deleted = 0",
        [block.message_id as string]
      );
      if (Number((remaining as any)?.c ?? 0) === 0) {
        console.log("[blocks/api] Message", block.message_id, "has no visible blocks left — purging message row");
        await execute("DELETE FROM messages WHERE id = ?", [block.message_id as string]);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
