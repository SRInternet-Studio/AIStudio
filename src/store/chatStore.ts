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
} from "@/types";

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
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
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
  isRunSettingsOpen: true,
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
}));
