import { NextResponse } from "next/server";
import { getDb, execute } from "@/lib/db";
import { deleteAllEmbeddings } from "@/lib/rag";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    console.log("[clear-all] Starting clear all data operation...");
    await getDb();

    // Delete all data from all tables in correct order (respecting foreign keys)
    await execute("DELETE FROM blocks");
    console.log("[clear-all] Deleted blocks");

    await execute("DELETE FROM messages");
    console.log("[clear-all] Deleted messages");

    await execute("DELETE FROM conversations");
    console.log("[clear-all] Deleted conversations");

    await execute("DELETE FROM usage_stats");
    console.log("[clear-all] Deleted usage_stats");

    await execute("DELETE FROM api_configs");
    console.log("[clear-all] Deleted api_configs");

    await execute("DELETE FROM custom_models");
    console.log("[clear-all] Deleted custom_models");

    await execute("DELETE FROM system_templates");
    console.log("[clear-all] Deleted system_templates");

    await deleteAllEmbeddings();
    console.log("[clear-all] Deleted message_embeddings (RAG vector store)");

    // Reset settings to defaults (don't delete the settings row, just reset it).
    // Must cover EVERY settings column — new columns added by migrations were
    // previously left behind with stale values after a full clear.
    await execute(`UPDATE settings SET
      base_url = '', api_key = '', api_protocol = 'openai', selected_model = 'gpt-4o',
      system_instructions = '', temperature = 1, thinking_level = 'minimal',
      tools_config = NULL, safety_settings = NULL, proxy_url = NULL,
      top_p = 0.95, top_k = 64, max_output_tokens = 65536,
      stop_sequences = '[]', structured_output_schema = '', function_declarations = '',
      rag_enabled = 1, rag_provider = 'api', rag_embedding_model = '', rag_top_k = 5,
      updated_at = datetime('now') WHERE id = 1`);
    console.log("[clear-all] Reset settings to defaults");

    console.log("[clear-all] All data cleared successfully");
    return NextResponse.json({ success: true, message: "All data cleared" });
  } catch (error: any) {
    console.error("[clear-all] Failed to clear data:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
