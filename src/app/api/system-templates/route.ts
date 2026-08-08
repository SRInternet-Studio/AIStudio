import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, queryAll, execute } from "@/lib/db";
import { requireUnlock } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const rows = await queryAll("SELECT * FROM system_templates ORDER BY updated_at DESC");
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
    const { title, content } = body;
    const now = new Date().toISOString();
    const id = uuidv4();

    await execute(
      `INSERT INTO system_templates (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [id, title || "Untitled", content || "", now, now]
    );

    const row = await queryOne("SELECT * FROM system_templates WHERE id = ?", [id]);
    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const body = await request.json();
    const { id, title, content } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
    }
    if (content !== undefined) {
      updates.push("content = ?");
      values.push(content);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" });
    }

    updates.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await execute(`UPDATE system_templates SET ${updates.join(", ")} WHERE id = ?`, values);

    const row = await queryOne("SELECT * FROM system_templates WHERE id = ?", [id]);
    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    await execute("DELETE FROM system_templates WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
