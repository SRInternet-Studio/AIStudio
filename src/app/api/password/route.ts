import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Server-side app lock password.
 * The hash lives in the settings row (column app_password_hash) so EVERY device
 * reaching this deployment shares the same lock. The previous browser-localStorage
 * implementation made the password per-browser/per-origin: set it on the server's
 * localhost browser and any other device (or even another origin) saw no password.
 * Only the hash is exposed here — never the full settings row (which holds api_key).
 */

export async function GET() {
  try {
    await getDb();
    const row = await queryOne("SELECT app_password_hash FROM settings WHERE id = 1");
    const hash = (row?.app_password_hash as string) || "";
    return NextResponse.json({ success: true, data: { enabled: hash.length > 0, hash } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const hash = typeof body.hash === "string" ? body.hash.trim() : "";
    await execute("UPDATE settings SET app_password_hash = ?, updated_at = ? WHERE id = 1", [
      hash,
      new Date().toISOString(),
    ]);
    console.log("[api/password] Password", hash ? "set" : "cleared");
    return NextResponse.json({ success: true, data: { enabled: hash.length > 0 } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
