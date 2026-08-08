import { NextRequest, NextResponse } from "next/server";
import { getDb, queryAll, queryOne, execute } from "@/lib/db";
import { requireUnlock } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const rows = await queryAll("SELECT * FROM conversations ORDER BY updated_at DESC");
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const body = await request.json();
    const id = uuidv4();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO conversations (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [id, body.title || "New Conversation", body.model || "gpt-4o", now, now]
    );

    const row = await queryOne("SELECT * FROM conversations WHERE id = ?", [id]);
    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
