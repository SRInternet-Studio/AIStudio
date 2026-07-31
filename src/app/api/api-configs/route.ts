import { NextRequest, NextResponse } from "next/server";
import { getDb, queryAll, queryOne, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb();
    const configs = await queryAll("SELECT * FROM api_configs ORDER BY created_at DESC");
    return NextResponse.json({ success: true, data: configs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const { base_url, api_key, label, protocol, model } = body;

    if (!base_url || !api_key) {
      return NextResponse.json(
        { success: false, error: "base_url and api_key are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    await execute(
      `INSERT INTO api_configs (id, base_url, api_key, label, protocol, model, last_used_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, base_url, api_key, label || "", protocol || "openai", model || "", now, now, now]
    );

    const config = await queryOne("SELECT * FROM api_configs WHERE id = ?", [id]);
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const { id, base_url, api_key, label, protocol, model } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: any[] = [];

    if (base_url !== undefined) { updates.push("base_url = ?"); params.push(base_url); }
    if (api_key !== undefined) { updates.push("api_key = ?"); params.push(api_key); }
    if (label !== undefined) { updates.push("label = ?"); params.push(label); }
    if (protocol !== undefined) { updates.push("protocol = ?"); params.push(protocol); }
    if (model !== undefined) { updates.push("model = ?"); params.push(model); }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = ?");
    params.push(now);
    params.push(id);

    await execute(
      `UPDATE api_configs SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    const config = await queryOne("SELECT * FROM api_configs WHERE id = ?", [id]);
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    await execute("DELETE FROM api_configs WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
