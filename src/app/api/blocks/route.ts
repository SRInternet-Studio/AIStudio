import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, execute } from "@/lib/db";
import { requireUnlock } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
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

// NOTE: block deletion lives at DELETE /api/blocks/:id (see ./[id]/route.ts).
// A DELETE handler on this non-dynamic route could never receive params and
// was dead code — removed during the Next 16 migration.
