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
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";
    const apiConfigId = searchParams.get("api_config_id");

    let dateFilter = "";
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    if (range === "today") {
      dateFilter = `AND date = '${today}'`;
    } else if (range === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      dateFilter = `AND date >= '${weekAgo}'`;
    } else if (range === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      dateFilter = `AND date >= '${monthAgo}'`;
    }

    let configFilter = "";
    if (apiConfigId) {
      configFilter = `AND api_config_id = '${apiConfigId}'`;
    }

    const stats = await queryAll(
      `SELECT * FROM usage_stats WHERE 1=1 ${dateFilter} ${configFilter} ORDER BY date DESC`
    );
    return NextResponse.json({ success: true, data: stats });
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
    const { api_config_id, model, input_tokens, output_tokens, request_count, conversation_count, date } = body;

    const now = new Date().toISOString();
    const id = uuidv4();

    await execute(
      `INSERT INTO usage_stats (id, api_config_id, model, input_tokens, output_tokens, request_count, conversation_count, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, api_config_id || "", model || "", input_tokens || 0, output_tokens || 0, request_count || 0, conversation_count || 0, date || now.split("T")[0], now]
    );

    const stat = await queryOne("SELECT * FROM usage_stats WHERE id = ?", [id]);
    return NextResponse.json({ success: true, data: stat });
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

    await execute("DELETE FROM usage_stats WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
