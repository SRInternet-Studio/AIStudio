import { createClient } from "@libsql/client";
import type { Client } from "@libsql/client";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "ai-studio.db");

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Client;

export async function getDb(): Promise<Client> {
  if (db) return db;

  db = createClient({
    url: `file:${DB_PATH}`,
  });

  // Initialize tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      base_url TEXT DEFAULT '',
      api_key TEXT DEFAULT '',
      api_protocol TEXT DEFAULT 'openai',
      selected_model TEXT DEFAULT 'gpt-4o',
      system_instructions TEXT DEFAULT '',
      temperature REAL DEFAULT 1,
      thinking_level TEXT DEFAULT 'minimal',
      tools_config TEXT DEFAULT '{"structured_outputs":false,"code_execution":false,"function_calling":false,"grounding_google_search":false,"grounding_google_maps":false,"url_context":false}',
      top_p REAL DEFAULT 0.95,
      top_k INTEGER DEFAULT 64,
      max_output_tokens INTEGER DEFAULT 65536,
      safety_settings TEXT DEFAULT '[{"type":"harassment","threshold":"block_none"},{"type":"hate_speech","threshold":"block_none"},{"type":"sexually_explicit","threshold":"block_none"},{"type":"dangerous_content","threshold":"block_none"}]',
      proxy_url TEXT DEFAULT '',
      updated_at TEXT DEFAULT ''
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT 'New Conversation',
      parent_conversation_id TEXT,
      branch_from_message_id TEXT,
      model TEXT DEFAULT 'gpt-4o',
      created_at TEXT DEFAULT '',
      updated_at TEXT DEFAULT ''
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      parent_message_id TEXT,
      role TEXT NOT NULL,
      position INTEGER NOT NULL,
      token_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT ''
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT DEFAULT '',
      position INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT ''
    )
  `);

  // System instruction templates table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS system_templates (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT 'Untitled',
      content TEXT DEFAULT '',
      created_at TEXT DEFAULT '',
      updated_at TEXT DEFAULT ''
    )
  `);

  // API configs table (for Dashboard)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS api_configs (
      id TEXT PRIMARY KEY,
      base_url TEXT NOT NULL DEFAULT '',
      api_key TEXT NOT NULL DEFAULT '',
      label TEXT DEFAULT '',
      protocol TEXT DEFAULT 'openai',
      model TEXT DEFAULT '',
      last_used_at TEXT DEFAULT '',
      created_at TEXT DEFAULT '',
      updated_at TEXT DEFAULT ''
    )
  `);

  // Usage stats table (for Dashboard)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usage_stats (
      id TEXT PRIMARY KEY,
      api_config_id TEXT DEFAULT '',
      model TEXT DEFAULT '',
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      request_count INTEGER DEFAULT 0,
      conversation_count INTEGER DEFAULT 0,
      date TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    )
  `);

  // Custom models table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_models (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT '',
      description TEXT DEFAULT '',
      context_window INTEGER DEFAULT 800000,
      category TEXT DEFAULT 'Custom',
      created_at TEXT DEFAULT ''
    )
  `);

  // RAG vector store: embeddings of message chunks, keyed by message + embedding model.
  // Vectors are stored as JSON float arrays; retrieval is brute-force cosine similarity
  // scoped to one conversation (chat-history scale, no ANN index needed).
  await db.execute(`
    CREATE TABLE IF NOT EXISTS message_embeddings (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      model TEXT NOT NULL,
      chunk_index INTEGER DEFAULT 0,
      content_hash TEXT NOT NULL,
      content TEXT NOT NULL,
      role TEXT DEFAULT '',
      position INTEGER DEFAULT 0,
      vector TEXT NOT NULL,
      created_at TEXT DEFAULT ''
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_blocks_message ON blocks(message_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_conversations_parent ON conversations(parent_conversation_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_api_configs_base_url ON api_configs(base_url)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_conversation ON message_embeddings(conversation_id, model)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_embeddings_message ON message_embeddings(message_id)`);

  // Ensure default settings row exists
  const existing = await db.execute("SELECT id FROM settings WHERE id = 1");
  if (existing.rows.length === 0) {
    await db.execute("INSERT INTO settings (id, updated_at) VALUES (1, datetime('now'))");
  }

  // ===== Schema migrations =====
  // Every ALTER is driven by the COLUMN_MIGRATIONS table below and guarded by
  // a PRAGMA table_info existence check, so only the changes the current
  // schema actually needs are executed (no repeated/no-op ALTERs). Failures
  // are NEVER swallowed: they produce a detailed [db] MIGRATION FAILED log
  // (step, SQL, cause, where to look) and rethrow, so the failing request
  // surfaces a 500 instead of running on a broken schema.
  await runMigrations(db);

  return db;
}

/** Check the live schema: does `table` already have `column`? */
async function columnExists(client: Client, table: string, column: string): Promise<boolean> {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  return info.rows.some((r: any) => r.name === column);
}

interface ColumnMigration {
  table: string;
  column: string;
  sql: string;
  /** Why this column exists — shown in the failure log for quick triage. */
  note: string;
}

/**
 * Current migration status (all guarded, applied at most once each):
 *  - settings.proxy_url                 — per-deployment HTTP(S) proxy
 *  - messages.token_count               — persisted per-message token usage
 *  - messages.input_tokens / output_tokens / thought_tokens
 *                                       — exact In/Out/Think split for the UI
 *  - settings.structured_output_schema  — Structured outputs (Issue 8)
 *  - settings.function_declarations     — Function calling (Issue 9)
 *  - settings.stop_sequences            — Safety Settings stop words
 *  - settings.rag_enabled / rag_provider / rag_embedding_model / rag_top_k
 *                                       — RAG long-term memory config
 *  - settings.app_password_hash         — shared server-side lock password
 *  - settings.auth_secret               — HMAC secret for unlock session cookies
 */
const COLUMN_MIGRATIONS: ColumnMigration[] = [
  { table: "settings", column: "proxy_url", note: "HTTP(S) proxy for outbound API calls",
    sql: "ALTER TABLE settings ADD COLUMN proxy_url TEXT DEFAULT ''" },
  { table: "messages", column: "token_count", note: "persist per-message token usage (e.g. imported context)",
    sql: "ALTER TABLE messages ADD COLUMN token_count INTEGER DEFAULT 0" },
  { table: "messages", column: "input_tokens", note: "per-turn token breakdown (input)",
    sql: "ALTER TABLE messages ADD COLUMN input_tokens INTEGER DEFAULT 0" },
  { table: "messages", column: "output_tokens", note: "per-turn token breakdown (output)",
    sql: "ALTER TABLE messages ADD COLUMN output_tokens INTEGER DEFAULT 0" },
  { table: "messages", column: "thought_tokens", note: "per-turn token breakdown (thinking)",
    sql: "ALTER TABLE messages ADD COLUMN thought_tokens INTEGER DEFAULT 0" },
  { table: "settings", column: "structured_output_schema", note: "Issue 8: raw JSON schema for Structured outputs",
    sql: "ALTER TABLE settings ADD COLUMN structured_output_schema TEXT DEFAULT ''" },
  { table: "settings", column: "function_declarations", note: "Issue 9: raw JSON array for Function calling",
    sql: "ALTER TABLE settings ADD COLUMN function_declarations TEXT DEFAULT ''" },
  { table: "settings", column: "stop_sequences", note: "Safety Settings: JSON array of stop words",
    sql: "ALTER TABLE settings ADD COLUMN stop_sequences TEXT DEFAULT '[]'" },
  { table: "settings", column: "rag_enabled", note: "RAG long-term memory toggle (1 = on)",
    sql: "ALTER TABLE settings ADD COLUMN rag_enabled INTEGER DEFAULT 1" },
  { table: "settings", column: "rag_provider", note: "RAG embedding provider: 'api' or 'local'",
    sql: "ALTER TABLE settings ADD COLUMN rag_provider TEXT DEFAULT 'api'" },
  { table: "settings", column: "rag_embedding_model", note: "RAG embedding model override (empty = default)",
    sql: "ALTER TABLE settings ADD COLUMN rag_embedding_model TEXT DEFAULT ''" },
  { table: "settings", column: "rag_top_k", note: "RAG: number of retrieved memory chunks",
    sql: "ALTER TABLE settings ADD COLUMN rag_top_k INTEGER DEFAULT 5" },
  { table: "settings", column: "app_password_hash", note: "server-side app lock password (shared by all devices)",
    sql: "ALTER TABLE settings ADD COLUMN app_password_hash TEXT DEFAULT ''" },
  { table: "settings", column: "auth_secret", note: "HMAC secret signing unlock-session cookies (src/lib/auth.ts)",
    sql: "ALTER TABLE settings ADD COLUMN auth_secret TEXT DEFAULT ''" },
  { table: "settings", column: "media_resolution", note: "Gemini 3+ per-part media resolution level capping media token cost",
    sql: "ALTER TABLE settings ADD COLUMN media_resolution TEXT DEFAULT 'unspecified'" },
  { table: "settings", column: "max_context_tokens", note: "user cap on prompt context tokens (0 = model default); engages sliding window + RAG to bound per-message cost",
    sql: "ALTER TABLE settings ADD COLUMN max_context_tokens INTEGER DEFAULT 0" },
];

async function runMigrations(client: Client): Promise<void> {
  for (const mig of COLUMN_MIGRATIONS) {
    try {
      if (await columnExists(client, mig.table, mig.column)) {
        continue; // already applied — skip, no repeated ALTER
      }
      await client.execute(mig.sql);
      console.log(`[db] Migration applied: ${mig.table}.${mig.column}`);
    } catch (err: any) {
      console.error("[db] ==================== MIGRATION FAILED ====================");
      console.error(`[db]   step:   ALTER TABLE ${mig.table} ADD COLUMN ${mig.column}`);
      console.error(`[db]   sql:    ${mig.sql}`);
      console.error(`[db]   purpose: ${mig.note}`);
      console.error(`[db]   cause:  ${err?.message || String(err)}`);
      console.error(`[db]   locate: src/lib/db.ts -> COLUMN_MIGRATIONS / runMigrations`);
      console.error(`[db]   hint:   inspect the live schema with "PRAGMA table_info(${mig.table})" on ${DB_PATH}`);
      console.error("[db] ============================================================");
      throw err; // never run on a half-migrated schema — surface the failure
    }
  }
}

// Helper: get single row
export async function queryOne(sql: string, params: any[] = []): Promise<any | null> {
  const db = await getDb();
  const result = await db.execute({ sql, args: params });
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Helper: get all rows
export async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  const db = await getDb();
  const result = await db.execute({ sql, args: params });
  return result.rows;
}

// Helper: execute without returning results
export async function execute(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  await db.execute({ sql, args: params });
}
