import crypto from "crypto";
import { queryOne, execute } from "@/lib/db";

// AES-256-GCM encrypted secret envelope, stored as:
//   "AESGCM:<iv b64>:<tag b64>:<data b64>"
const PREFIX = "AESGCM:";

/** Derive a 256-bit key from a master secret. Namespaced ("enc:") so the
 *  encryption key stays distinct from other uses of the same stored secret
 *  (e.g. the unlock cookie HMAC), avoiding key reuse. */
function deriveKey(master: string): Buffer {
  return crypto.createHash("sha256").update(`enc:${master}`).digest();
}

/**
 * Resolve the application encryption key.
 *  - Prefers `APP_ENCRYPTION_KEY` when set (stable across machines);
 *  - otherwise derives a stable key from the persisted `settings.auth_secret`
 *    (which survives restarts), creating + persisting one if absent.
 */
export async function getEncryptionKey(): Promise<Buffer> {
  if (process.env.APP_ENCRYPTION_KEY) {
    return crypto.createHash("sha256").update(process.env.APP_ENCRYPTION_KEY).digest();
  }
  const row = await queryOne<{ auth_secret: string }>("SELECT auth_secret FROM settings WHERE id = 1");
  const secret = row?.auth_secret || "";
  if (secret) return deriveKey(secret);
  const generated = crypto.randomBytes(32).toString("hex");
  await execute("UPDATE settings SET auth_secret = ? WHERE id = 1", [generated]);
  return deriveKey(generated);
}

/** True when a value is an encrypted envelope (not plaintext). */
export function isEncryptedSecret(value: string): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/**
 * Encrypt a plaintext value. Idempotent: an already-encrypted value is returned
 * unchanged, so a PUT that echoes back a GET response never double-encrypts.
 */
export async function encryptSecret(plain: string): Promise<string> {
  if (!plain) return plain;
  if (isEncryptedSecret(plain)) return plain;
  const key = await getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/**
 * Decrypt an encrypted value. Legacy plaintext (or a corrupt/unsupported
 * envelope) is returned unchanged for backward compatibility, so existing DBs
 * stay readable after enabling encryption.
 */
export async function decryptSecret(value: string): Promise<string> {
  if (!value) return value;
  if (!isEncryptedSecret(value)) return value;
  try {
    const key = await getEncryptionKey();
    const body = value.slice(PREFIX.length);
    const [ivB64, tagB64, dataB64] = body.split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return dec.toString("utf8");
  } catch (err) {
    console.warn(`[secrets] Failed to decrypt stored secret — returning raw value (${(err as Error)?.message})`);
    return value;
  }
}

/** Mask a secret for export/display. */
export function maskSecret(value: string): string {
  return value ? "••••••••" : "";
}
