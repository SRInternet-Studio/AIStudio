import { NextRequest, NextResponse } from "next/server";
import { getDb, queryAll, execute } from "@/lib/db";
import { deleteEmbeddingsForMessages } from "@/lib/rag";
import { requireUnlock } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const body = await request.json();
    const { conversation_id, from_position, mode } = body;

    if (!conversation_id || from_position === undefined) {
      return NextResponse.json(
        { success: false, error: "conversation_id and from_position are required" },
        { status: 400 }
      );
    }

    // Guard: real message positions start at 1. A negative from_position (e.g. the
    // client-side synthetic error message with position -1) would make the truncate
    // condition `position > -2` match EVERY message and silently wipe the whole
    // conversation — reject it instead.
    if (!Number.isFinite(Number(from_position)) || Number(from_position) < 0) {
      console.warn("[api/messages/rerun] rejected negative/invalid from_position:", from_position);
      return NextResponse.json(
        { success: false, error: "from_position must be a non-negative number" },
        { status: 400 }
      );
    }

    // Issue 6: two distinct modes.
    //  - "regenerate" (in-place): delete ONLY the assistant reply immediately following the
    //    target user message (position from_position + 1), preserving every later turn so
    //    regenerating an older message no longer wipes the rest of the conversation.
    //    The reply may have been manually deleted already, so check for its existence first
    //    and never attempt to delete something that isn't there.
    //  - default "truncate": legacy behavior — delete everything after from_position
    //    (used by deleteMessagesFromPosition to drop a message and all following ones).
    if (mode === "regenerate") {
      const assistantPos = Number(from_position) + 1;
      console.log("[api/messages/rerun] regenerate mode: checking assistant reply at position", assistantPos);
      // Step 1: check whether the target user message still has an assistant reply
      // (the message row carries both the model thinking and the model reply as blocks).
      const assistantMsgs = await queryAll(
        "SELECT id FROM messages WHERE conversation_id = ? AND position = ? AND role = 'assistant'",
        [conversation_id, assistantPos]
      );
      if (assistantMsgs.length > 0) {
        // Step 2: reply exists — remove it (blocks first, including thinking, then the message row).
        for (const msg of assistantMsgs) {
          await execute("DELETE FROM blocks WHERE message_id = ?", [msg.id]);
        }
        await execute(
          "DELETE FROM messages WHERE id IN (" + assistantMsgs.map(() => "?").join(",") + ")",
          assistantMsgs.map((m) => m.id)
        );
        // RAG: the regenerated reply's vectors become stale once it is deleted.
        await deleteEmbeddingsForMessages(assistantMsgs.map((m) => m.id as string));
        console.log("[api/messages/rerun] regenerate mode: deleted", assistantMsgs.length, "assistant message(s) at position", assistantPos);
      } else {
        // Reply was already removed manually — nothing to delete.
        console.log("[api/messages/rerun] regenerate mode: no assistant reply at position", assistantPos, "- nothing to delete");
      }
      return NextResponse.json({
        success: true,
        mode: "regenerate",
        existed: assistantMsgs.length > 0,
        deleted: assistantMsgs.length,
      });
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
    // RAG: purge vectors of the truncated tail.
    await deleteEmbeddingsForMessages(msgsToDelete.map((m) => m.id as string));

    return NextResponse.json({ success: true, mode: "truncate", deleted: msgsToDelete.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
