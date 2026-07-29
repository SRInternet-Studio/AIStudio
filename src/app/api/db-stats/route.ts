import { NextResponse } from "next/server";
import { getDb, queryAll, queryOne } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const db = await getDb();
    const DB_PATH = path.join(process.cwd(), "data", "ai-studio.db");

    // Get database file size
    let dbSize = 0;
    try {
      const stats = fs.statSync(DB_PATH);
      dbSize = stats.size;
    } catch {}

    // Get counts from each table
    const conversations = await queryOne("SELECT COUNT(*) as count FROM conversations");
    const messages = await queryOne("SELECT COUNT(*) as count FROM messages");
    const blocks = await queryOne("SELECT COUNT(*) as count FROM blocks");
    const templates = await queryOne("SELECT COUNT(*) as count FROM system_templates");
    const apiConfigs = await queryOne("SELECT COUNT(*) as count FROM api_configs");

    const tables = [
      { name: "conversations", count: conversations?.count || 0, size_estimate: "~" + ((conversations?.count || 0) * 0.3).toFixed(1) + " KB" },
      { name: "messages", count: messages?.count || 0, size_estimate: "~" + ((messages?.count || 0) * 0.2).toFixed(1) + " KB" },
      { name: "blocks", count: blocks?.count || 0, size_estimate: "~" + ((blocks?.count || 0) * 0.5).toFixed(1) + " KB" },
      { name: "system_templates", count: templates?.count || 0, size_estimate: "~" + ((templates?.count || 0) * 0.2).toFixed(1) + " KB" },
      { name: "api_configs", count: apiConfigs?.count || 0, size_estimate: "~" + ((apiConfigs?.count || 0) * 0.3).toFixed(1) + " KB" },
      { name: "usage_stats", count: 0, size_estimate: "~0 KB" },
    ];

    try {
      const usageCount = await queryOne("SELECT COUNT(*) as count FROM usage_stats");
      tables[5].count = usageCount?.count || 0;
      tables[5].size_estimate = "~" + ((usageCount?.count || 0) * 0.2).toFixed(1) + " KB";
    } catch {}

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    return NextResponse.json({
      success: true,
      data: {
        db_size: dbSize,
        db_size_formatted: formatSize(dbSize),
        total_conversations: conversations?.count || 0,
        total_messages: messages?.count || 0,
        total_blocks: blocks?.count || 0,
        total_templates: templates?.count || 0,
        total_api_configs: apiConfigs?.count || 0,
        tables,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
