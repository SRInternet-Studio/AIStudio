import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "ai-studio.db");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download");

    if (download === "true") {
      // Serve the database file for download
      if (!fs.existsSync(DB_PATH)) {
        return NextResponse.json({ success: false, error: "Database file not found" }, { status: 404 });
      }
      const fileBuffer = fs.readFileSync(DB_PATH);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="ai-studio.db"`,
        },
      });
    }

    // Return file info
    const exists = fs.existsSync(DB_PATH);
    const stats = exists ? fs.statSync(DB_PATH) : null;

    return NextResponse.json({
      success: true,
      data: {
        path: DB_PATH,
        dir: DB_DIR,
        exists,
        size: stats?.size || 0,
        sizeFormatted: stats ? formatBytes(stats.size) : "N/A",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
