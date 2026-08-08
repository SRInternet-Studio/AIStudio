import { NextRequest, NextResponse } from "next/server";
import { getDb, queryAll, queryOne } from "@/lib/db";
import { requireUnlock } from "@/lib/auth";
import fs from "fs";
import path from "path";

// Must stay dynamic: this endpoint reports live on-disk sizes and row counts.
// Without this flag Next.js prerenders it at build time and serves stale numbers.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const DB_PATH = path.join(process.cwd(), "data", "ai-studio.db");

    // Issue 7: unify DB size with the Database Content tab (/api/db-path), which reports the
    // physical size of the main ai-studio.db file via fs.statSync and is confirmed correct.
    // Previously this endpoint reported a LOGICAL page-accounting size which diverged from the
    // actual on-disk file. We now report the main .db physical file size as the canonical size.
    let logicalSize = 0;
    let mainFileSize = 0;
    let physicalSize = 0;
    try {
      const pageSizeRow = await queryOne("PRAGMA page_size");
      const pageCountRow = await queryOne("PRAGMA page_count");
      const freelistRow = await queryOne("PRAGMA freelist_count");
      const pageSize = Number(pageSizeRow?.page_size) || 4096;
      const pageCount = Number(pageCountRow?.page_count) || 0;
      const freelist = Number(freelistRow?.freelist_count) || 0;
      logicalSize = Math.max(0, (pageCount - freelist) * pageSize);
      console.log("[api/db-stats] page accounting (logical only):", { pageSize, pageCount, freelist, logicalSize });
    } catch (e: any) {
      console.warn("[api/db-stats] page pragma failed:", e?.message);
    }

    // Physical main-file size = the canonical Database Size (matches Database Content tab).
    try {
      mainFileSize = fs.statSync(DB_PATH).size;
    } catch { /* file may not exist yet */ }

    // Total on-disk footprint (db + WAL + SHM) as a reference figure.
    try {
      for (const suffix of ["", "-wal", "-shm"]) {
        try {
          physicalSize += fs.statSync(DB_PATH + suffix).size;
        } catch { /* file may not exist */ }
      }
    } catch {}

    const dbSize = mainFileSize;
    console.log("[api/db-stats] sizes:", { dbSize, logicalSize, physicalSize });

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
      { name: "message_embeddings", count: 0, size_estimate: "~0 KB" },
    ];

    try {
      const usageCount = await queryOne("SELECT COUNT(*) as count FROM usage_stats");
      tables[5].count = usageCount?.count || 0;
      tables[5].size_estimate = "~" + ((usageCount?.count || 0) * 0.2).toFixed(1) + " KB";
    } catch {}

    try {
      const embCount = await queryOne("SELECT COUNT(*) as count FROM message_embeddings");
      // Embedding rows carry full vectors serialized as JSON, so estimate larger per row.
      tables[6].count = embCount?.count || 0;
      tables[6].size_estimate = "~" + ((embCount?.count || 0) * 8).toFixed(1) + " KB";
    } catch {}

    // Use the same formatter as /api/db-path so both tabs display identical size strings.
    const formatSize = (bytes: number) => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return NextResponse.json({
      success: true,
      data: {
        db_size: dbSize,
        db_size_formatted: formatSize(dbSize),
        logical_size: logicalSize,
        logical_size_formatted: formatSize(logicalSize),
        physical_size: physicalSize,
        physical_size_formatted: formatSize(physicalSize),
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
