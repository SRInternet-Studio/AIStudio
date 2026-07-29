import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, execute } from "@/lib/db";

export async function GET() {
  try {
    await getDb();
    const row = await queryOne("SELECT * FROM settings WHERE id = 1");
    if (!row) {
      return NextResponse.json({ success: false, error: "Settings not found" });
    }

    const data = {
      ...row,
      tools_config: JSON.parse(row.tools_config as string || "{}"),
      safety_settings: JSON.parse(row.safety_settings as string || "[]"),
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const now = new Date().toISOString();

    const allowedFields = [
      "base_url",
      "api_key",
      "api_protocol",
      "selected_model",
      "system_instructions",
      "temperature",
      "thinking_level",
      "tools_config",
      "top_p",
      "top_k",
      "max_output_tokens",
      "safety_settings",
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(
          typeof body[field] === "object"
            ? JSON.stringify(body[field])
            : body[field]
        );
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" });
    }

    updates.push("updated_at = ?");
    values.push(now);
    values.push(1);

    await execute(`UPDATE settings SET ${updates.join(", ")} WHERE id = ?`, values);

    const row = await queryOne("SELECT * FROM settings WHERE id = 1");
    const data = {
      ...row,
      tools_config: JSON.parse(row.tools_config as string || "{}"),
      safety_settings: JSON.parse(row.safety_settings as string || "[]"),
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
