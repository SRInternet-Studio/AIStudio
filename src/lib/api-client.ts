import type { ChatMessage, SafetySetting } from "@/types";

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

// ============ Gemini Format ============

interface GeminiContent {
  role: "user" | "model";
  parts: { text: string; thought?: boolean }[];
}

interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig: {
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    safetySettings?: { category: string; threshold: string }[];
  };
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
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

export function toGeminiFormat(
  messages: ChatMessage[],
  temperature: number,
  topP: number = 0.95,
  topK: number = 64,
  maxOutputTokens: number = 65536,
  safetySettings?: SafetySetting[]
): GeminiRequest {
  const systemMessages = messages.filter((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const contents: GeminiContent[] = chatMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const req: GeminiRequest = {
    contents,
    generationConfig: {
      temperature,
      topP,
      topK,
      maxOutputTokens,
    },
  };

  if (systemMessages.length > 0) {
    req.systemInstruction = {
      parts: systemMessages.map((m) => ({ text: m.content })),
    };
  }

  if (safetySettings && safetySettings.length > 0) {
    req.generationConfig.safetySettings = safetySettings.map((s) => ({
      category: s.category,
      threshold: s.threshold,
    }));
  }

  return req;
}

export function parseOpenAIResponse(data: OpenAIResponse): string {
  return data.choices[0]?.message?.content ?? "";
}

export function parseGeminiResponse(data: GeminiResponse): string {
  return data.candidates[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
}

// ============ Unified Send Function ============

export async function sendChatRequest(
  baseUrl: string,
  apiKey: string,
  protocol: "openai" | "gemini",
  model: string,
  messages: ChatMessage[],
  temperature: number,
  options?: {
    top_p?: number;
    top_k?: number;
    max_output_tokens?: number;
    safety_settings?: SafetySetting[];
  }
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] =
      protocol === "openai" ? `Bearer ${apiKey}` : apiKey;
  }

  let url: string;
  let body: string;

  if (protocol === "openai") {
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
    url = `${baseUrl.replace(/\/$/, "")}/v1beta/models/${model}:generateContent`;
    body = JSON.stringify(
      toGeminiFormat(
        messages,
        temperature,
        options?.top_p,
        options?.top_k,
        options?.max_output_tokens,
        options?.safety_settings
      )
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API Error (${response.status}): ${errorText.slice(0, 500)}`
    );
  }

  const data = await response.json();

  if (protocol === "openai") {
    return parseOpenAIResponse(data as OpenAIResponse);
  } else {
    return parseGeminiResponse(data as GeminiResponse);
  }
}
