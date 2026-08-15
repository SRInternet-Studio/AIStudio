import { NextRequest, NextResponse } from "next/server";
import { getDb, queryAll, execute, queryOne } from "@/lib/db";
import { FALLBACK_MODELS, isGoogleModel, GOOGLE_DEFAULT_CONTEXT_WINDOW } from "@/lib/models";
import { requireUnlock } from "@/lib/auth";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { v4 as uuidv4 } from "uuid";
import type { ModelInfo } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/models
 * Fetches models from Gemini API (if configured) + custom models from DB.
 * Falls back to FALLBACK_MODELS if the API call fails.
 */
export async function GET(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();

    const settingsRow = await queryOne("SELECT * FROM settings WHERE id = 1");
    const baseUrl = (settingsRow?.base_url as string) || "";
    const apiKey = (settingsRow?.api_key as string) || "";
    const proxyUrl = (settingsRow?.proxy_url as string) || "";
    const apiProtocol = (settingsRow?.api_protocol as string) || "openai";

    let dynamicModels: ModelInfo[] = [];
    let usedFallback = false;

    // Try to fetch models from Gemini API if API key is configured and protocol is gemini
    if (apiKey && (apiProtocol === "gemini" || baseUrl.includes("generativelanguage"))) {
      try {
        const resolvedBaseUrl = baseUrl || "https://generativelanguage.googleapis.com";
        const url = `${resolvedBaseUrl.replace(/\/$/, "")}/v1beta/models?key=${apiKey}`;

        const fetchOpts: RequestInit & { dispatcher?: any } = {};
        if (proxyUrl) {
          fetchOpts.dispatcher = new ProxyAgent(proxyUrl);
        }

        const response = proxyUrl
          ? await undiciFetch(url, fetchOpts as any)
          : await fetch(url);

        if (response.ok) {
          const data = await response.json();
          const models = data.models || [];

          for (const m of models) {
            // Some relays omit supportedGenerationMethods entirely — only
            // EXCLUDE models that explicitly lack generateContent support,
            // never filter on the field's mere absence (that silently
            // dropped a relay's whole 236-model catalog).
            const methods = m.supportedGenerationMethods;
            if (Array.isArray(methods) && methods.length > 0 && !methods.includes("generateContent")) continue;

            const modelId = m.baseModelId || m.name?.replace("models/", "") || "";
            if (!modelId) continue;

            const contextWindow = m.inputTokenLimit || (isGoogleModel(modelId) ? GOOGLE_DEFAULT_CONTEXT_WINDOW : 128_000);

            dynamicModels.push({
              id: modelId,
              displayName: m.displayName || modelId,
              description: m.description || "",
              category: modelId.startsWith("gemini-") ? "Gemini" : modelId.startsWith("gemma-") ? "Gemma" : "All",
              contextWindow,
            });
          }

          console.log(`[models/api] Fetched ${dynamicModels.length} models from Gemini API`);
        } else {
          console.warn("[models/api] Gemini API returned", response.status, "- using fallback");
          usedFallback = true;
        }
      } catch (err: any) {
        console.warn("[models/api] Failed to fetch from Gemini API:", err.message, "- using fallback");
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }

    // If dynamic fetch failed or returned empty, use fallback
    if (dynamicModels.length === 0) {
      dynamicModels = [...FALLBACK_MODELS];
    }

    // Get custom models from DB
    const customRows = await queryAll("SELECT * FROM custom_models ORDER BY created_at DESC");
    const customModels: ModelInfo[] = customRows.map((row: any) => ({
      id: row.id as string,
      displayName: row.display_name as string,
      description: row.description as string,
      category: (row.category as string) || "Custom",
      contextWindow: (row.context_window as number) || 800_000,
    }));

    // Merge: dynamic models first, then custom models (skip duplicates by id)
    const seenIds = new Set(dynamicModels.map((m) => m.id));
    for (const cm of customModels) {
      if (!seenIds.has(cm.id)) {
        dynamicModels.push(cm);
        seenIds.add(cm.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: dynamicModels,
      usedFallback,
    });
  } catch (error: any) {
    console.error("[models/api] Error:", error.message);
    return NextResponse.json({
      success: true,
      data: FALLBACK_MODELS,
      usedFallback: true,
    });
  }
}

/**
 * POST /api/models
 * Add a custom model.
 * Body: { id, displayName, description, contextWindow, category }
 */
export async function POST(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const body = await request.json();
    const { id, displayName, description, contextWindow, category } = body;

    if (!id || !displayName) {
      return NextResponse.json(
        { success: false, error: "id and displayName are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    await execute(
      `INSERT INTO custom_models (id, display_name, description, context_window, category, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, displayName, description || "", contextWindow || 800_000, category || "Custom", now]
    );

    return NextResponse.json({
      success: true,
      data: { id, display_name: displayName, description, context_window: contextWindow, category, created_at: now },
    });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint") || error.message?.includes("PRIMARY KEY")) {
      return NextResponse.json(
        { success: false, error: "A model with this ID already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/models?id=<model_id>
 * Remove a custom model.
 */
export async function DELETE(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("id");

    if (!modelId) {
      return NextResponse.json(
        { success: false, error: "id query parameter is required" },
        { status: 400 }
      );
    }

    await execute("DELETE FROM custom_models WHERE id = ?", [modelId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
