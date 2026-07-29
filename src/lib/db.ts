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
      safety_settings TEXT DEFAULT '[{"category":"HARM_CATEGORY_HARASSMENT","threshold":"OFF"},{"category":"HARM_CATEGORY_HATE_SPEECH","threshold":"OFF"},{"category":"HARM_CATEGORY_SEXUALLY_EXPLICIT","threshold":"OFF"},{"category":"HARM_CATEGORY_DANGEROUS_CONTENT","threshold":"OFF"}]',
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

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_blocks_message ON blocks(message_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_conversations_parent ON conversations(parent_conversation_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_api_configs_base_url ON api_configs(base_url)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date)`);

  // Ensure default settings row exists
  const existing = await db.execute("SELECT id FROM settings WHERE id = 1");
  if (existing.rows.length === 0) {
    await db.execute("INSERT INTO settings (id, updated_at) VALUES (1, datetime('now'))");
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
