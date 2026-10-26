/**
 * Focused tests for the AES-256-GCM secret helper (src/lib/secrets.ts).
 *
 * A fixed APP_ENCRYPTION_KEY short-circuits getEncryptionKey so these tests
 * never touch the database — they cover encrypt/decrypt round-trip, idempotent
 * re-encryption, legacy-plaintext compatibility, masking, and tamper detection.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { encryptSecret, decryptSecret, isEncryptedSecret, maskSecret } from "@/lib/secrets";

process.env.APP_ENCRYPTION_KEY = "test-key-for-encryption";

test("encryptSecret encrypts plaintext and decryptSecret round-trips", async () => {
  const plain = "sk-test-12345";
  const enc = await encryptSecret(plain);
  assert.ok(isEncryptedSecret(enc));
  assert.notEqual(enc, plain);
  const dec = await decryptSecret(enc);
  assert.equal(dec, plain);
});

test("encryptSecret is idempotent for already-encrypted values", async () => {
  const enc1 = await encryptSecret("sk-abcd-efgh");
  const enc2 = await encryptSecret(enc1);
  assert.equal(enc2, enc1);
});

test("decryptSecret returns legacy plaintext unchanged (backward compatibility)", async () => {
  assert.equal(await decryptSecret("sk-legacy-plaintext"), "sk-legacy-plaintext");
  assert.equal(await decryptSecret(""), "");
});

test("encryptSecret returns empty value as-is (no envelope)", async () => {
  assert.equal(await encryptSecret(""), "");
});

test("maskSecret masks non-empty values and keeps empty ones", () => {
  assert.equal(maskSecret("anything"), "••••••••");
  assert.equal(maskSecret(""), "");
});

test("tampered ciphertext fails to decrypt and fails open to the raw value", async () => {
  const enc = await encryptSecret("sk-sensitive");
  const parts = enc.split(":");
  parts[parts.length - 1] = Buffer.from("corrupted").toString("base64");
  const tampered = parts.join(":");
  const dec = await decryptSecret(tampered);
  assert.equal(dec, tampered);
});
