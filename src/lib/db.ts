import { createClient, Client } from "@libsql/client";
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

  // Migration: add proxy_url column if it doesn't exist
  try {
    await db.execute("ALTER TABLE settings ADD COLUMN proxy_url TEXT DEFAULT ''");
  } catch {
    // Column already exists, ignore
  }

  // Migration: add token_count column to messages if it doesn't exist.
  // Used to persist per-message token usage (e.g. imported context tokenCount).
  try {
    await db.execute("ALTER TABLE messages ADD COLUMN token_count INTEGER DEFAULT 0");
  } catch {
    // Column already exists, ignore
  }

  // Migration: fine-grained token breakdown per message so the UI can restore
  // the exact In/Out/Think split after reloads (token_count alone loses it).
  // assistant: input_tokens/output_tokens/thought_tokens hold the turn's usage;
  // user: input_tokens holds the prompt tokens for that turn.
  for (const col of ["input_tokens", "output_tokens", "thought_tokens"]) {
    try {
      await db.execute(`ALTER TABLE messages ADD COLUMN ${col} INTEGER DEFAULT 0`);
    } catch {
      // Column already exists, ignore
    }
  }

  // Issue 8: add structured_output_schema column (raw JSON string) for Structured outputs.
  try {
    await db.execute("ALTER TABLE settings ADD COLUMN structured_output_schema TEXT DEFAULT ''");
  } catch {
    // Column already exists, ignore
  }

  // Issue 9: add function_declarations column (raw JSON array string) for Function calling.
  try {
    await db.execute("ALTER TABLE settings ADD COLUMN function_declarations TEXT DEFAULT ''");
  } catch {
    // Column already exists, ignore
  }

  // Stop sequences (Safety Settings): JSON array of stop words persisted per settings row.
  try {
    await db.execute("ALTER TABLE settings ADD COLUMN stop_sequences TEXT DEFAULT '[]'");
  } catch {
    // Column already exists, ignore
  }

  // RAG (retrieval-augmented generation): restores sliding-window-trimmed history.
  //   rag_enabled          1 = on (default), 0 = off
  //   rag_provider         'api' = embeddings via the configured Base URL/protocol;
  //                        'local' = on-device via @huggingface/transformers
  //   rag_embedding_model  empty = per-provider default resolved at runtime
  //   rag_top_k            number of retrieved memory chunks per trimmed request
  try {
    await db.execute("ALTER TABLE settings ADD COLUMN rag_enabled INTEGER DEFAULT 1");
  } catch {
    // Column already exists, ignore
  }
  try {
    await db.execute("ALTER TABLE settings ADD COLUMN rag_provider TEXT DEFAULT 'api'");
  } catch {
    // Column already exists, ignore
  }
  try {
    await db.execute("ALTER TABLE settings ADD COLUMN rag_embedding_model TEXT DEFAULT ''");
  } catch {
    // Column already exists, ignore
  }
  try {
    await db.execute("ALTER TABLE settings ADD COLUMN rag_top_k INTEGER DEFAULT 5");
  } catch {
    // Column already exists, ignore
  }

  // App lock password: stored server-side so the lock is shared by every device
  // reaching this deployment. Previously the hash lived in browser localStorage,
  // so each device/browser saw its own (or no) password.
  try {
    await db.execute("ALTER TABLE settings ADD COLUMN app_password_hash TEXT DEFAULT ''");
  } catch {
    // Column already exists, ignore
  }

  return db;
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
