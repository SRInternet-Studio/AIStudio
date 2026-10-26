import { create } from "zustand";
import type {
  AppSettings,
  Conversation,
  Message,
  ToolsConfig,
  SystemTemplate,
  SafetySetting,
  ApiConfig,
  UsageStat,
  ModelInfo,
} from "@/types";
import { FALLBACK_MODELS, applyEndpointWhitelist } from "@/lib/models";

export interface MessageUsage {
  total_input_tokens: number;
  total_output_tokens: number;
  total_thought_tokens: number;
  total_tokens: number;
}

interface ChatState {
  // Settings
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;

  // Conversations
  conversations: Conversation[];
  currentConversation: Conversation | null;
  setCurrentConversation: (conv: Conversation | null) => void;
  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;

  // Messages & Blocks
  messages: Message[];
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  removeMessage: (msgId: string) => void;
  updateMessage: (msgId: string, content: string) => void;
  deleteMessagesFromPosition: (conversationId: string, position: number) => Promise<void>;

  // System Templates
  systemTemplates: SystemTemplate[];
  setSystemTemplates: (templates: SystemTemplate[]) => void;

  // Dashboard
  apiConfigs: ApiConfig[];
  setApiConfigs: (configs: ApiConfig[]) => void;
  usageStats: UsageStat[];
  setUsageStats: (stats: UsageStat[]) => void;
  dashboardView: "api-configs" | "usage" | "db-status" | "db-content";
  setDashboardView: (view: "api-configs" | "usage" | "db-status" | "db-content") => void;
  documentationView:
    | "welcome"
    | "readme"
    | "license"
    | "development"
    | "security"
    | "contributing"
    | "code-of-conduct"
    | "disclaimer";
  setDocumentationView: (
    view:
      | "welcome"
      | "readme"
      | "license"
      | "development"
      | "security"
      | "contributing"
      | "code-of-conduct"
      | "disclaimer"
  ) => void;

