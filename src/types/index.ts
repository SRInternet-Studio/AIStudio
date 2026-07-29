// ============ Settings ============
export interface AppSettings {
  id: number;
  base_url: string;
  api_key: string;
  api_protocol: "openai" | "gemini";
  selected_model: string;
  system_instructions: string;
  temperature: number;
  thinking_level: "minimal" | "low" | "medium" | "high";
  tools_config: ToolsConfig;
  top_p: number;
  top_k: number;
  max_output_tokens: number;
  safety_settings: SafetySetting[];
  updated_at: string;
}

export interface ToolsConfig {
  structured_outputs: boolean;
  code_execution: boolean;
  function_calling: boolean;
  grounding_google_search: boolean;
  grounding_google_maps: boolean;
  url_context: boolean;
}

export type SafetyThreshold = "OFF" | "LOW" | "MEDIUM" | "HIGH";

export interface SafetySetting {
  category: "HARM_CATEGORY_HARASSMENT" | "HARM_CATEGORY_HATE_SPEECH" | "HARM_CATEGORY_SEXUALLY_EXPLICIT" | "HARM_CATEGORY_DANGEROUS_CONTENT";
  threshold: SafetyThreshold;
}

// ============ System Template ============
export interface SystemTemplate {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// ============ Conversation ============
export interface Conversation {
  id: string;
  title: string;
  parent_conversation_id: string | null;
  branch_from_message_id: string | null;
  model: string;
  created_at: string;
  updated_at: string;
}

// ============ Message ============
export interface Message {
  id: string;
  conversation_id: string;
  parent_message_id: string | null;
  role: "user" | "assistant" | "system";
  position: number;
  created_at: string;
  blocks?: Block[];
}

// ============ Block ============
export type BlockType = "text" | "image" | "thinking" | "tool_result";

export interface Block {
  id: string;
  message_id: string;
  type: BlockType;
  content: string;
  position: number;
  is_deleted: boolean;
  created_at: string;
}

// ============ Chat (internal DTO) ============
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  conversation_id: string;
  message: string;
  model?: string;
  temperature?: number;
  thinking_level?: string;
  system_instructions?: string;
  tools?: ToolsConfig;
}

export interface ChatResponse {
  message: ChatMessage;
  blocks: { type: BlockType; content: string }[];
  thinking?: string;
}

// ============ API Response ============
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============ Model Info ============
export interface ModelInfo {
  id: string;
  displayName: string;
  description: string;
  isNew?: boolean;
  isPaid?: boolean;
  category: string;
}

// ============ Export/Import Context Format (Google AI Studio compatible) ============
export interface ExportContext {
  runSettings: {
    temperature: number;
    model: string;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    safetySettings: SafetySetting[];
    enableCodeExecution: boolean;
    enableSearchAsATool: boolean;
    enableBrowseAsATool: boolean;
    thinkingLevel: string;
    enableImageSearch: boolean;
    enableGoogleMaps: boolean;
  };
  systemInstruction: {
    text: string;
  };
  chunkedPrompt: {
    chunks: ContextChunk[];
    pendingInputs: { text: string; role: string }[];
  };
}

export interface ContextChunk {
  text?: string;
  driveImage?: { id: string };
  role: "user" | "model";
  tokenCount?: number;
  isThought?: boolean;
  finishReason?: string;
  parts?: { text: string; thought?: boolean }[];
  createTime: string;
}

// ============ Dashboard ============
export interface ApiConfig {
  id: string;
  base_url: string;
  api_key: string;
  label: string;
  protocol: "openai" | "gemini";
  model: string;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

export interface UsageStat {
  id: string;
  api_config_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  request_count: number;
  conversation_count: number;
  date: string;
  created_at: string;
}

export interface DbStats {
  db_size: number;
  db_size_formatted: string;
  total_conversations: number;
  total_messages: number;
  total_blocks: number;
  total_templates: number;
  total_api_configs: number;
  tables: { name: string; count: number; size_estimate: string }[];
}
