import { NextRequest, NextResponse } from "next/server";
import { UNLOCK_COOKIE, LOCK_FLAG_COOKIE } from "@/lib/auth-constants";

/**
 * Page-level lock enforcement (UX hardening layer).
 *
 * The AUTHORITATIVE enforcement is server-side in every database-backed API
 * route (requireUnlock in src/lib/auth.ts), which cryptographically verifies
 * the unlock cookie before any data is sent — this middleware cannot do that
 * on the edge runtime (no DB access), so it only provides the visible
 * behavior: while a password is configured and this browser has not unlocked,
 * every page (/, /library, /dashboard, /prompts, ...) is redirected back to
 * "/" where the password gate is shown. API paths pass through here and are
 * rejected with 401 by the routes themselves.
 *
 * The gate state is driven by two cookies set by /api/password:
 *  - ai_studio_lock_enabled=1  -> a lock password is configured
 *  - ai_studio_unlock=<hmac>   -> this browser session is unlocked (httpOnly)
 */
export function middleware(request: NextRequest) {
  const lockEnabled = request.cookies.get(LOCK_FLAG_COOKIE)?.value === "1";
  const unlocked = !!request.cookies.get(UNLOCK_COOKIE)?.value;
  if (!lockEnabled || unlocked) return NextResponse.next();

  const { pathname } = request.nextUrl;
  // "/" hosts the password gate itself; API routes enforce themselves.
  if (pathname === "/" || pathname.startsWith("/api/")) return NextResponse.next();

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  // All pages + API, excluding static assets.
  matcher: ["/((?!_next/|icon.png|icon.ico|favicon.ico|Pictures/|AIStudio.png).*)"],
};