  // UI State
  isChatActive: boolean;
  setIsChatActive: (active: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isToolSelectorOpen: boolean;
  setIsToolSelectorOpen: (open: boolean) => void;
  isRunSettingsOpen: boolean;
  setIsRunSettingsOpen: (open: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isSafetySettingsOpen: boolean;
  setIsSafetySettingsOpen: (open: boolean) => void;
  isSystemTemplateManagerOpen: boolean;
  setIsSystemTemplateManagerOpen: (open: boolean) => void;
  isModelSelectorOpen: boolean;
  setIsModelSelectorOpen: (open: boolean) => void;
  activeView: "playground" | "history" | "dashboard" | "documentation";
  setActiveView: (view: "playground" | "history" | "dashboard" | "documentation") => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Rerunning (regenerating) — shared between ChatArea and InputBox
  isRerunning: boolean;
  setIsRerunning: (rerunning: boolean) => void;
  rerunAbortController: AbortController | null;
  setRerunAbortController: (controller: AbortController | null) => void;

  // Global notice toast (typed: error / success / info)
  globalError: string | null;
  globalNoticeType: "error" | "success" | "info";
  setGlobalError: (error: string | null, type?: "error" | "success" | "info") => void;

  // Streaming
  streamingText: string;
  streamingThinking: string;
  isStreaming: boolean;
  setStreamingText: (text: string) => void;
  appendStreamingText: (text: string) => void;
  appendStreamingThinking: (text: string) => void;
  setStreamingThinking: (text: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  clearStreaming: () => void;

  // Per-message token usage
  messageUsage: Record<string, MessageUsage>;
  setMessageUsage: (messageId: string, usage: MessageUsage) => void;

  // Route sync coordination: set before router.push to prevent store→route redirect
  pendingRoute: string | null;
  setPendingRoute: (route: string | null) => void;

  // Edge-TTS state
  ttsEnabled: boolean;
  ttsVoice: string;
  ttsReadCodeBlocks: boolean;
  ttsAutoRead: boolean;
  setTtsEnabled: (enabled: boolean) => void;
  setTtsVoice: (voice: string) => void;
  setTtsReadCodeBlocks: (read: boolean) => void;
  setTtsAutoRead: (auto: boolean) => void;
  ttsPlayingMessageId: string | null;
  setTtsPlayingMessageId: (id: string | null) => void;

  // Dynamic models
  availableModels: ModelInfo[];
  modelsLoading: boolean;
  modelsUsedFallback: boolean;
  fetchModels: () => Promise<void>;
}

const defaultToolsConfig: ToolsConfig = {
  structured_outputs: false,
  code_execution: false,
  function_calling: false,
  grounding_google_search: false,
  grounding_google_maps: false,
  url_context: false,
};

const defaultSafetySettings: SafetySetting[] = [
  { type: "harassment", threshold: "block_none" },
  { type: "hate_speech", threshold: "block_none" },
  { type: "sexually_explicit", threshold: "block_none" },
  { type: "dangerous_content", threshold: "block_none" },
];

const defaultSettings: AppSettings = {
  id: 1,
  base_url: "",
  api_key: "",
  api_protocol: "openai",
  selected_model: "gpt-4o",
  system_instructions: "",
  temperature: 1,
  thinking_level: "minimal",
  tools_config: defaultToolsConfig,
  structured_output_schema: "",
  function_declarations: "",
  top_p: 0.95,
  top_k: 64,
  max_output_tokens: 65536,
  safety_settings: defaultSafetySettings,
  stop_sequences: [],
  rag_enabled: true,
  rag_provider: "api",
  rag_embedding_model: "",
  rag_top_k: 5,
  proxy_url: "",
  updated_at: "",
};

export const useChatStore = create<ChatState>((set) => ({
  settings: defaultSettings,
  setSettings: (settings) => set({ settings }),

  conversations: [],
  currentConversation: null,
  setCurrentConversation: (currentConversation) => set({ currentConversation }),
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conv) =>
    set((state) => ({ conversations: [conv, ...state.conversations] })),

  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  removeMessage: (msgId) =>
    set((state) => ({ messages: state.messages.filter((m) => m.id !== msgId) })),
  updateMessage: (msgId, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === msgId
          ? { ...m, blocks: (m.blocks || []).map((b) => b.type === "text" ? { ...b, content } : b) }
          : m
      ),
    })),
  deleteMessagesFromPosition: async (conversationId, position) => {
    await fetch(`/api/messages/rerun`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId, from_position: position - 1 }),
    });
    // Reload messages
    const res = await fetch(`/api/conversations/${conversationId}`);
    const data = await res.json();
    if (data.success && data.data) {
      set({ messages: data.data.messages || [] });
    }
  },

  systemTemplates: [],
  setSystemTemplates: (systemTemplates) => set({ systemTemplates }),

  apiConfigs: [],
  setApiConfigs: (apiConfigs) => set({ apiConfigs }),
  usageStats: [],
  setUsageStats: (usageStats) => set({ usageStats }),
  dashboardView: "api-configs",
  setDashboardView: (dashboardView) => set({ dashboardView }),
  documentationView: "welcome",
  setDocumentationView: (documentationView) => set({ documentationView }),

  isChatActive: false,
  setIsChatActive: (isChatActive) => set({ isChatActive }),
  isSettingsOpen: false,
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  isToolSelectorOpen: false,
  setIsToolSelectorOpen: (isToolSelectorOpen) => set({ isToolSelectorOpen }),
  isRunSettingsOpen: false,
  setIsRunSettingsOpen: (isRunSettingsOpen) => set({ isRunSettingsOpen }),
  isSidebarOpen: false,
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  isSafetySettingsOpen: false,
  setIsSafetySettingsOpen: (isSafetySettingsOpen) => set({ isSafetySettingsOpen }),
  isSystemTemplateManagerOpen: false,
  setIsSystemTemplateManagerOpen: (isSystemTemplateManagerOpen) => set({ isSystemTemplateManagerOpen }),
  isModelSelectorOpen: false,
  setIsModelSelectorOpen: (isModelSelectorOpen) => set({ isModelSelectorOpen }),
  activeView: "playground",
  setActiveView: (activeView) => set({ activeView }),

  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  isRerunning: false,
  setIsRerunning: (isRerunning) => set({ isRerunning }),
  rerunAbortController: null,
  setRerunAbortController: (rerunAbortController) => set({ rerunAbortController }),

  globalError: null,
  globalNoticeType: "error",
  setGlobalError: (globalError, type) => set({ globalError, globalNoticeType: globalError ? (type || "error") : "error" }),

  streamingText: "",
  streamingThinking: "",
  isStreaming: false,
  setStreamingText: (streamingText) => set({ streamingText }),
  appendStreamingText: (text) => set((state) => ({ streamingText: state.streamingText + text })),
  appendStreamingThinking: (text) => set((state) => ({ streamingThinking: state.streamingThinking + text })),
  setStreamingThinking: (streamingThinking) => set({ streamingThinking }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  clearStreaming: () => set({ streamingText: "", streamingThinking: "" }),

  messageUsage: {},
  setMessageUsage: (messageId, usage) =>
    set((state) => ({ messageUsage: { ...state.messageUsage, [messageId]: usage } })),

  pendingRoute: null,
  setPendingRoute: (pendingRoute) => set({ pendingRoute }),

  ttsEnabled: typeof window !== "undefined" ? localStorage.getItem("app-tts-enabled") === "true" : false,
  ttsVoice: typeof window !== "undefined" ? (localStorage.getItem("app-tts-voice") || "zh-CN-XiaoxiaoNeural") : "zh-CN-XiaoxiaoNeural",
  ttsReadCodeBlocks: typeof window !== "undefined" ? localStorage.getItem("app-tts-read-code") === "true" : false,
  // Auto-read defaults to ON when TTS is enabled (previous behavior), but is now independently toggleable.
  ttsAutoRead: typeof window !== "undefined" ? localStorage.getItem("app-tts-auto-read") !== "false" : true,
  setTtsEnabled: (ttsEnabled) => set({ ttsEnabled }),
  setTtsVoice: (ttsVoice) => set({ ttsVoice }),
  setTtsReadCodeBlocks: (ttsReadCodeBlocks) => set({ ttsReadCodeBlocks }),
  setTtsAutoRead: (ttsAutoRead) => set({ ttsAutoRead }),
  ttsPlayingMessageId: null,
  setTtsPlayingMessageId: (ttsPlayingMessageId) => set({ ttsPlayingMessageId }),

  // Dynamic models
  availableModels: FALLBACK_MODELS,
  modelsLoading: false,
  modelsUsedFallback: false,
  fetchModels: async () => {
    set({ modelsLoading: true });
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Whitelist sync: the endpoint's returned models are the valid set. Any
        // locally known static model the endpoint does NOT serve (e.g. Gemini
        // under an OpenAI-compatible backend) is dropped, while user-added
        // custom models always survive. On a fallback response the endpoint
        // list already carries the full FALLBACK_MODELS + customs, so it is
        // used as-is — the selector never strands on an empty drop-down.
        const before = useChatStore.getState().availableModels.length;
        const whitelisted = applyEndpointWhitelist(useChatStore.getState().availableModels, data.data);
        console.log(`[chatStore] Model list synced (whitelist): endpoint returned ${data.data.length}, local had ${before}, result ${whitelisted.length}`);
        set({
          availableModels: whitelisted,
          modelsUsedFallback: !!data.usedFallback,
        });
      } else {
        console.warn("[chatStore] Model fetch returned no usable data, keeping current list");
      }
    } catch (err) {
      console.warn("[chatStore] Failed to fetch models, keeping current list");
    } finally {
      set({ modelsLoading: false });
    }
  },
}));

