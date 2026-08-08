/**
 * Cookie names shared between the edge middleware (src/middleware.ts) and the
 * Node-side auth helpers (src/lib/auth.ts). Keep this file dependency-free so
 * it is safe in both runtimes.
 */

/** httpOnly session cookie proving the browser passed the password gate. */
export const UNLOCK_COOKIE = "ai_studio_unlock";

/**
 * Marker cookie telling the middleware that a lock password is configured.
 * Without it the middleware cannot tell "no password set" from "locked",
 * and would redirect everyone on every deployment that never set a password.
 */
export const LOCK_FLAG_COOKIE = "ai_studio_lock_enabled";
