import type {
  ChatMessage,
  SafetySetting,
  ToolsConfig,
  GeminiTool,
  InteractionResponse,
  InteractionContent,
} from "@/types";
import crypto from "node:crypto";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { estimateTokens } from "@/lib/context-manager";
import { hasGrounding, type GroundingMetadata } from "@/lib/grounding";

/**
 * Validate a model id used in URL path segments.
 * Allows common provider model-id characters and blocks path/query/control chars.
 */
function validateUrlSafeModelId(model: string): string {
  const trimmed = (model || "").trim();
  if (!trimmed || trimmed.length > 200 || !/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    throw new Error("Invalid model identifier.");
  }
  return trimmed;
}

/**
 * Normalize base URL for OpenAI-compatible APIs.
 * Removes trailing slashes and strips any existing /v1 or /v1/ suffix
 * to prevent double /v1/v1/ in the final URL.
 */
function sanitizeModelId(model: string): string {
  const value = (model || "").trim();
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error("Invalid model identifier");
  }
  return value;
}

function normalizeOpenAIBaseUrl(baseUrl: string): string {
  let url = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  // Strip /v1 or /v1/ suffix if already present
  url = url.replace(/\/v1\/?$/, "");
  return url;
}

// ============ OpenAI Compatible Format ============

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  // Multimodal user messages use the content-part array form
  // ([{ type: "image_url", ... }, { type: "text", ... }]).
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  top_p: number;
  max_tokens: number;
  stream: boolean;
  // Stop sequences — OpenAI-compatible APIs accept up to 4 sequences
  stop?: string[];
  // Issue 5/8/9: tools + structured output for OpenAI-compatible backends
  tools?: any[];
  response_format?: any;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// ============ Gemini Interactions API Format ============

interface InteractionsRequest {
  model: string;
  input: string | InteractionContent[] | (string | { role: string; parts: { text: string; thought?: boolean }[] })[];
  system_instruction?: string;
  tools?: GeminiTool[];
  generation_config?: {
    temperature: number;
    top_p?: number;
    top_k?: number;
    max_output_tokens?: number;
    thinking_level?: string;
    thinking_summaries?: "auto" | "none";
    stop_sequences?: string[];
  };
  safety_settings?: { type: string; threshold: string; method?: string }[];
  stream?: boolean;
  store?: boolean;
  response_modalities?: string[];
  response_format?: { type: string; schema?: Record<string, unknown> };
  service_tier?: "flex" | "standard" | "priority";
}

// ============ Conversion Functions ============

export function toOpenAIFormat(
  messages: ChatMessage[],
  model: string,
  temperature: number,
  topP: number = 0.95,
  maxTokens: number = 65536,
  toolConfig?: ToolBuildResult,
  stopSequences?: string[]
): OpenAIRequest {
  const req: OpenAIRequest = {
    model,
    messages: messages.map((m) => {
      // Multimodal: user messages may carry image attachments (attached to the
      // last user message by the chat route). The OpenAI chat-completions API
      // needs them as image_url content parts — a plain string content would
      // silently drop the images, so the model never sees them.
      const atts = (m as any).attachments as { data_url?: string; mime_type?: string }[] | undefined;
      const imageAtts =
        m.role === "user" && Array.isArray(atts)
          ? atts.filter((a) => a.mime_type?.startsWith("image/") && a.data_url)
          : [];
      if (imageAtts.length === 0) {
        return {
          role: m.role as "system" | "user" | "assistant",
          content: m.content,
        };
      }
      const content: OpenAIMessage["content"] = [
        ...imageAtts.map((a) => ({
          type: "image_url",
          image_url: { url: a.data_url as string },
        })),
      ];
      if (m.content) {
        (content as any[]).push({ type: "text", text: m.content });
      }
      return {
        role: m.role as "system" | "user" | "assistant",
        content,
      };
    }),
    temperature,
    top_p: topP,
    max_tokens: maxTokens,
    stream: false,
  };
  // Stop sequences — the OpenAI spec allows at most 4 sequences.
  if (stopSequences && stopSequences.length > 0) {
    req.stop = stopSequences.slice(0, 4);
  }
  // Issue 5/9: only attach function tools when enabled + declared.
  if (toolConfig?.openaiTools && toolConfig.openaiTools.length > 0) {
    req.tools = toolConfig.openaiTools;
  }
  // Issue 5/8: only attach response_format when structured outputs is enabled.
  if (toolConfig?.openaiResponseFormat) {
    req.response_format = toolConfig.openaiResponseFormat;
  }
  console.log("[api-client] toOpenAIFormat tools:", req.tools?.length || 0, "response_format:", req.response_format?.type || "(none)");
  return req;
}

/**
 * Convert internal messages to Interactions API `input` format.
 * The input can be a simple string for single-turn, or an array of Content objects for multi-turn.
 */
export function toInteractionsInput(
  messages: ChatMessage[]
): (string | { role: string; parts: { text: string }[] })[] {
  return messages.map((m) => {
    if (m.role === "system") {
      // System messages are handled via system_instruction, skip here
      return { role: "user", parts: [{ text: m.content }] };
    }
    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    };
  });
}

/**
 * Convert ToolsConfig to Interactions API tools array
 */
export function buildToolsArray(config: ToolsConfig): GeminiTool[] {
  const tools: GeminiTool[] = [];

  if (config.code_execution) {
    tools.push({ type: "code_execution" });
  }
  if (config.grounding_google_search) {
    tools.push({ type: "google_search" });
  }
  if (config.grounding_google_maps) {
    tools.push({ type: "google_maps" });
  }
  if (config.url_context) {
    tools.push({ type: "url_context" });
  }
  // structured_outputs and function_calling are handled differently:
  // - structured_outputs uses response_format (not tools)
  // - function_calling requires actual function declarations (not a simple toggle)

  return tools;
}

// ============ Unified Tool / Structured-Output Builder (Issues 5, 8, 9) ============

