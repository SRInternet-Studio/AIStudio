import { NextRequest, NextResponse } from "next/server";
import { getDb, queryAll, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const { conversation_id, from_position, mode } = body;

    if (!conversation_id || from_position === undefined) {
      return NextResponse.json(
        { success: false, error: "conversation_id and from_position are required" },
        { status: 400 }
      );
    }

    // Issue 6: two distinct modes.
    //  - "regenerate" (in-place): delete ONLY the assistant reply immediately following the
    //    target user message (position from_position + 1), preserving every later turn so
    //    regenerating an older message no longer wipes the rest of the conversation.
    //  - default "truncate": legacy behavior — delete everything after from_position
    //    (used by deleteMessagesFromPosition to drop a message and all following ones).
    if (mode === "regenerate") {
      const assistantPos = Number(from_position) + 1;
      console.log("[api/messages/rerun] regenerate mode: removing assistant reply at position", assistantPos);
      const assistantMsgs = await queryAll(
        "SELECT id FROM messages WHERE conversation_id = ? AND position = ? AND role = 'assistant'",
        [conversation_id, assistantPos]
      );
      for (const msg of assistantMsgs) {
        await execute("DELETE FROM blocks WHERE message_id = ?", [msg.id]);
      }
      await execute(
        "DELETE FROM messages WHERE conversation_id = ? AND position = ? AND role = 'assistant'",
        [conversation_id, assistantPos]
      );
      console.log("[api/messages/rerun] regenerate mode: deleted", assistantMsgs.length, "assistant message(s)");
      return NextResponse.json({ success: true, mode: "regenerate", deleted: assistantMsgs.length });
    }

    // Default truncate: find all messages AFTER the given position (keep from_position itself)
    console.log("[api/messages/rerun] truncate mode: deleting messages after position", from_position);
    const msgsToDelete = await queryAll(
      "SELECT id FROM messages WHERE conversation_id = ? AND position > ?",
      [conversation_id, from_position]
    );

    // Delete blocks first, then messages
    for (const msg of msgsToDelete) {
      await execute("DELETE FROM blocks WHERE message_id = ?", [msg.id]);
    }
    await execute(
      "DELETE FROM messages WHERE conversation_id = ? AND position > ?",
      [conversation_id, from_position]
    );

    return NextResponse.json({ success: true, mode: "truncate", deleted: msgsToDelete.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