/**
 * Replace the visible transcript with a DB reload, defensively.
 *
 * Two guards protect unsaved local state (optimistic user bubble, in-flight
 * error bubbles, the reply promoted off the streaming buffer) from being wiped
 * by a reload racing with a failed send:
 *  1. An EMPTY db list never overwrites local messages that belong to the
 *     same conversation — e.g. a proxy rejected the request before the user
 *     message was persisted, so the DB has nothing yet the UI must keep it.
 *  2. Client-only error bubbles (type "error", never written to the DB) and
 *     optimistic messages at the sentinel position (>= 9000) that are absent
 *     from this snapshot are re-appended after a non-empty reload so they
 *     survive any refresh.
 *
 * A DB row supersedes its optimistic twin by id: once the write has landed the
 * persisted copy (real position, saved blocks, token usage) replaces the local
 * one, so the reply never shows twice.
 *
 * Returns true when the store was updated, false when the reload was skipped.
 */
export function applyDbMessages(convId: string, dbMsgs: Message[]): boolean {
  if (!Array.isArray(dbMsgs)) return false;
  const current = useChatStore.getState().messages;
  const dbIds = new Set(dbMsgs.map((m) => m.id));

  // The text of a message's text blocks; used to decide whether an optimistic
  // bubble (user or the reply promoted off the streaming buffer) was already
  // persisted. If it was, it is superseded and must not be kept, or the reload
  // would show the same turn twice.
  const textOf = (m: Message) =>
    (m.blocks || [])
      .filter((b) => b.type === "text")
      .map((b) => b.content)
      .join("");
  // Thinking-only replies have no text to match on, so fall back to the
  // thinking content (the same join the request pipeline uses).
  const thinkingOf = (m: Message) =>
    (m.blocks || [])
      .filter((b) => b.type === "thinking")
      .map((b) => b.content)
      .join("");
  const mediaCount = (m: Message) =>
    (m.blocks || []).filter((b) => ["image", "video", "audio", "pdf"].includes(b.type)).length;
  const isSupersededOptimistic = (local: Message) =>
    dbMsgs.some((m) => {
      if (m.role !== local.role) return false;
      const lt = textOf(local);
      // Text turn: superseded when a message carries the same text.
      if (lt) return textOf(m) === lt;
      // Thinking-only assistant reply: superseded when the thinking matches.
      const lh = thinkingOf(local);
      if (lh) return thinkingOf(m) === lh;
      // Attachment-only turn: superseded when a user message has the same
      // media block count.
      return mediaCount(m) === mediaCount(local);
    });

  // Client-only messages for this conversation that must survive a reload:
  //  - error bubbles (type "error", never persisted), and
  //  - optimistic user messages (sentinel position >= 9000, e.g. a send that
  //    failed BEFORE the server persisted it) whose content is absent from
  //    this snapshot — otherwise the reload silently drops the user's latest
  //    message and its attachments, and
  //  - optimistic assistant messages promoted from the streaming buffer when a
  //    stream ends before the reload lands, so the finished reply is visible
  //    for the whole duration of the DB write instead of flashing out.
  const clientOnly = current.filter(
    (m) =>
      m.conversation_id === convId &&
      !dbIds.has(m.id) &&
      ((m.blocks || []).some((b) => (b.type as string) === "error") ||
        (Number(m.position) >= 9000 && !isSupersededOptimistic(m)))
  );

  if (dbMsgs.length === 0) {
    const hasLocalContent = current.some((m) => m.conversation_id === convId);
    if (hasLocalContent) {
      console.warn("[chatStore] applyDbMessages: empty DB response refused — local unsaved messages preserved for", convId);
      return false;
    }
    useChatStore.setState({ messages: [] });
    return true;
  }
  useChatStore.setState({
    messages: clientOnly.length > 0 ? [...dbMsgs, ...clientOnly] : dbMsgs,
  });
  return true;
}