export interface ToolBuildResult {
  geminiTools: any[];                 // -> req.tools for generateContent
  geminiResponseMimeType?: string;    // -> generationConfig.responseMimeType
  geminiResponseSchema?: any;         // -> generationConfig.responseSchema
  openaiTools?: any[];                // -> OpenAI request.tools
  openaiResponseFormat?: any;         // -> OpenAI request.response_format
}

function parseJsonSafe(raw?: string): any | null {
  if (!raw || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch (e: any) {
    console.warn("[api-client] tool JSON parse failed, ignoring:", e?.message);
    return null;
  }
}

/**
 * Build the tool-related request fields for BOTH protocols from the enabled ToolsConfig plus
 * the user-defined structured-output schema and function declarations. Only ENABLED tools are
 * emitted, so disabling a tool guarantees it is never sent to the API (Issue 5).
 */
export function buildToolConfig(
  config: ToolsConfig | undefined,
  structuredSchema?: string,
  functionDeclarations?: string
): ToolBuildResult {
  const result: ToolBuildResult = { geminiTools: [] };
  if (!config) {
    console.log("[api-client] buildToolConfig: no tools_config provided");
    return result;
  }

  // Built-in Gemini tools (native format keys).
  if (config.code_execution) result.geminiTools.push({ codeExecution: {} });
  if (config.grounding_google_search) result.geminiTools.push({ googleSearch: {} });
  if (config.grounding_google_maps) result.geminiTools.push({ googleMaps: {} });
  if (config.url_context) result.geminiTools.push({ urlContext: {} });

  // Function calling (Issue 9): declarations shared across both protocols.
  if (config.function_calling) {
    const parsed = parseJsonSafe(functionDeclarations);
    const declArray = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    if (declArray.length > 0) {
      // Gemini native: tools: [{ functionDeclarations: [...] }]
      result.geminiTools.push({ functionDeclarations: declArray });
      // OpenAI: tools: [{ type: "function", function: {...} }]
      result.openaiTools = declArray.map((d: any) => ({
        type: "function",
        function: { name: d.name, description: d.description, parameters: d.parameters || {} },
      }));
    } else {
      console.warn("[api-client] function_calling enabled but no valid declarations — skipping");
    }
  }

  // Structured outputs (Issue 8).
  if (config.structured_outputs) {
    const schema = parseJsonSafe(structuredSchema);
    result.geminiResponseMimeType = "application/json";
    if (schema) {
      result.geminiResponseSchema = schema;
      result.openaiResponseFormat = { type: "json_schema", json_schema: { name: "response", schema, strict: false } };
    } else {
      // No schema defined — still request JSON mode.
      result.openaiResponseFormat = { type: "json_object" };
    }
  }

  console.log("[api-client] buildToolConfig result:", {
    geminiTools: result.geminiTools.map((t) => Object.keys(t)[0]),
    geminiResponseMimeType: result.geminiResponseMimeType || "(none)",
    hasGeminiSchema: !!result.geminiResponseSchema,
    openaiToolCount: result.openaiTools?.length || 0,
    openaiResponseFormat: result.openaiResponseFormat?.type || "(none)",
  });
  return result;
}

/**
 * Convert safety settings from internal format to Interactions API format.
 * Internal format already uses the new snake_case format.
 */
export function formatSafetySettings(
  settings: SafetySetting[]
): { type: string; threshold: string; method?: string }[] {
  return settings.map((s) => ({
    type: s.type,
    threshold: s.threshold,
    ...(s.method ? { method: s.method } : {}),
  }));
}

/**
 * Convert safety settings to the Gemini generateContent REST format.
 * The upstream API strictly requires SCREAMING_SNAKE enum values:
 *   safetySettings: [{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }]
 * Lowercase aliases ("harassment", "off") are rejected with a 400 INVALID_ARGUMENT.
 * Accepts BOTH the internal new format ({ type, threshold } lowercase) and legacy
 * DB rows that still hold the old format ({ category, threshold } uppercase).
 */
function toGeminiSafetySettings(
  settings: { type?: string; category?: string; threshold?: string; method?: string }[]
): { category: string; threshold: string; method?: string }[] {
  return settings
    .map((s) => {
      const rawCategory = (s.type || s.category || "").trim();
      const rawThreshold = (s.threshold || "").trim();
      if (!rawCategory || !rawThreshold) return null;
      const category = rawCategory.startsWith("HARM_CATEGORY_")
        ? rawCategory
        : `HARM_CATEGORY_${rawCategory.toUpperCase()}`;
      return {
        category,
        threshold: rawThreshold.toUpperCase(),
        ...(s.method ? { method: s.method.toUpperCase() } : {}),
      };
    })
    .filter((s): s is { category: string; threshold: string; method?: string } => s !== null);
}

// ============ Gemini Multimodal Attachments ============

// Token billing for Gemini media is based on the *media format* (pixel tiles
// for images, seconds for video/audio, pages for PDF) — but ONLY when the
// payload is recognized as media. Many relay endpoints bill base64
// inline_data as *text* tokens (~4~5 chars/token): even a 150KB photo blows
// up to ~400k tokens that way, versus ~1.5k tokens billed as media. So by
// default EVERY non-text attachment goes through the Files API:
//   - text/*  -> inline (plain text, billed correctly as text anywhere)
//   - image / video / audio / PDF of ANY size -> Files API (file_data)
// The inline fallback only kicks in when the Files API upload fails (some
// third-party gateways don't implement it).
// The Gemini API caps a single request's inline_data payload at ~20MB total;
// keep a safety margin below that for the combined inline budget.
const GEMINI_INLINE_TOTAL_BUDGET_BYTES = 18 * 1024 * 1024;

// In-memory cache of uploaded Files API URIs keyed by SHA-256 of the raw
// bytes, so rerun/regenerate of the same message does not re-upload identical
// content. Files API files remain usable for ~48h; the cache lives for the
// server process lifetime only, which is an acceptable trade-off.
const GEMINI_FILE_CACHE_MAX = 64;
const geminiFileUriCache = new Map<string, { uri: string; mime: string }>();

// Negative cache: base URLs whose gateway demonstrably does not implement the
// Files API (both resumable and multipart attempts answered with HTML instead
// of JSON). Skipping straight to the inline fallback for later requests saves
// two wasted round-trips per attachment. Process-lifetime only.
const geminiFilesApiUnsupportedBases = new Set<string>();

/**
 * Decide whether an attachment should be sent inline or via the Files API.
 * Only text files stay inline; every media type (image/video/audio/PDF) of
 * any size goes through the Files API so it is billed as media — relays may
 * bill base64 inline_data as text (~400k tokens for one photo otherwise).
 * Pure function (exported for unit tests).
 */
export function routeGeminiMedia(mimeType: string, rawBytes: number): "inline" | "files" {
  void rawBytes;
  if (mimeType.startsWith("text/")) return "inline";
  return "files";
}

/**
 * Map the user-selected media_resolution level to the per-part REST enum
 * (MEDIA_RESOLUTION_LOW/MEDIUM/HIGH/ULTRA_HIGH). Per-content-item media
 * resolution is a Gemini 3+ feature; on older models return null so the
 * field is omitted (sending it yields 400 INVALID_ARGUMENT).
 * Pure function (exported for unit tests).
 */
export function geminiMediaResolutionField(level: string | undefined, model: string): string | null {
  if (!level || level === "unspecified") return null;
  if (!["low", "medium", "high", "ultra_high"].includes(level)) return null;
  const major = parseInt(/^gemini-(\d+)/.exec(model)?.[1] || "0", 10);
  if (major < 3) return null;
  return `MEDIA_RESOLUTION_${level.toUpperCase()}`;
}

function isGeminiSupportedMedia(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/")
  );
}

