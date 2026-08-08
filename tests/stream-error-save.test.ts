/**
 * Focused test: partial-content save on stream errors.
 *
 * Mirrors the streaming catch path of /api/chat: when the upstream stream
 * dies mid-generation, whatever was already generated (billed tokens) must
 * be persisted exactly once, and a stream that produced nothing must not
 * leave an empty assistant message behind.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import {
  persistAssistantMessage,
  hasPersistableContent,
  type DbAdapter,
} from "@/lib/chat-persistence";

let tmpDir: string;
let client: Client;
let db: DbAdapter;

function makeAdapter(c: Client): DbAdapter {
  return {
    queryOne: async (sql, params = []) => {
      const r = await c.execute({ sql, args: params });
      return r.rows.length > 0 ? r.rows[0] : null;
    },
    execute: async (sql, params = []) => {
      await c.execute({ sql, args: params });
    },
  };
}

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aistudio-test-stream-"));
  client = createClient({ url: `file:${path.join(tmpDir, "test.db")}` });
  await client.execute(
    "CREATE TABLE messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL, position INTEGER NOT NULL, created_at TEXT DEFAULT '')"
  );
  await client.execute(
    "CREATE TABLE blocks (id TEXT PRIMARY KEY, message_id TEXT NOT NULL, type TEXT NOT NULL, content TEXT DEFAULT '', position INTEGER NOT NULL, is_deleted INTEGER DEFAULT 0, created_at TEXT DEFAULT '')"
  );
  db = makeAdapter(client);
});

after(async () => {
  await client.close();
  // On Windows the libsql file handle can take a moment to release; retry.
  for (let i = 0; i < 5; i++) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

const NOW = "2026-08-08T00:00:00.000Z";

/** The exact guard used by the chat route's stream-error catch path. */
function streamErrorSaveCondition(fullText: string, fullThinking: string): boolean {
  return hasPersistableContent(fullText, fullThinking);
}

test("partial text generated before a stream error is persisted", async () => {
  const fullText = "Here is a partial answer that was cut off mid-stre";
  assert.equal(streamErrorSaveCondition(fullText, ""), true);

  const stored = await persistAssistantMessage(db, {
    conversationId: "conv-s",
    messageId: "s-1",
    position: 2,
    regeneratePosition: null,
    text: fullText,
    thinking: "",
    toolResults: [],
    now: NOW,
  });
  assert.equal(stored, true);

  const block = await db.queryOne(
    "SELECT content FROM blocks WHERE message_id = ? AND type = 'text'",
    ["s-1"]
  );
  assert.equal(block.content, fullText); // partial reply survives the reload
});

test("thinking-only partial output is also persisted", async () => {
  assert.equal(streamErrorSaveCondition("", "some reasoning before the crash"), true);
});

test("empty stream produces no message (nothing generated, nothing saved)", async () => {
  assert.equal(streamErrorSaveCondition("", ""), false);

  // The route's catch path skips persistAssistantMessage entirely here.
  const count = await db.queryOne(
    "SELECT COUNT(*) AS cnt FROM messages WHERE conversation_id = ?",
    ["conv-s"]
  );
  assert.equal(Number(count.cnt), 1); // only the s-1 message from the first test
});

test("error path after completion path does not duplicate (same messageId)", async () => {
  // Completion path stores first...
  await persistAssistantMessage(db, {
    conversationId: "conv-d",
    messageId: "d-1",
    position: 2,
    regeneratePosition: null,
    text: "Full answer",
    now: NOW,
  });
  // ...then a late/erroneous error-path call arrives for the same message.
  const again = await persistAssistantMessage(db, {
    conversationId: "conv-d",
    messageId: "d-1",
    position: 2,
    regeneratePosition: null,
    text: "Full answer",
    now: NOW,
  });
  assert.equal(again, false);

  const count = await db.queryOne(
    "SELECT COUNT(*) AS cnt FROM messages WHERE conversation_id = ?",
    ["conv-d"]
  );
  assert.equal(Number(count.cnt), 1);
});
