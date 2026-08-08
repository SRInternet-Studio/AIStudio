import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, execute } from "@/lib/db";
import { issueUnlockCookie, clearUnlockCookie } from "@/lib/auth";
import { LOCK_FLAG_COOKIE } from "@/lib/auth-constants";

export const dynamic = "force-dynamic";

/**
 * Server-side app lock password.
 * The hash lives in the settings row (column app_password_hash) so EVERY device
 * reaching this deployment shares the same lock. The previous browser-localStorage
 * implementation made the password per-browser/per-origin: set it on the server's
 * localhost browser and any other device (or even another origin) saw no password.
 * Only the hash is exposed here — never the full settings row (which holds api_key).
 *
 * Unlock session (security fix): verification happens HERE, server-side. A
 * correct hash earns an httpOnly session cookie that every database-backed
 * API route checks (requireUnlock) before sending any data. See src/lib/auth.ts.
 */

const FLAG_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax", path: "/" } as const;

/** Tell the middleware whether a lock password is configured. */
function setLockFlagCookie(res: NextResponse, enabled: boolean): NextResponse {
  res.cookies.set(LOCK_FLAG_COOKIE, enabled ? "1" : "", {
    ...FLAG_COOKIE_OPTIONS,
    maxAge: enabled ? 60 * 60 * 24 * 365 : 0,
  });
  return res;
}

export async function GET() {
  try {
    await getDb();
    const row = await queryOne("SELECT app_password_hash FROM settings WHERE id = 1");
    const hash = (row?.app_password_hash as string) || "";
    const res = NextResponse.json({ success: true, data: { enabled: hash.length > 0, hash } });
    return setLockFlagCookie(res, hash.length > 0);
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
    const res = NextResponse.json({ success: true, data: { enabled: hash.length > 0 } });
    setLockFlagCookie(res, hash.length > 0);
    if (!hash) clearUnlockCookie(res); // clearing the password also ends every unlock session
    return res;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Unlock: verify the submitted hash against the stored one SERVER-side and
 * issue the unlock session cookie. Never trusted client-side anymore.
 */
export async function POST(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const hash = typeof body.hash === "string" ? body.hash.trim() : "";
    const row = await queryOne("SELECT app_password_hash FROM settings WHERE id = 1");
    const stored = (row?.app_password_hash as string) || "";
    if (!stored) {
      return NextResponse.json({ success: false, error: "No lock password is set" }, { status: 400 });
    }
    if (!hash || hash !== stored) {
      console.warn("[api/password] Failed unlock attempt (wrong password)");
      return NextResponse.json({ success: false, error: "Incorrect password" }, { status: 401 });
    }
    const res = NextResponse.json({ success: true });
    await issueUnlockCookie(res);
    console.log("[api/password] Unlock successful — session cookie issued");
    return res;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** Lock: revoke the unlock session cookie for this browser. */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  return clearUnlockCookie(res);
}
