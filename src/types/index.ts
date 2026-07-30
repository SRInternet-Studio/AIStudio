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
  proxy_url: string;
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

// ============ Interactions API Types ============

export interface InteractionContent {
  type: "text" | "image" | "audio" | "video" | "document";
  text?: string;
  data?: string;
  mime_type?: string;
  uri?: string;
}

export interface InteractionStep {
  type: "model_output" | "thought" | "function_call" | "function_result" | "code_execution_call" | "code_execution_result" | "google_search_call" | "google_search_result" | "google_maps_call" | "google_maps_result" | "url_context_call" | "url_context_result";
  content?: InteractionContent[];
  text?: string;
  arguments?: Record<string, unknown>;
  name?: string;
  id?: string;
  call_id?: string;
  result?: unknown;
  is_error?: boolean;
}

export interface InteractionUsage {
  total_input_tokens: number;
  total_output_tokens: number;
  total_thought_tokens: number;
  total_tokens: number;
  total_tool_use_tokens: number;
  total_cached_tokens: number;
  input_tokens_by_modality?: { modality: string; tokens: number }[];
  output_tokens_by_modality?: { modality: string; tokens: number }[];
}

export interface InteractionResponse {
  id: string;
  model?: string;
  agent?: string;
  status: "in_progress" | "requires_action" | "completed" | "failed" | "cancelled" | "incomplete" | "budget_exceeded" | "queued";
  steps: InteractionStep[];
  usage?: InteractionUsage;
  created?: string;
  updated?: string;
}

export interface GeminiTool {
  type: "google_search" | "google_maps" | "code_execution" | "url_context" | "function" | "file_search" | "computer_use";
  // google_maps fields
  latitude?: number;
  longitude?: number;
  // function fields
  name?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  // google_search fields
  search_types?: string[];
}

export type SafetyThreshold =
  | "block_low_and_above"
  | "block_medium_and_above"
  | "block_only_high"
  | "block_none"
  | "off";

export type HarmCategory =
  | "hate_speech"
  | "dangerous_content"
  | "harassment"
  | "sexually_explicit"
  | "civic_integrity"
  | "jailbreak"
  | "image_hate"
  | "image_dangerous_content"
  | "image_harassment"
  | "image_sexually_explicit";

export interface SafetySetting {
  type: HarmCategory;
  threshold: SafetyThreshold;
  method?: "severity" | "probability";
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
  // Custom fields (not part of Google AI Studio format, used for internal backup)
  _custom?: {
    base_url?: string;
    api_key?: string;
    proxy_url?: string;
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