/**
 * Upload a file through the Gemini Files API.
 * Primary path — resumable upload protocol:
 *   1. POST {base}/upload/v1beta/files with metadata -> x-goog-upload-url header
 *   2. POST the raw bytes to that upload URL (upload, finalize)
 *   3. Poll GET {base}/v1beta/{file.name} until state becomes ACTIVE
 *      (videos need server-side processing before they can be used)
 * Fallback path — single-request multipart upload
 * (POST {base}/upload/v1beta/files?uploadType=multipart), which many
 * third-party gateways implement when they skip the resumable protocol.
 */
async function uploadToGeminiFilesApi(
  dataUrl: string,
  mimeType: string,
  displayName: string,
  baseUrl: string,
  apiKey: string,
  proxyUrl?: string
): Promise<{ uri: string; mime: string }> {
  // Key by SHA-256 of the raw bytes — stable across rerun/regenerate and not
  // vulnerable to prefix collisions like the old length:prefix key.
  const base64ForHash = dataUrl.split(",")[1] || dataUrl;
  const cacheKey = crypto.createHash("sha256").update(base64ForHash, "base64").digest("hex");
  const cached = geminiFileUriCache.get(cacheKey);
  if (cached) {
    console.log("[api-client] Files API: reusing cached upload", cached.uri);
    // Refresh recency (simple LRU behaviour)
    geminiFileUriCache.delete(cacheKey);
    geminiFileUriCache.set(cacheKey, cached);
    return cached;
  }

  const resolvedBase = (baseUrl || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
  if (geminiFilesApiUnsupportedBases.has(resolvedBase)) {
    // This gateway already proved it has no Files API — don't retry on every
    // message; the caller falls back to inline_data.
    throw new Error("Gemini Files API is not supported by this endpoint (cached)");
  }
  const base64Data = dataUrl.split(",")[1] || dataUrl;
  const bytes = Buffer.from(base64Data, "base64");
  const doFetch = proxyUrl ? undiciFetch : fetch;
  const dispatcher = proxyUrl ? { dispatcher: new ProxyAgent(proxyUrl) } : {};
  const authHeaders = apiKey ? { "x-goog-api-key": apiKey } : {};

  // Step 1: start the resumable upload and obtain the session upload URL
  let uploadJson: any = null;
  const startRes = await doFetch(`${resolvedBase}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": `${bytes.length}`,
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ file: { display_name: displayName || "attachment" } }),
    ...(dispatcher as any),
  } as any);
  const uploadUrl = startRes.ok ? startRes.headers.get("x-goog-upload-url") : null;

  if (startRes.ok && uploadUrl) {
    console.log("[api-client] Files API: uploading", bytes.length, "bytes of", mimeType, "(resumable)");
    // Step 2: upload the actual bytes and finalize
    const upRes = await doFetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Length": `${bytes.length}`,
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
        ...authHeaders,
      },
      body: new Uint8Array(bytes),
      ...(dispatcher as any),
    } as any);
    if (!upRes.ok) {
      const errText = await upRes.text().catch(() => "");
      throw new Error(`Gemini Files API byte upload failed (${upRes.status}): ${errText.slice(0, 300)}`);
    }
    uploadJson = await upRes.json();
  } else {
    // Resumable protocol not honored (no x-goog-upload-url header — common on
    // third-party gateways). Retry with a single-request multipart upload.
    console.log("[api-client] Files API: resumable start returned no upload URL, trying multipart upload");
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bytes)], { type: mimeType }), displayName || "attachment");
    const mpRes = await doFetch(`${resolvedBase}/upload/v1beta/files?uploadType=multipart`, {
      method: "POST",
      // No explicit Content-Type: fetch sets multipart/form-data with boundary
      headers: { ...authHeaders },
      body: form,
      ...(dispatcher as any),
    } as any);
    const mpText = await mpRes.text().catch(() => "");
    if (!mpRes.ok) {
      throw new Error(`Gemini Files API multipart upload failed (${mpRes.status}): ${mpText.slice(0, 300)}`);
    }
    try {
      uploadJson = JSON.parse(mpText);
    } catch {
      // HTML instead of JSON — the gateway does not implement the Files API
      // at all. Remember it so later requests skip straight to inline.
      geminiFilesApiUnsupportedBases.add(resolvedBase);
      throw new Error(`Gemini Files API not implemented by this endpoint (returned HTML for ${resolvedBase}/upload/v1beta/files)`);
    }
    console.log("[api-client] Files API: uploading", bytes.length, "bytes of", mimeType, "(multipart)");
  }

  const file = uploadJson.file || {};
  if (file.state === "FAILED") {
    throw new Error("Gemini Files API processing failed for the uploaded file");
  }
  if (!file.uri) {
    throw new Error("Gemini Files API did not return a file URI");
  }

  // Step 3: videos/audio may still be PROCESSING — poll until ACTIVE (max ~2min)
  let uri: string = file.uri;
  let state: string = file.state || "ACTIVE";
  let waitedMs = 0;
  while (state === "PROCESSING" && waitedMs < 120000 && file.name) {
    await new Promise((r) => setTimeout(r, 2000));
    waitedMs += 2000;
    const metaRes = await doFetch(`${resolvedBase}/v1beta/${file.name}`, {
      headers: { ...authHeaders },
      ...(dispatcher as any),
    } as any);
    if (!metaRes.ok) break;
    const meta: any = await metaRes.json();
    state = meta.state || state;
    uri = meta.uri || uri;
    if (state === "FAILED") {
      throw new Error("Gemini Files API processing failed for the uploaded file");
    }
  }
  if (state === "PROCESSING") {
    throw new Error("Gemini Files API is still processing the file after 120s — please try again");
  }

  const result = { uri, mime: file.mimeType || mimeType };
  // Evict the oldest entry when the cache grows too large
  if (geminiFileUriCache.size >= GEMINI_FILE_CACHE_MAX) {
    const oldest = geminiFileUriCache.keys().next().value;
    if (oldest) geminiFileUriCache.delete(oldest);
  }
  geminiFileUriCache.set(cacheKey, result);
  console.log("[api-client] Files API: upload complete, uri:", uri);
  return result;
}

/**
 * Build Gemini content parts for user attachments.
 * Routing policy (see routeGeminiMedia): text files inline, ALL media
 * (image / video / audio / PDF, any size) through the Files API so Gemini
 * bills them as media (pixel tiles / seconds / pages) instead of risking
 * base64 being billed as text.
 * If the Files API is unavailable (some relay endpoints don't implement it),
 * fall back to inline_data with a warning rather than failing the request.
 * `mediaResolution` (Gemini 3+ only) caps per-part media token consumption.
 * Non-media attachments are skipped.
 */
async function buildGeminiAttachmentParts(
  attachments: { data_url?: string; mime_type?: string; name?: string }[],
  baseUrl: string,
  apiKey: string,
  model: string,
  mediaResolution?: string,
  proxyUrl?: string
): Promise<any[]> {
  const resolutionField = geminiMediaResolutionField(mediaResolution, model);
  const parts: any[] = [];
  let inlineBytesUsed = 0;
  for (const att of attachments) {
    const mime = att.mime_type || "";
    const dataUrl = att.data_url || "";
    if (!dataUrl || !isGeminiSupportedMedia(mime)) {
      if (dataUrl) console.log("[api-client] Skipping unsupported attachment type for Gemini:", mime);
      continue;
    }
    const base64Data = dataUrl.split(",")[1] || dataUrl;
    const rawBytes = Math.floor((base64Data.length * 3) / 4);

    let route = routeGeminiMedia(mime, rawBytes);
    // Respect the per-request inline budget (~20MB hard cap upstream)
    if (route === "inline" && inlineBytesUsed + rawBytes > GEMINI_INLINE_TOTAL_BUDGET_BYTES) {
      route = "files";
    }

    if (route === "inline") {
      inlineBytesUsed += rawBytes;
      parts.push({ inline_data: { mime_type: mime, data: base64Data } });
      console.log("[api-client] Attachment inlined:", mime, rawBytes, "bytes");
    } else {
      try {
        const uploaded = await uploadToGeminiFilesApi(dataUrl, mime, att.name || "attachment", baseUrl, apiKey, proxyUrl);
        parts.push({ file_data: { mime_type: uploaded.mime, file_uri: uploaded.uri } });
      } catch (err) {
        // Relay endpoints without Files API support: degrade to inline so the
        // request still goes through (with a warning about token cost).
        console.warn("[api-client] Files API upload failed, falling back to inline_data:", (err as Error).message);
        inlineBytesUsed += rawBytes;
        parts.push({ inline_data: { mime_type: mime, data: base64Data } });
      }
    }
  }
  // Per-content-item media_resolution is a Gemini 3+ part-level field
  if (resolutionField) {
    for (const p of parts) {
      if (p.inline_data || p.file_data) p.media_resolution = resolutionField;
    }
    console.log("[api-client] Applied media_resolution", resolutionField, "to", parts.length, "media part(s)");
  }
  return parts;
}

/**
 * Check if a Gemini response part is a thinking/reasoning part.
 * Gemini API uses different markers depending on model/version:
 * - part.thought === true (boolean flag)
 * - part.thinking === true (boolean flag)
 * - part.thoughtSignature (string presence indicates thinking)
 */
function isThinkingPart(part: any): boolean {
  return !!(part.thought === true || part.thinking === true || part.thoughtSignature);
}

/**
 * Parse Gemini generateContent response to extract text output.
 */
export function parseGeminiGenerateContentResponse(data: any): SendChatResult {
  let text = "";
  let thinking = "";
  const toolResults: { type: string; content: string }[] = [];
  let groundingMetadata: GroundingMetadata | undefined;

  const candidates = data.candidates || [];
  for (const candidate of candidates) {
    // Google Search grounding citations (chunks + supports) live on the
    // candidate, not on individual parts.
    if (hasGrounding(candidate.groundingMetadata)) {
      groundingMetadata = candidate.groundingMetadata as GroundingMetadata;
    }
    const content = candidate.content;
    if (content?.parts) {
      for (const part of content.parts) {
        if (part.text) {
          // Check if this is a thinking part using comprehensive detection
          if (isThinkingPart(part)) {
            thinking += part.text;
            console.log("[api-client] Received thinking content:", part.text.slice(0, 100));
          } else {
            text += part.text;
          }
        }
        if (part.functionCall) {
          toolResults.push({
            type: "function_call",
            content: JSON.stringify(part.functionCall),
          });
        }
        if (part.executableCode) {
          toolResults.push({
            type: "code_execution",
            content: part.executableCode.code || "",
          });
        }
        if (part.codeExecutionResult) {
          toolResults.push({
            type: "code_execution_result",
            content: part.codeExecutionResult.output || "",
          });
        }
      }
    }
  }

  let usage: SendChatResult["usage"] | undefined;
  if (data.usageMetadata) {
    usage = {
      total_input_tokens: data.usageMetadata.promptTokenCount || 0,
      total_output_tokens: data.usageMetadata.candidatesTokenCount || 0,
      total_thought_tokens: data.usageMetadata.thoughtsTokenCount || 0,
      total_tokens: data.usageMetadata.totalTokenCount || 0,
      total_tool_use_tokens: 0,
      total_cached_tokens: data.usageMetadata.cachedContentTokenCount || 0,
    };
  }

  return { text, thinking, toolResults, groundingMetadata, usage };
}

export function parseOpenAIResponse(data: OpenAIResponse): string {
  return data.choices[0]?.message?.content ?? "";
}

/**
 * Count tokens using the Gemini countTokens API.
 * POST /v1beta/{model=models/*}:countTokens
 */
export async function countTokens(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  proxyUrl?: string
): Promise<number> {
  const resolvedBaseUrl = baseUrl || "https://generativelanguage.googleapis.com";
  const url = `${resolvedBaseUrl.replace(/\/$/, "")}/v1beta/models/${model}:countTokens`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-goog-api-key"] = apiKey;
  }

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const fetchOpts: RequestInit & { dispatcher?: any } = {
    method: "POST",
    headers,
    body: JSON.stringify({ contents }),
  };
  if (proxyUrl) {
    fetchOpts.dispatcher = new ProxyAgent(proxyUrl);
    console.log("[api-client] countTokens using proxy:", proxyUrl);
  }

  // Use undici fetch when proxy is set (Node.js built-in fetch doesn't support dispatcher)
  const response = proxyUrl
    ? await undiciFetch(url, fetchOpts as any)
    : await fetch(url, fetchOpts);

  if (!response.ok) {
    // Fallback to the CJK-aware local estimate if the endpoint has no
    // countTokens support (some relays return 400 "unsupported action").
    return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  }

  const data = await response.json();
  return data.totalTokens ?? data.total_tokens ?? 0;
}

/**
 * Parse Interactions API response to extract text output.
 * Handles model_output steps, thought steps, and various tool steps.
 */
export function parseInteractionResponse(data: InteractionResponse): {
  text: string;
  thinking: string;
  toolResults: { type: string; content: string }[];
} {
  let text = "";
  let thinking = "";
  const toolResults: { type: string; content: string }[] = [];

  for (const step of data.steps || []) {
    switch (step.type) {
      case "model_output":
        if (step.content) {
          for (const c of step.content) {
            if (c.type === "text" && c.text) {
              text += c.text;
            }
          }
        } else if (step.text) {
          text += step.text;
        }
        break;

      case "thought":
        if (step.content) {
          for (const c of step.content) {
            if (c.type === "text" && c.text) {
              thinking += c.text;
            }
          }
        } else if (step.text) {
          thinking += step.text;
        }
        break;

      case "code_execution_result":
      case "function_result":
      case "google_search_result":
      case "google_maps_result":
      case "url_context_result":
        toolResults.push({
          type: step.type,
          content: typeof step.result === "string" ? step.result : JSON.stringify(step.result),
        });
        break;

      default:
        // Other step types (calls) are intermediate, skip
        break;
    }
  }

  return { text, thinking, toolResults };
}

// ============ Unified Send Function ============

export interface SendChatOptions {
  top_p?: number;
  top_k?: number;
  max_output_tokens?: number;
  safety_settings?: SafetySetting[];
  stop_sequences?: string[]; // Stop sequences (Safety Settings)
  tools_config?: ToolsConfig;
  structured_output_schema?: string; // Issue 8: user-defined JSON schema (raw string)
  function_declarations?: string;    // Issue 9: user-defined function declarations (raw JSON string)
  thinking_level?: string;
  stream?: boolean;
  response_modalities?: string[];
  // Media resolution level (unspecified/low/medium/high/ultra_high).
  // Applied per-content-item on Gemini 3+ to cap media token consumption.
  media_resolution?: string;
}

export interface SendChatResult {
  text: string;
  thinking: string;
  toolResults: { type: string; content: string }[];
  // Google Search grounding citations (footnote sources) when the response
  // was grounded; undefined otherwise.
  groundingMetadata?: GroundingMetadata;
  usage?: {
    total_input_tokens: number;
    total_output_tokens: number;
    total_thought_tokens: number;
    total_tokens: number;
    total_tool_use_tokens: number;
    total_cached_tokens: number;
  };
}

// Gemini thinking config is generation-specific: 2.5 models take a token
// budget (thinkingBudget), while Gemini 3+ models take a level enum
// (thinkingLevel LOW/HIGH). Sending the wrong field yields
// 400 INVALID_ARGUMENT, so dispatch on the model's major version.
// Pure function (exported for unit tests).
export function buildGeminiThinkingConfig(model: string, thinkingLevel: string): Record<string, any> {
  const major = parseInt(/^gemini-(\d+)/.exec(model)?.[1] || "0", 10);
  if (major >= 3) {
    return {
      thinkingLevel: thinkingLevel === "medium" || thinkingLevel === "high" ? "HIGH" : "LOW",
      // Gemini 3 encrypts the raw reasoning trace — the response only carries
      // an opaque thoughtSignature with no readable text, leaving thinking
      // bubbles empty. ThinkingConfig.includeThoughts=true asks the model to
      // also emit displayable thought summary parts (thought=true + text).
      // Note: thinkingSummaries is an Interactions API / top-level
      // GenerationConfig field — it has no effect inside thinkingConfig
      // (verified against the live endpoint).
      includeThoughts: true,
    };
  }
  return {
    thinkingBudget: thinkingLevel === "minimal" ? 0 : thinkingLevel === "low" ? 1024 : thinkingLevel === "medium" ? 4096 : 8192,
  };
}

function applyGeminiThinkingConfig(generationConfig: any, model: string, thinkingLevel: string) {
  generationConfig.thinkingConfig = buildGeminiThinkingConfig(model, thinkingLevel);
}

export async function sendChatRequest(
  baseUrl: string,
  apiKey: string,
  protocol: "openai" | "gemini",
  model: string,
  messages: ChatMessage[],
  temperature: number,
  options?: SendChatOptions,
  proxyUrl?: string
): Promise<SendChatResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let url: string;
  let body: string;

  if (protocol === "openai") {
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    url = `${normalizeOpenAIBaseUrl(baseUrl)}/v1/chat/completions`;
    console.log("[api-client] OpenAI URL:", url);
    console.log("[api-client] OpenAI model:", model);
    console.log("[api-client] OpenAI messages count:", messages.length);
    // Issue 5/8/9: build enabled tools + response_format for the OpenAI-compatible request.
    const toolCfg = buildToolConfig(options?.tools_config, options?.structured_output_schema, options?.function_declarations);
    body = JSON.stringify(
      toOpenAIFormat(
        messages,
        model,
        temperature,
        options?.top_p,
        options?.max_output_tokens,
        toolCfg,
        options?.stop_sequences
      )
    );
  } else {
    // Gemini generateContent API (standard, widely supported)
    if (apiKey) {
      headers["x-goog-api-key"] = apiKey;
    }

    const resolvedBaseUrl = baseUrl || "https://generativelanguage.googleapis.com";
    const safeModel = validateUrlSafeModelId(model);
    url = `${resolvedBaseUrl.replace(/\/$/, "")}/v1beta/models/${encodeURIComponent(safeModel)}:generateContent`;
    console.log("[api-client] Gemini URL:", url);
    console.log("[api-client] Gemini model:", safeModel);
    console.log("[api-client] Gemini messages count:", messages.length, "chatMessages:", messages.filter(m => m.role !== "system").length);

    // Extract system instructions
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    // Multimodal: build attachment parts (inline_data / file_data) for the last
    // user message. Images, video, audio, PDF and text files are supported —
    // large media is routed through the Files API automatically.
    const lastChatMsg = chatMessages[chatMessages.length - 1];
    const attachmentParts =
      lastChatMsg && (lastChatMsg as any).attachments
        ? await buildGeminiAttachmentParts((lastChatMsg as any).attachments, resolvedBaseUrl, apiKey, model, options?.media_resolution, proxyUrl)
        : [];

    // Build contents array (Gemini generateContent format)
    const contents = chatMessages.map((m) => {
      const role = m.role === "assistant" ? "model" : "user";
      const parts: any[] = [{ text: m.content }];

      if (role === "user" && m === lastChatMsg && attachmentParts.length > 0) {
        parts.push(...attachmentParts);
      }

      return { role, parts };
    });

    // Build request body (generateContent format)
    const req: any = {
      contents,
      generationConfig: {
        temperature,
        topP: options?.top_p ?? 0.95,
        topK: options?.top_k ?? 64,
        maxOutputTokens: options?.max_output_tokens ?? 65536,
      },
    };

    // System instruction
    if (systemMsg?.content) {
      req.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    // Thinking config (generation-specific, see applyGeminiThinkingConfig)
    if (options?.thinking_level) {
      applyGeminiThinkingConfig(req.generationConfig, model, options.thinking_level);
    }
    console.log("[api-client] Gemini thinkingConfig:", JSON.stringify(req.generationConfig.thinkingConfig || null));

    // Stop sequences — Gemini supports up to 5 sequences.
    if (options?.stop_sequences && options.stop_sequences.length > 0) {
      req.generationConfig.stopSequences = options.stop_sequences.slice(0, 5);
    }

    // Tools + structured output (Issues 5/8/9). Only enabled tools are emitted.
    if (options?.tools_config) {
      const toolCfg = buildToolConfig(options.tools_config, options.structured_output_schema, options.function_declarations);
      if (toolCfg.geminiTools.length > 0) {
        req.tools = toolCfg.geminiTools;
      }
      if (toolCfg.geminiResponseMimeType) {
        req.generationConfig.responseMimeType = toolCfg.geminiResponseMimeType;
        if (toolCfg.geminiResponseSchema) {
          req.generationConfig.responseSchema = toolCfg.geminiResponseSchema;
        }
      }
      console.log("[api-client] Gemini req.tools:", JSON.stringify(req.tools || []).slice(0, 200), "responseMimeType:", req.generationConfig.responseMimeType || "(none)");
    }

    // Safety settings — upstream requires SCREAMING_SNAKE enums (see toGeminiSafetySettings)
    if (options?.safety_settings && options.safety_settings.length > 0) {
      req.safetySettings = toGeminiSafetySettings(options.safety_settings as any);
    }

    body = JSON.stringify(req);
  }

  const fetchOptions: RequestInit & { dispatcher?: any } = {
    method: "POST",
    headers,
    body,
  };
  if (proxyUrl) {
    fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
    console.log("[api-client] sendChatRequest using proxy:", proxyUrl, "url:", url);
  } else {
    console.log("[api-client] sendChatRequest NO proxy, url:", url);
  }

  // Use undici fetch when proxy is set (Node.js built-in fetch doesn't support dispatcher)
  const response = proxyUrl
    ? await undiciFetch(url, fetchOptions as any)
    : await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    // Detect HTML response (likely a 404 page) and provide a cleaner error
    const isHtml = errorText.trim().startsWith("<!DOCTYPE") || errorText.trim().startsWith("<html");
    const errorMsg = isHtml
      ? `API returned ${response.status} (HTML page). Check if your Base URL is correct. URL: ${url}`
      : `API Error (${response.status}): ${errorText.slice(0, 500)}`;
    throw new Error(errorMsg);
  }

  const data = await response.json();

  if (protocol === "openai") {
    const text = parseOpenAIResponse(data as OpenAIResponse);
    return { text, thinking: "", toolResults: [] };
  } else {
    // Parse Gemini generateContent response
    return parseGeminiGenerateContentResponse(data);
  }
}

// ============ Streaming Support ============

export interface StreamDelta {
  type: "text" | "thinking" | "tool_result" | "grounding" | "done" | "usage";
  text?: string;
  toolResult?: { type: string; content: string };
  grounding?: GroundingMetadata;
  usage?: SendChatResult["usage"];
}

/**
 * Read SSE stream from Gemini generateContent API (?alt=sse) and call onDelta for each event.
 * Format: each line is `data: {"candidates": [...]}`
 * The consumer may return `false` from onDelta to request an early stop (e.g. stop sequence hit).
 */
async function readGeminiSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (delta: StreamDelta) => void | boolean
) {
  const decoder = new TextDecoder();
  let buffer = "";
  let stopRequested = false;
  const emit = (delta: StreamDelta) => {
    if (onDelta(delta) === false) stopRequested = true;
  };

  while (true) {
    if (stopRequested) break;
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Handle SSE format: `data: {...}`
      let jsonStr = trimmed;
      if (trimmed.startsWith("data: ")) {
        jsonStr = trimmed.slice(6);
      } else if (trimmed.startsWith("data:")) {
        jsonStr = trimmed.slice(5);
      } else if (trimmed.startsWith("event:")) {
        continue; // Skip event lines, only process data
      }

      if (jsonStr === "[DONE]") {
        emit({ type: "done" });
        return;
      }

      try {
        const data = JSON.parse(jsonStr);
        console.log("[api-client] Gemini stream chunk:", JSON.stringify(data).slice(0, 200));
        // Parse generateContent streaming response
        const candidates = data.candidates || [];
        for (const candidate of candidates) {
          // Grounding citations arrive on the candidate (typically in the
          // final chunk) — surface them as their own delta type.
          if (hasGrounding(candidate.groundingMetadata)) {
            emit({ type: "grounding", grounding: candidate.groundingMetadata as GroundingMetadata });
          }
          const content = candidate.content;
          if (content?.parts) {
            for (const part of content.parts) {
              if (part.text) {
                // Check if this is a thinking part using comprehensive detection
                if (isThinkingPart(part)) {
                  console.log("[api-client] Received thinking chunk:", part.text.slice(0, 100));
                  emit({ type: "thinking", text: part.text });
                } else {
                  emit({ type: "text", text: part.text });
                }
              }
              if (part.functionCall) {
                emit({
                  type: "tool_result",
                  toolResult: {
                    type: "function_call",
                    content: JSON.stringify(part.functionCall),
                  },
                });
              }
              if (part.executableCode) {
                emit({
                  type: "tool_result",
                  toolResult: {
                    type: "code_execution",
                    content: part.executableCode.code || "",
                  },
                });
              }
              if (part.codeExecutionResult) {
                emit({
                  type: "tool_result",
                  toolResult: {
                    type: "code_execution_result",
                    content: part.codeExecutionResult.output || "",
                  },
                });
              }
              if (stopRequested) break;
            }
          }
          if (stopRequested) break;
        }
        if (stopRequested) break;

        // Check for usage metadata (usually in the last chunk)
        if (data.usageMetadata) {
          emit({
            type: "usage",
            usage: {
              total_input_tokens: data.usageMetadata.promptTokenCount || 0,
              total_output_tokens: data.usageMetadata.candidatesTokenCount || 0,
              total_thought_tokens: data.usageMetadata.thoughtsTokenCount || 0,
              total_tokens: data.usageMetadata.totalTokenCount || 0,
              total_tool_use_tokens: 0,
              total_cached_tokens: data.usageMetadata.cachedContentTokenCount || 0,
            },
          });
        }

        // Check if this is the last chunk (finishReason present)
        if (candidates.length > 0 && candidates[0].finishReason) {
          emit({ type: "done" });
          return;
        }
      } catch {
        // Skip malformed JSON
      }
      if (stopRequested) break;
    }
  }

  if (stopRequested) {
    // Consumer requested an early stop — release the upstream connection.
    try {
      await reader.cancel();
    } catch {
      // ignore cancel errors
    }
    return;
  }
  onDelta({ type: "done" });
}

/**
 * Read SSE stream from OpenAI compatible API and call onDelta for each event.
 * The consumer may return `false` from onDelta to request an early stop (e.g. stop sequence hit).
 */
async function readOpenAISSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (delta: StreamDelta) => void | boolean
) {
  const decoder = new TextDecoder();
  let buffer = "";
  let stopRequested = false;
  const emit = (delta: StreamDelta) => {
    if (onDelta(delta) === false) stopRequested = true;
  };

  while (true) {
    if (stopRequested) break;
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.slice(6);
        if (jsonStr === "[DONE]") {
          emit({ type: "done" });
          return;
        }
        try {
          const data = JSON.parse(jsonStr);
          const delta = data.choices?.[0]?.delta;
          if (delta) {
            // Check for reasoning content (OpenAI o1/o3 models)
            const reasoning = delta.reasoning_content || delta.reasoning;
            if (reasoning) {
              console.log("[api-client] Received OpenAI reasoning chunk:", reasoning.slice(0, 100));
              emit({ type: "thinking", text: reasoning });
            }
            const content = delta.content;
            if (content) {
              emit({ type: "text", text: content });
            }
          }
        } catch {
          // Skip malformed JSON
        }
      }
      if (stopRequested) break;
    }
  }

  if (stopRequested) {
    // Consumer requested an early stop — release the upstream connection.
    try {
      await reader.cancel();
    } catch {
      // ignore cancel errors
    }
    return;
  }
  onDelta({ type: "done" });
}

/**
 * Send a streaming chat request. Returns a ReadableStream that emits StreamDelta objects.
 */
export async function sendChatRequestStream(
  baseUrl: string,
  apiKey: string,
  protocol: "openai" | "gemini",
  model: string,
  messages: ChatMessage[],
  temperature: number,
  onDelta: (delta: StreamDelta) => void | boolean,
  options?: SendChatOptions,
  proxyUrl?: string
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const safeModel = sanitizeModelId(model);
  let url: string;
  let body: string;

  if (protocol === "openai") {
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    url = `${normalizeOpenAIBaseUrl(baseUrl)}/v1/chat/completions`;
    console.log("[api-client][stream] OpenAI URL:", url);
    console.log("[api-client][stream] OpenAI model:", safeModel);
    // Issue 5/8/9: attach enabled tools + response_format for OpenAI-compatible streaming.
    const toolCfg = buildToolConfig(options?.tools_config, options?.structured_output_schema, options?.function_declarations);
    const req = toOpenAIFormat(messages, safeModel, temperature, options?.top_p, options?.max_output_tokens, toolCfg, options?.stop_sequences);
    req.stream = true;
    body = JSON.stringify(req);
  } else {
    if (apiKey) {
      headers["x-goog-api-key"] = apiKey;
    }
    const resolvedBaseUrl = baseUrl || "https://generativelanguage.googleapis.com";
    // Use alt=sse for SSE streaming format
    url = `${resolvedBaseUrl.replace(/\/$/, "")}/v1beta/models/${encodeURIComponent(safeModel)}:streamGenerateContent?alt=sse`;
    console.log("[api-client][stream] Gemini URL:", url);
    console.log("[api-client][stream] Gemini model:", safeModel);
    console.log("[api-client][stream] Proxy:", proxyUrl || "(none)");

    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    // Multimodal: same attachment handling as the non-streaming path (see above)
    const lastChatMsg = chatMessages[chatMessages.length - 1];
    const attachmentParts =
      lastChatMsg && (lastChatMsg as any).attachments
        ? await buildGeminiAttachmentParts((lastChatMsg as any).attachments, resolvedBaseUrl, apiKey, model, options?.media_resolution, proxyUrl)
        : [];

    // Build contents array (generateContent format)
    const contents = chatMessages.map((m) => {
      const role = m.role === "assistant" ? "model" : "user";
      const parts: any[] = [{ text: m.content }];
      if (role === "user" && m === lastChatMsg && attachmentParts.length > 0) {
        parts.push(...attachmentParts);
      }
      return { role, parts };
    });

    const req: any = {
      contents,
      generationConfig: {
        temperature,
        topP: options?.top_p ?? 0.95,
        topK: options?.top_k ?? 64,
        maxOutputTokens: options?.max_output_tokens ?? 65536,
      },
    };

    if (systemMsg?.content) {
      req.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }
    // Thinking config (generation-specific, see applyGeminiThinkingConfig)
    if (options?.thinking_level) {
      applyGeminiThinkingConfig(req.generationConfig, model, options.thinking_level);
    }
    console.log("[api-client] Gemini thinkingConfig:", JSON.stringify(req.generationConfig.thinkingConfig || null));
    // Stop sequences — Gemini supports up to 5 sequences.
    if (options?.stop_sequences && options.stop_sequences.length > 0) {
      req.generationConfig.stopSequences = options.stop_sequences.slice(0, 5);
    }
    if (options?.tools_config) {
      const toolCfg = buildToolConfig(options.tools_config, options.structured_output_schema, options.function_declarations);
      if (toolCfg.geminiTools.length > 0) {
        req.tools = toolCfg.geminiTools;
      }
      if (toolCfg.geminiResponseMimeType) {
        req.generationConfig.responseMimeType = toolCfg.geminiResponseMimeType;
        if (toolCfg.geminiResponseSchema) {
          req.generationConfig.responseSchema = toolCfg.geminiResponseSchema;
        }
      }
      console.log("[api-client][stream] Gemini req.tools:", JSON.stringify(req.tools || []).slice(0, 200), "responseMimeType:", req.generationConfig.responseMimeType || "(none)");
    }
    // Safety settings — upstream requires SCREAMING_SNAKE enums (see toGeminiSafetySettings)
    if (options?.safety_settings && options.safety_settings.length > 0) {
      req.safetySettings = toGeminiSafetySettings(options.safety_settings as any);
    }

    body = JSON.stringify(req);
  }

  const fetchOptions: RequestInit & { dispatcher?: any } = {
    method: "POST",
    headers,
    body,
  };
  if (proxyUrl) {
    fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
    console.log("[api-client] sendChatRequestStream using proxy:", proxyUrl, "url:", url);
  } else {
    console.log("[api-client] sendChatRequestStream NO proxy, url:", url);
  }

  // Use undici fetch when proxy is set (Node.js built-in fetch doesn't support dispatcher)
  console.log("[api-client] sendChatRequestStream URL:", url);
  console.log("[api-client] sendChatRequestStream body preview:", body?.slice(0, 200));
  const response = proxyUrl
    ? await undiciFetch(url, fetchOptions as any)
    : await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    const isHtml = errorText.trim().startsWith("<!DOCTYPE") || errorText.trim().startsWith("<html");
    const errorMsg = isHtml
      ? `API returned ${response.status} (HTML page). Check if your Base URL is correct. URL: ${url}`
      : `API Error (${response.status}): ${errorText.slice(0, 500)}`;
    console.error("[api-client] Stream API error:", response.status, errorMsg);
    throw new Error(errorMsg);
  }

  console.log("[api-client] Stream response status:", response.status, "content-type:", response.headers.get("content-type"));

  if (!response.body) {
    throw new Error("No response body for streaming request");
  }

  const reader = response.body.getReader();

  if (protocol === "openai") {
    await readOpenAISSEStream(reader, onDelta);
  } else {
    await readGeminiSSEStream(reader, onDelta);
  }
}
