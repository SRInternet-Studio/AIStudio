import { NextRequest, NextResponse } from "next/server";
import { getDb, queryAll, execute } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const { conversation_id, from_position } = body;

    if (!conversation_id || from_position === undefined) {
      return NextResponse.json(
        { success: false, error: "conversation_id and from_position are required" },
        { status: 400 }
      );
    }

    // Find all messages at or after the given position
    const msgsToDelete = await queryAll(
      "SELECT id FROM messages WHERE conversation_id = ? AND position >= ?",
      [conversation_id, from_position]
    );

    // Delete blocks first, then messages
    for (const msg of msgsToDelete) {
      await execute("DELETE FROM blocks WHERE message_id = ?", [msg.id]);
    }
    await execute(
      "DELETE FROM messages WHERE conversation_id = ? AND position >= ?",
      [conversation_id, from_position]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
