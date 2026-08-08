import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, execute } from "@/lib/db";
import { requireUnlock } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULT_SAFETY_SETTINGS = [
  { type: "harassment", threshold: "block_none" },
  { type: "hate_speech", threshold: "block_none" },
  { type: "sexually_explicit", threshold: "block_none" },
  { type: "dangerous_content", threshold: "block_none" },
];

/**
 * Normalize one safety setting entry to the internal format
 * ({ type, threshold } in lowercase snake_case).
 * Legacy DB rows may still hold the old Gemini REST format
 * ({ category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" }) — without this
 * the safety dialog cannot match the entries and the chat request builder
 * would emit invalid payloads.
 */
function normalizeSafetySetting(s: any) {
  if (!s || typeof s !== "object") return null;
  const rawType = (s.type || s.category || "").toString().trim();
  const rawThreshold = (s.threshold || "").toString().trim();
  if (!rawType || !rawThreshold) return null;
  const type = rawType.startsWith("HARM_CATEGORY_")
    ? rawType.slice("HARM_CATEGORY_".length).toLowerCase()
    : rawType.toLowerCase();
  return {
    type,
    threshold: rawThreshold.toLowerCase(),
    ...(s.method ? { method: s.method.toString().toLowerCase() } : {}),
  };
}

function normalizeSafetySettings(list: any): any[] {
  if (!Array.isArray(list)) return list;
  return list.map(normalizeSafetySetting).filter((s) => s !== null);
}

/**
 * Sanitize a settings row before returning it to the client.
 * Legacy DB rows may hold empty strings for numeric fields (Top-K, Output length)
 * or an empty safety_settings array — coerce them to sane defaults so the UI
 * always displays real values and the safety options are immediately editable.
 */
function sanitizeSettingsData(data: any) {
  const toInt = (v: any, def: number) => {
    const n = typeof v === "number" ? v : parseInt(v, 10);
    return Number.isFinite(n) && n >= 1 ? n : def;
  };
  const temp = parseFloat(data.temperature);
  data.temperature = Number.isFinite(temp) ? temp : 1;
  const topP = parseFloat(data.top_p);
  data.top_p = Number.isFinite(topP) ? topP : 0.95;
  data.top_k = toInt(data.top_k, 64);
  // Output length: default 65536, range [1, 65536]
  data.max_output_tokens = Math.min(65536, toInt(data.max_output_tokens, 65536));
  if (!Array.isArray(data.safety_settings) || data.safety_settings.length === 0) {
    data.safety_settings = DEFAULT_SAFETY_SETTINGS;
  } else {
    data.safety_settings = normalizeSafetySettings(data.safety_settings);
  }
  if (!Array.isArray(data.stop_sequences)) {
    try {
      const parsed = JSON.parse(data.stop_sequences || "[]");
      data.stop_sequences = Array.isArray(parsed) ? parsed : [];
    } catch {
      data.stop_sequences = [];
    }
  }
  // RAG: coerce DB values (0/1, legacy nulls) to clean typed defaults.
  data.rag_enabled = Number(data.rag_enabled ?? 1) === 1;
  data.rag_provider = data.rag_provider === "local" ? "local" : "api";
  data.rag_embedding_model = typeof data.rag_embedding_model === "string" ? data.rag_embedding_model : "";
  const ragTopK = parseInt(data.rag_top_k, 10);
  data.rag_top_k = Number.isFinite(ragTopK) && ragTopK >= 1 ? Math.min(20, ragTopK) : 5;
  // Media resolution: whitelist the enum, fall back to unspecified.
  const MEDIA_RESOLUTION_LEVELS = ["unspecified", "low", "medium", "high", "ultra_high"];
  data.media_resolution = MEDIA_RESOLUTION_LEVELS.includes(data.media_resolution)
    ? data.media_resolution
    : "unspecified";
  return data;
}

export async function GET(request: NextRequest) {
  try {
    // The settings row contains the api_key — the guard is mandatory.
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const row = await queryOne("SELECT * FROM settings WHERE id = 1");
    if (!row) {
      return NextResponse.json({ success: false, error: "Settings not found" });
    }

    const data = sanitizeSettingsData({
      ...row,
      tools_config: JSON.parse(row.tools_config as string || "{}"),
      safety_settings: JSON.parse(row.safety_settings as string || "[]"),
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const locked = await requireUnlock(request);
    if (locked) return locked;
    await getDb();
    const body = await request.json();
    const now = new Date().toISOString();

    const allowedFields = [
      "base_url",
      "api_key",
      "api_protocol",
      "selected_model",
      "system_instructions",
      "temperature",
      "thinking_level",
      "tools_config",
      "structured_output_schema",
      "function_declarations",
      "top_p",
      "top_k",
      "max_output_tokens",
      "safety_settings",
      "stop_sequences",
      "proxy_url",
      "rag_enabled",
      "rag_provider",
      "rag_embedding_model",
      "rag_top_k",
      "media_resolution",
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        let value =
          typeof body[field] === "object"
            ? JSON.stringify(body[field])
            : body[field];
        // Persist safety settings in the internal format so legacy clients
        // writing the old { category, threshold } shape get normalized too.
        if (field === "safety_settings" && Array.isArray(body[field])) {
          value = JSON.stringify(normalizeSafetySettings(body[field]));
        }
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" });
    }

    updates.push("updated_at = ?");
    values.push(now);
    values.push(1);

    await execute(`UPDATE settings SET ${updates.join(", ")} WHERE id = ?`, values);

    const row = await queryOne("SELECT * FROM settings WHERE id = 1");
    const data = sanitizeSettingsData({
      ...row,
      tools_config: JSON.parse(row.tools_config as string || "{}"),
      safety_settings: JSON.parse(row.safety_settings as string || "[]"),
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
