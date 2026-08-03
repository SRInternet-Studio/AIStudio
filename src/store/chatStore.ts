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
import { FALLBACK_MODELS } from "@/lib/models";

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

  // Global error toast
  globalError: string | null;
  setGlobalError: (error: string | null) => void;

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
  top_p: 0.95,
  top_k: 64,
  max_output_tokens: 65536,
  safety_settings: defaultSafetySettings,
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
  setGlobalError: (globalError) => set({ globalError }),

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

  // Dynamic models
  availableModels: FALLBACK_MODELS,
  modelsLoading: false,
  modelsUsedFallback: false,
  fetchModels: async () => {
    set({ modelsLoading: true });
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (data.success && data.data) {
        set({ availableModels: data.data, modelsUsedFallback: data.usedFallback || false });
      }
    } catch (err) {
      console.warn("[chatStore] Failed to fetch models, using fallback");
    } finally {
      set({ modelsLoading: false });
    }
  },
}));
