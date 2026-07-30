import type { ExportContext, ContextChunk, Message, Block, AppSettings, SafetySetting } from "@/types";

/**
 * Export current conversation to Google AI Studio compatible JSON format
 * @param includeCustom If true, includes _custom fields (base_url, api_key, proxy_url) for internal backup
 */
export function exportConversation(
  settings: AppSettings,
  messages: (Message & { blocks: Block[] })[],
  conversationTitle: string,
  includeCustom = false
): ExportContext {
  const chunks: ContextChunk[] = [];

  for (const msg of messages) {
    const blocks = (msg.blocks || []).filter((b) => !b.is_deleted).sort((a, b) => a.position - b.position);

    for (const block of blocks) {
      if (block.type === "text") {
        chunks.push({
          text: block.content,
          role: msg.role === "assistant" ? "model" : "user",
          createTime: msg.created_at,
          parts: [{ text: block.content }],
        });
      } else if (block.type === "thinking") {
        chunks.push({
          text: block.content,
          role: "model",
          isThought: true,
          createTime: msg.created_at,
          parts: [{ text: block.content, thought: true }],
        });
      } else if (block.type === "image") {
        chunks.push({
          driveImage: { id: block.content },
          role: "user",
          createTime: msg.created_at,
        });
      }
    }
  }

  const thinkingLevelMap: Record<string, string> = {
    minimal: "THINKING_MINIMAL",
    low: "THINKING_LOW",
    medium: "THINKING_MEDIUM",
    high: "THINKING_HIGH",
  };

  const result: ExportContext = {
    runSettings: {
      temperature: settings.temperature,
      model: settings.selected_model.startsWith("models/")
        ? settings.selected_model
        : `models/${settings.selected_model}`,
      topP: settings.top_p,
      topK: settings.top_k,
      maxOutputTokens: settings.max_output_tokens,
      safetySettings: settings.safety_settings,
      enableCodeExecution: settings.tools_config.code_execution,
      enableSearchAsATool: settings.tools_config.grounding_google_search,
      enableBrowseAsATool: false,
      thinkingLevel: thinkingLevelMap[settings.thinking_level] || "THINKING_MINIMAL",
      enableImageSearch: false,
      enableGoogleMaps: settings.tools_config.grounding_google_maps,
    },
    systemInstruction: {
      text: settings.system_instructions,
    },
    chunkedPrompt: {
      chunks,
      pendingInputs: [{ text: "", role: "user" }],
    },
  };

  // Add custom fields for internal backup (not Google AI Studio compatible)
  if (includeCustom) {
    result._custom = {
      base_url: settings.base_url,
      api_key: settings.api_key,
      proxy_url: settings.proxy_url,
    };
  }

  return result;
}

/**
 * Import a Google AI Studio context JSON file and return parsed data
 */
export function importContext(jsonData: ExportContext): {
  systemInstructions: string;
  messages: { role: "user" | "assistant"; content: string; type: "text" | "thinking" | "image"; createdAt: string }[];
  settings: {
    temperature: number;
    model: string;
    top_p: number;
    top_k: number;
    max_output_tokens: number;
    safety_settings: SafetySetting[];
    thinking_level: "minimal" | "low" | "medium" | "high";
    tools_config: {
      code_execution: boolean;
      grounding_google_search: boolean;
      grounding_google_maps: boolean;
    };
  };
  customFields?: {
    base_url?: string;
    api_key?: string;
    proxy_url?: string;
  };
} {
  const messages: { role: "user" | "assistant"; content: string; type: "text" | "thinking" | "image"; createdAt: string }[] = [];

  for (const chunk of jsonData.chunkedPrompt.chunks) {
    if (chunk.driveImage) {
      messages.push({
        role: chunk.role === "model" ? "assistant" : "user",
        content: chunk.driveImage.id,
        type: "image",
        createdAt: chunk.createTime,
      });
    } else if (chunk.text) {
      messages.push({
        role: chunk.role === "model" ? "assistant" : "user",
        content: chunk.text,
        type: chunk.isThought ? "thinking" : "text",
        createdAt: chunk.createTime,
      });
    }
  }

  const reverseThinkingLevelMap: Record<string, "minimal" | "low" | "medium" | "high"> = {
    THINKING_MINIMAL: "minimal",
    THINKING_LOW: "low",
    THINKING_MEDIUM: "medium",
    THINKING_HIGH: "high",
  };

  const modelId = jsonData.runSettings.model.startsWith("models/")
    ? jsonData.runSettings.model.replace("models/", "")
    : jsonData.runSettings.model;

  return {
    systemInstructions: jsonData.systemInstruction?.text || "",
    messages,
    settings: {
      temperature: jsonData.runSettings.temperature,
      model: modelId,
      top_p: jsonData.runSettings.topP,
      top_k: jsonData.runSettings.topK,
      max_output_tokens: jsonData.runSettings.maxOutputTokens,
      safety_settings: jsonData.runSettings.safetySettings || [],
      thinking_level: reverseThinkingLevelMap[jsonData.runSettings.thinkingLevel] || "minimal",
      tools_config: {
        code_execution: jsonData.runSettings.enableCodeExecution || false,
        grounding_google_search: jsonData.runSettings.enableSearchAsATool || false,
        grounding_google_maps: jsonData.runSettings.enableGoogleMaps || false,
      },
    },
    customFields: jsonData._custom,
  };
}

/**
 * Download JSON as a file (no extension, Google AI Studio style)
 */
export function downloadContextFile(data: ExportContext, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
