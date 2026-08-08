import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { UNLOCK_COOKIE } from "@/lib/auth-constants";

/**
 * Server-side unlock session for the app lock password.
 *
 * The old design verified the password purely in the browser (sessionStorage),
 * so every /api/* route stayed reachable without any password — directly
 * hitting /api/db-content exposed the whole database. Now:
 *
 *  - Unlocking (POST /api/password) verifies the hash SERVER-side and issues
 *    an httpOnly session cookie whose value is an HMAC computed with a secret
 *    persisted in the DB (settings.auth_secret), so it survives server
 *    restarts but dies with the browser session.
 *  - Every database-backed API route calls requireUnlock() first; while a
 *    password is set and the cookie is missing/invalid the request is
 *    rejected with 401 BEFORE any data leaves the server.
 *  - When no password is configured everything stays open (no cookie needed).
 */

const TOKEN_PAYLOAD = "ai-studio-unlock:v1";

// Session cookie: no maxAge/expires -> cleared when the browser session ends.
const COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax", path: "/" } as const;

/** Load the persisted HMAC secret, generating + storing it on first use. */
async function ensureAuthSecret(current: string): Promise<string> {
  if (current) return current;
  const secret = crypto.randomBytes(32).toString("hex");
  await execute("UPDATE settings SET auth_secret = ? WHERE id = 1", [secret]);
  console.log("[auth] Generated new unlock-session secret");
  return secret;
}

export async function computeUnlockToken(secret: string): Promise<string> {
  return crypto.createHmac("sha256", secret).update(TOKEN_PAYLOAD).digest("hex");
}

/**
 * True when this request may read/write database content:
 *  - no lock password configured, OR
 *  - the unlock cookie carries a valid HMAC for the persisted secret.
 */
export async function isUnlockedRequest(request: NextRequest): Promise<boolean> {
  const row = await queryOne("SELECT app_password_hash, auth_secret FROM settings WHERE id = 1");
  const passwordHash = (row?.app_password_hash as string) || "";
  if (!passwordHash) return true; // app not locked -> no auth required

  const provided = request.cookies.get(UNLOCK_COOKIE)?.value || "";
  if (!provided) return false;

  const secret = await ensureAuthSecret((row?.auth_secret as string) || "");
  const expected = await computeUnlockToken(secret);
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Route guard: returns null when the request is allowed, otherwise a 401
 * response that the handler must return immediately (no DB data may be sent).
 * Call it at the top of every database-backed API handler, e.g.:
 *
 *   const locked = await requireUnlock(request);
 *   if (locked) return locked;
 */
export async function requireUnlock(request: NextRequest): Promise<NextResponse | null> {
  if (await isUnlockedRequest(request)) return null;
  return NextResponse.json(
    { success: false, error: "Locked: password verification required" },
    { status: 401 }
  );
}

/** Attach a freshly minted unlock cookie to the response (successful unlock). */
export async function issueUnlockCookie(response: NextResponse): Promise<NextResponse> {
  const row = await queryOne("SELECT auth_secret FROM settings WHERE id = 1");
  const secret = await ensureAuthSecret((row?.auth_secret as string) || "");
  const token = await computeUnlockToken(secret);
  response.cookies.set(UNLOCK_COOKIE, token, COOKIE_OPTIONS);
  return response;
}

/** Revoke the unlock cookie (manual lock, password cleared, data wiped). */
export function clearUnlockCookie(response: NextResponse): NextResponse {
  response.cookies.set(UNLOCK_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
