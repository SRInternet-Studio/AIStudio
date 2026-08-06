import type {
  ChatMessage,
  SafetySetting,
  ToolsConfig,
  GeminiTool,
  InteractionResponse,
  InteractionContent,
} from "@/types";
import { ProxyAgent, fetch as undiciFetch } from "undici";

/**
 * Normalize base URL for OpenAI-compatible APIs.
 * Removes trailing slashes and strips any existing /v1 or /v1/ suffix
 * to prevent double /v1/v1/ in the final URL.
 */
function normalizeOpenAIBaseUrl(baseUrl: string): string {
  let url = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  // Strip /v1 or /v1/ suffix if already present
  url = url.replace(/\/v1\/?$/, "");
  return url;
}

// ============ OpenAI Compatible Format ============

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
    messages: messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
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

  const candidates = data.candidates || [];
  for (const candidate of candidates) {
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

  return { text, thinking, toolResults, usage };
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
    // Fallback to estimation if API fails
    const totalText = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalText / 3);
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
}

export interface SendChatResult {
  text: string;
  thinking: string;
  toolResults: { type: string; content: string }[];
  usage?: {
    total_input_tokens: number;
    total_output_tokens: number;
    total_thought_tokens: number;
    total_tokens: number;
    total_tool_use_tokens: number;
    total_cached_tokens: number;
  };
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
    url = `${resolvedBaseUrl.replace(/\/$/, "")}/v1beta/models/${model}:generateContent`;
    console.log("[api-client] Gemini URL:", url);
    console.log("[api-client] Gemini model:", model);
    console.log("[api-client] Gemini messages count:", messages.length, "chatMessages:", messages.filter(m => m.role !== "system").length);

    // Extract system instructions
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    // Build contents array (Gemini generateContent format)
    const contents = chatMessages.map((m) => {
      const role = m.role === "assistant" ? "model" : "user";
      const parts: any[] = [{ text: m.content }];

      // Add attachments for the last user message
      const msgWithAttachments = m as any;
      if (role === "user" && m === chatMessages[chatMessages.length - 1] && msgWithAttachments.attachments) {
        for (const att of msgWithAttachments.attachments) {
          const base64Data = att.data_url?.split(",")[1] || att.data_url;
          if (att.mime_type?.startsWith("image/")) {
            parts.push({ inline_data: { mime_type: att.mime_type, data: base64Data } });
          }
        }
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

    // Thinking config
    if (options?.thinking_level) {
      req.generationConfig.thinkingConfig = {
        thinkingBudget: options.thinking_level === "minimal" ? 0 : options.thinking_level === "low" ? 1024 : options.thinking_level === "medium" ? 4096 : 8192,
      };
    }

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

    // Safety settings (convert to camelCase for generateContent)
    if (options?.safety_settings && options.safety_settings.length > 0) {
      req.safetySettings = options.safety_settings.map((s) => ({
        category: s.type,
        threshold: s.threshold,
      }));
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
  type: "text" | "thinking" | "tool_result" | "done" | "usage";
  text?: string;
  toolResult?: { type: string; content: string };
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

  let url: string;
  let body: string;

  if (protocol === "openai") {
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    url = `${normalizeOpenAIBaseUrl(baseUrl)}/v1/chat/completions`;
    console.log("[api-client][stream] OpenAI URL:", url);
    console.log("[api-client][stream] OpenAI model:", model);
    // Issue 5/8/9: attach enabled tools + response_format for OpenAI-compatible streaming.
    const toolCfg = buildToolConfig(options?.tools_config, options?.structured_output_schema, options?.function_declarations);
    const req = toOpenAIFormat(messages, model, temperature, options?.top_p, options?.max_output_tokens, toolCfg, options?.stop_sequences);
    req.stream = true;
    body = JSON.stringify(req);
  } else {
    if (apiKey) {
      headers["x-goog-api-key"] = apiKey;
    }
    const resolvedBaseUrl = baseUrl || "https://generativelanguage.googleapis.com";
    // Use alt=sse for SSE streaming format
    url = `${resolvedBaseUrl.replace(/\/$/, "")}/v1beta/models/${model}:streamGenerateContent?alt=sse`;
    console.log("[api-client][stream] Gemini URL:", url);
    console.log("[api-client][stream] Gemini model:", model);
    console.log("[api-client][stream] Proxy:", proxyUrl || "(none)");

    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    // Build contents array (generateContent format)
    const contents = chatMessages.map((m) => {
      const role = m.role === "assistant" ? "model" : "user";
      const parts: any[] = [{ text: m.content }];
      const msgWithAttachments = m as any;
      if (role === "user" && m === chatMessages[chatMessages.length - 1] && msgWithAttachments.attachments) {
        for (const att of msgWithAttachments.attachments) {
          const base64Data = att.data_url?.split(",")[1] || att.data_url;
          if (att.mime_type?.startsWith("image/")) {
            parts.push({ inline_data: { mime_type: att.mime_type, data: base64Data } });
          }
        }
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
    if (options?.thinking_level) {
      req.generationConfig.thinkingConfig = {
        thinkingBudget: options.thinking_level === "minimal" ? 0 : options.thinking_level === "low" ? 1024 : options.thinking_level === "medium" ? 4096 : 8192,
      };
    }
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
    if (options?.safety_settings && options.safety_settings.length > 0) {
      req.safetySettings = options.safety_settings.map((s) => ({
        category: s.type,
        threshold: s.threshold,
      }));
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
