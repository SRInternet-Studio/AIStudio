import type {
  ChatMessage,
  SafetySetting,
  ToolsConfig,
  GeminiTool,
  InteractionResponse,
  InteractionContent,
} from "@/types";
import { ProxyAgent, fetch as undiciFetch } from "undici";

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
  maxTokens: number = 65536
): OpenAIRequest {
  return {
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
          text += part.text;
        }
        if (part.thought || part.thinking) {
          thinking += part.text || "";
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
  tools_config?: ToolsConfig;
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
    url = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
    body = JSON.stringify(
      toOpenAIFormat(
        messages,
        model,
        temperature,
        options?.top_p,
        options?.max_output_tokens
      )
    );
  } else {
    // Gemini generateContent API (standard, widely supported)
    if (apiKey) {
      headers["x-goog-api-key"] = apiKey;
    }

    const resolvedBaseUrl = baseUrl || "https://generativelanguage.googleapis.com";
    url = `${resolvedBaseUrl.replace(/\/$/, "")}/v1beta/models/${model}:generateContent`;

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

    // Tools
    if (options?.tools_config) {
      const tools = buildToolsArray(options.tools_config);
      if (tools.length > 0) {
        req.tools = tools.map((t) => ({ [t.type === "code_execution" ? "codeExecution" : t.type === "google_search" ? "googleSearch" : t.type === "google_maps" ? "googleMaps" : t.type === "url_context" ? "urlContext" : t.type]: {} }));
      }
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
    throw new Error(
      `API Error (${response.status}): ${errorText.slice(0, 500)}`
    );
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
 */
async function readGeminiSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (delta: StreamDelta) => void
) {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
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
        onDelta({ type: "done" });
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
                // Check if this is a thinking part
                if (part.thought || part.thinking) {
                  onDelta({ type: "thinking", text: part.text });
                } else {
                  onDelta({ type: "text", text: part.text });
                }
              }
              if (part.functionCall) {
                onDelta({
                  type: "tool_result",
                  toolResult: {
                    type: "function_call",
                    content: JSON.stringify(part.functionCall),
                  },
                });
              }
              if (part.executableCode) {
                onDelta({
                  type: "tool_result",
                  toolResult: {
                    type: "code_execution",
                    content: part.executableCode.code || "",
                  },
                });
              }
              if (part.codeExecutionResult) {
                onDelta({
                  type: "tool_result",
                  toolResult: {
                    type: "code_execution_result",
                    content: part.codeExecutionResult.output || "",
                  },
                });
              }
            }
          }
        }

        // Check for usage metadata (usually in the last chunk)
        if (data.usageMetadata) {
          onDelta({
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
          onDelta({ type: "done" });
          return;
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }
  onDelta({ type: "done" });
}

/**
 * Read SSE stream from OpenAI compatible API and call onDelta for each event.
 */
async function readOpenAISSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (delta: StreamDelta) => void
) {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.slice(6);
        if (jsonStr === "[DONE]") {
          onDelta({ type: "done" });
          return;
        }
        try {
          const data = JSON.parse(jsonStr);
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            onDelta({ type: "text", text: content });
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
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
  onDelta: (delta: StreamDelta) => void,
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
    url = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
    const req = toOpenAIFormat(messages, model, temperature, options?.top_p, options?.max_output_tokens);
    req.stream = true;
    body = JSON.stringify(req);
  } else {
    if (apiKey) {
      headers["x-goog-api-key"] = apiKey;
    }
    const resolvedBaseUrl = baseUrl || "https://generativelanguage.googleapis.com";
    // Use alt=sse for SSE streaming format
    url = `${resolvedBaseUrl.replace(/\/$/, "")}/v1beta/models/${model}:streamGenerateContent?alt=sse`;

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
    if (options?.tools_config) {
      const tools = buildToolsArray(options.tools_config);
      if (tools.length > 0) {
        req.tools = tools.map((t) => ({ [t.type === "code_execution" ? "codeExecution" : t.type === "google_search" ? "googleSearch" : t.type === "google_maps" ? "googleMaps" : t.type === "url_context" ? "urlContext" : t.type]: {} }));
      }
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
    console.error("[api-client] Stream API error:", response.status, errorText.slice(0, 300));
    throw new Error(`API Error (${response.status}): ${errorText.slice(0, 500)}`);
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
