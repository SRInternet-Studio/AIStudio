import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUnlock } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import type { InStatement } from "@libsql/client";

export const dynamic = "force-dynamic";
// Allow long-running bulk imports (tens of thousands of chunks).
export const maxDuration = 300;

interface ImportChunk {
  text?: string;
  driveImage?: { id: string };
  driveDocument?: { id: string };
  inlineImage?: { mimeType?: string; data?: string };
  role: "user" | "model";
  tokenCount?: number;
  isThought?: boolean;
  createTime?: string;
}

/**
 * POST /api/conversations/import
 *
 * Server-side bulk import of a Google AI Studio context file. Everything is inserted in
 * batched transactions so that files with tens of thousands of chunks import completely
 * (the previous client-side one-request-per-chunk loop silently lost most messages).
 *
 * Fixes:
 *  - Thinking chunks become ONLY a thinking block (no duplicate text block).
 *  - created_at uses each chunk's original createTime instead of import time.
 *  - token_count is persisted per message from the chunk tokenCount.
 *  - ALL chunks are imported (no empty-content rejection, no per-request bottleneck).
 *  - inlineImage chunks (base64 JPEG/PNG payloads) are persisted as image blocks
 *    with a data URL, so imported conversations keep their images instead of
 *    silently dropping megabytes of content.
 */
export async function POST(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    const db = await getDb();
    const body = await request.json();
    const { title, model, chunks } = body as {
      title?: string;
      model?: string;
      chunks?: ImportChunk[];
    };

    const chunkList = Array.isArray(chunks) ? chunks : [];
    console.log("[api/import] Starting import:", { title, model, totalChunks: chunkList.length });

    const convId = uuidv4();
    const nowIso = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO conversations (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      args: [convId, title || "Imported Context", model || "gpt-4o", nowIso, nowIso],
    });

    // --- Group consecutive same-role chunks into a single message (one "turn") ---
    // A model turn is typically [thought chunk, answer chunk]; grouping them yields a
    // single assistant message with a thinking block + text block, exactly like a
    // live-generated message, which also removes the duplicate-thinking rendering.
    interface BuiltBlock { type: "text" | "thinking" | "image"; content: string; }
    interface BuiltMessage {
      id: string;
      role: "user" | "assistant";
      position: number;
      createdAt: string;
      tokenCount: number;
      blocks: BuiltBlock[];
    }

    const builtMessages: BuiltMessage[] = [];
    let position = 0;
    let current: BuiltMessage | null = null;
    let currentRole: "user" | "assistant" | null = null;

    for (const chunk of chunkList) {
      const role: "user" | "assistant" = chunk.role === "model" ? "assistant" : "user";

      // Determine this chunk's block (skip empties)
      let block: BuiltBlock | null = null;
      if (chunk.driveImage?.id) {
        block = { type: "image", content: chunk.driveImage.id };
      } else if (chunk.inlineImage?.data) {
        // Base64 image payload — persist it as a data URL so nothing is lost.
        const mime = chunk.inlineImage.mimeType || "image/jpeg";
        block = { type: "image", content: `data:${mime};base64,${chunk.inlineImage.data}` };
      } else if (chunk.driveDocument?.id) {
        // Only the Drive document id is available; keep it as a reference block.
        block = { type: "image", content: chunk.driveDocument.id };
      } else if (typeof chunk.text === "string" && chunk.text.length > 0) {
        block = { type: chunk.isThought ? "thinking" : "text", content: chunk.text };
      }
      if (!block) continue; // nothing renderable in this chunk

      if (!current || currentRole !== role) {
        current = {
          id: uuidv4(),
          role,
          position: position++,
          createdAt: chunk.createTime || nowIso,
          tokenCount: 0,
          blocks: [],
        };
        currentRole = role;
        builtMessages.push(current);
      }

      current.blocks.push(block);
      current.tokenCount += chunk.tokenCount || 0;
    }

    console.log("[api/import] Grouped into", builtMessages.length, "messages");

    // --- Build all INSERT statements and run them in batched transactions ---
    const statements: InStatement[] = [];
    let blockCount = 0;
    for (const msg of builtMessages) {
      statements.push({
        sql: `INSERT INTO messages (id, conversation_id, role, position, token_count, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [msg.id, convId, msg.role, msg.position, msg.tokenCount, msg.createdAt],
      });
      let blockPos = 0;
      for (const b of msg.blocks) {
        statements.push({
          sql: `INSERT INTO blocks (id, message_id, type, content, position, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)`,
          args: [uuidv4(), msg.id, b.type, b.content, blockPos++, msg.createdAt],
        });
        blockCount++;
      }
    }

    // libsql batch runs in a single transaction; slice to keep each batch a sane size.
    const BATCH_SIZE = 500;
    for (let i = 0; i < statements.length; i += BATCH_SIZE) {
      const slice = statements.slice(i, i + BATCH_SIZE);
      await db.batch(slice, "write");
      console.log("[api/import] Committed batch", i / BATCH_SIZE + 1, "statements:", slice.length);
    }

    // Force a WAL checkpoint so the main db file size reflects the import immediately.
    try {
      await db.execute("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch {
      // ignore checkpoint failures
    }

    const conv = await db.execute({ sql: "SELECT * FROM conversations WHERE id = ?", args: [convId] });
    console.log("[api/import] Import complete:", { messages: builtMessages.length, blocks: blockCount });

    return NextResponse.json({
      success: true,
      data: {
        conversation: conv.rows[0],
        messageCount: builtMessages.length,
        blockCount,
        chunkCount: chunkList.length,
      },
    });
  } catch (error: any) {
    console.error("[api/import] Error:", error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || "Import failed" }, { status: 500 });
  }
}
