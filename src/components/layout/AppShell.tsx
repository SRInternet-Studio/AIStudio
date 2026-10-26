"use client";

import { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo } from "react";
import MainLayout from "@/components/layout/MainLayout";
import ChatArea from "@/components/chat/ChatArea";
import InputBox from "@/components/chat/InputBox";
import ApiConfigDialog from "@/components/settings/ApiConfigDialog";
import ToolSelector from "@/components/settings/ToolSelector";
import DashboardPage from "@/components/dashboard/DashboardPage";
import DocumentationPage from "@/components/documentation/DocumentationPage";
import { useChatStore, applyDbMessages } from "@/store/chatStore";
import { exportConversation, downloadContextFile } from "@/lib/context-io";
import { Plus, ArrowLeft, Copy, Pencil, Trash2, Check, X, Hash, Download, RefreshCw } from "lucide-react";
import { useRouter, usePathname, useParams } from "next/navigation";
import type { Message, Block, Conversation } from "@/types";
import { calculateCurrentContextTokens, resolveContextBudget, estimateTokens } from "@/lib/context-manager";
import { getModelContextWindow, GOOGLE_DEFAULT_CONTEXT_WINDOW, isGoogleModel } from "@/lib/models";
import ConfirmDialog from "@/components/ui/confirm-dialog";

interface AppShellProps {
  initialView?: "playground" | "history" | "dashboard" | "documentation";
  initialConversationId?: string;
}

// Number of messages fetched per lazy-load batch.
const MESSAGE_PAGE_SIZE = 50;

export default function AppShell({ initialView = "playground", initialConversationId }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const {
    settings,
    setSettings,
    currentConversation,
    setCurrentConversation,
    messages,
    setMessages,
    activeView,
    setActiveView,
    conversations,
    setConversations,
    setSystemTemplates,
    messageUsage,
    setMessageUsage,
    pendingRoute,
    setPendingRoute,
    availableModels,
    isStreaming,
    streamingText,
    streamingThinking,
  } = useChatStore();

  const [messagesWithBlocks, setMessagesWithBlocks] = useState<
    (Message & { blocks: Block[] })[]
  >([]);

  // Lazy loading of conversation messages. Only the newest MESSAGE_PAGE_SIZE messages
  // are loaded on open; older ones are fetched on scroll-to-top.
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const oldestPositionRef = useRef<number | null>(null);

  // Whole-history context estimate from the server, covering messages that are
  // NOT materialized in the client (older than the loaded page). Keyed by
  // conversation id so switching conversations never reuses a stale baseline.
  const [fullContextBaseline, setFullContextBaseline] = useState<{
    conversationId: string;
    tokens: number;
  } | null>(null);

  // History page state
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  // Title editing in header
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Token count popover
  const [showTokenPopover, setShowTokenPopover] = useState(false);
  const tokenPopoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<"right" | "left">("right");

  // Track if we're navigating to prevent route sync loop
  const isNavigatingRef = useRef(false);
  // Flag to prevent conversations effect from restoring conversation after handleNewChat
  const skipConversationRestoreRef = useRef(false);

  // Route→Store sync: useLayoutEffect runs BEFORE any useEffect,
  // ensuring the store has the correct activeView before store→route effect can redirect
  useLayoutEffect(() => {
    console.log("[AppShell] Route→Store sync (useLayoutEffect):", pathname, "initialView:", initialView, "initialConvId:", initialConversationId);
    if (initialView === "history") {
      setActiveView("history");
    } else if (initialView === "dashboard") {
      setActiveView("dashboard");
    } else if (initialView === "documentation") {
      setActiveView("documentation");
    } else if (initialConversationId) {
      const conv = conversations.find((c) => c.id === initialConversationId);
      if (conv) {
        setCurrentConversation(conv);
      }
      // Always set activeView even if conversation not loaded yet
      setActiveView("playground");
    } else if (pathname === "/" || pathname === "/prompts/new_chat") {
      console.log("[AppShell] Navigating to new chat, clearing currentConversation");
      setCurrentConversation(null);
      setMessages([]);
      setActiveView("playground");
    } else if (pathname === "/dashboard") {
      console.log("[AppShell] Route is /dashboard, setting activeView to dashboard");
      setActiveView("dashboard");
    } else if (pathname === "/documentation") {
      console.log("[AppShell] Route is /documentation, setting activeView to documentation");
      setActiveView("documentation");
    } else if (pathname === "/library") {
      setActiveView("history");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side navigation guard: when pathname changes to "/" or "/prompts/new_chat",
  // ensure currentConversation is cleared (handles cases where useLayoutEffect missed it)
  useEffect(() => {
    if ((pathname === "/" || pathname === "/prompts/new_chat") && !initialConversationId && currentConversation) {
      console.log("[AppShell] Pathname guard: clearing stale currentConversation on new chat route");
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // When conversations are loaded from API, set currentConversation if needed
  // GUARD: skip if we're on a new-chat route or if handleNewChat/Sidebar just cleared it
  useEffect(() => {
    if (initialConversationId && !currentConversation) {
      // Don't restore conversation when user has navigated to new chat
      if (pathname === "/" || pathname === "/prompts/new_chat") {
        console.log("[AppShell] Conversations effect: skipping conversation restore on new chat route, pathname:", pathname);
        return;
      }
      // Don't restore if handleNewChat or Sidebar playground just cleared it
      if (skipConversationRestoreRef.current) {
        console.log("[AppShell] Conversations effect: skipping conversation restore (skipConversationRestoreRef is true)");
        skipConversationRestoreRef.current = false;
        return;
      }
      // Don't restore if a navigation is pending (Sidebar or handleNewChat set pendingRoute)
      if (pendingRoute) {
        console.log("[AppShell] Conversations effect: skipping conversation restore (pendingRoute:", pendingRoute, ")");
        return;
      }
      const conv = conversations.find((c) => c.id === initialConversationId);
      if (conv) {
        console.log("[AppShell] Conversation found after conversations loaded:", conv.id);
        setCurrentConversation(conv);
      }
    }
  }, [conversations, initialConversationId, currentConversation, pathname, pendingRoute]);

  // Store→Route sync: regular useEffect, runs after useLayoutEffect
  useEffect(() => {
    if (isNavigatingRef.current) {
      console.log("[AppShell] Route sync skipped - navigation in progress");
      isNavigatingRef.current = false;
      return;
    }
    // Skip if there's a pending route (set by Sidebar/AppShell before router.push)
    // Don't clear pendingRoute here - let it persist until pathname actually changes
    if (pendingRoute) {
      // Only clear if pathname already matches the pending route (navigation completed)
      if (pathname === pendingRoute) {
        console.log("[AppShell] Route sync: pendingRoute matched pathname, clearing:", pendingRoute);
        setPendingRoute(null);
      } else {
        console.log("[AppShell] Route sync skipped - pendingRoute:", pendingRoute, "pathname:", pathname);
      }
      return;
    }
    console.log("[AppShell] Store→Route sync:", { activeView, convId: currentConversation?.id, pathname });
    if (activeView === "history" && pathname !== "/library") {
      isNavigatingRef.current = true;
      router.replace("/library");
    } else if (activeView === "dashboard" && pathname !== "/dashboard") {
      isNavigatingRef.current = true;
      router.replace("/dashboard");
    } else if (activeView === "documentation" && pathname !== "/documentation") {
      isNavigatingRef.current = true;
      router.replace("/documentation");
    } else if (activeView === "playground" && currentConversation && pathname !== `/prompts/${currentConversation.id}`) {
      isNavigatingRef.current = true;
      router.replace(`/prompts/${currentConversation.id}`);
    } else if (activeView === "playground" && !currentConversation && pathname !== "/" && pathname !== "/prompts/new_chat" && pathname !== "/dashboard" && pathname !== "/library" && pathname !== "/documentation" && !pathname.startsWith("/prompts/")) {
      isNavigatingRef.current = true;
      router.replace("/");
    }
  }, [activeView, currentConversation?.id, pendingRoute]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tokenPopoverRef.current && !tokenPopoverRef.current.contains(e.target as Node)) {
        setShowTokenPopover(false);
      }
    };
    if (showTokenPopover) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTokenPopover]);

  useEffect(() => {
    console.log("[AppShell] Loading settings...");
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        console.log("[AppShell] Settings loaded:", data.success ? "OK" : "FAILED");
        if (data.success && data.data) setSettings(data.data);
      })
      .catch((err) => console.error("[AppShell] Settings load failed:", err));
  }, [setSettings]);

  useEffect(() => {
    console.log("[AppShell] Loading conversations...");
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => {
        console.log("[AppShell] Conversations loaded:", data.success ? "OK" : "FAILED", "count:", data.data?.length || 0);
        if (data.success && data.data) setConversations(data.data);
      })
      .catch((err) => console.error("[AppShell] Conversations load failed:", err));
  }, [setConversations]);

  useEffect(() => {
    fetch("/api/system-templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) setSystemTemplates(data.data);
      })
      .catch(console.error);
  }, [setSystemTemplates]);

  // Load messages when conversation changes.
  // NOTE: messageUsage is NOT reset here to avoid clearing usage data during message reload
  // Usage is only cleared when user explicitly switches conversations (handleSelectConversation, handleNewChat)
  useEffect(() => {
    if (!currentConversation) {
      console.log("[AppShell] No current conversation, clearing messages");
      setMessages([]);
      setMessagesWithBlocks([]);
      setHasMoreMessages(false);
      oldestPositionRef.current = null;
      setFullContextBaseline(null);
      return;
    }
    const convId = currentConversation.id;

    // Skip the DB fetch when the store ALREADY holds messages for this
    // conversation (optimistic user bubble / error bubble from an in-flight
    // or failed send, e.g. after the route sync remounted this component).
    // A fetch here would race the send and clobber unsaved local state with
    // a stale/empty transcript — the send's own final reload refreshes the
    // list once the server state is authoritative.
    const local = useChatStore.getState().messages;
    if (local.some((m) => m.conversation_id === convId)) {
      console.log("[AppShell] Local messages already present for", convId, "— skipping DB load to protect unsaved state");
      return;
    }

    console.log("[AppShell] Loading messages for conversation:", convId, "(lazy, last", MESSAGE_PAGE_SIZE, ")");

    fetch(`/api/conversations/${convId}?limit=${MESSAGE_PAGE_SIZE}`)
      .then((res) => res.json())
      .then((data) => {
        // Stale-response guard: the user may have switched conversations (or
        // started sending) while this fetch was in flight — a late answer
        // must never overwrite the transcript of another conversation.
        if (useChatStore.getState().currentConversation?.id !== convId) {
          console.log("[AppShell] Discarding stale message load for", convId);
          return;
        }
        if (data.success && data.data) {
          const msgs = data.data.messages || [];
          console.log("[AppShell] Messages loaded:", msgs.length, "messages, hasMore:", data.data.hasMore);
          applyDbMessages(convId, msgs);
          setHasMoreMessages(!!data.data.hasMore);
          oldestPositionRef.current = data.data.oldestPosition ?? (msgs[0]?.position ?? null);
          // Whole-history baseline: the server estimated every message's text,
          // so the counter is correct even though only the newest page of
          // messages is materialized here.
          if (typeof data.data.fullContextEstimate === "number") {
            setFullContextBaseline({ conversationId: convId, tokens: data.data.fullContextEstimate });
          } else {
            // Older/absent field: fall back to the loaded page so the counter
            // still reflects what the client actually holds.
            setFullContextBaseline(null);
          }
          // Use the lightweight full token-count list (all messages) so the counter stays accurate
          // even though only the newest slice of messages is materialized.
          populateUsageFromMessages(data.data.tokenCounts || msgs);
        } else {
          console.error("[AppShell] Failed to load messages:", data);
        }
      })
      .catch((err) => console.error("[AppShell] Messages load failed:", err));
  }, [currentConversation?.id]);

  useEffect(() => {
    setMessagesWithBlocks(messages as (Message & { blocks: Block[] })[]);
  }, [messages]);

  // Focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Populate messageUsage from persisted per-message token data. Chat turns persist
  // the full breakdown (input/output/thought) on the assistant message so the refresh
  // button restores the exact In/Out/Think numbers shown right after generation.
  // Legacy rows (imported conversations / pre-breakdown chat turns) only carry
  // token_count and fall back to the coarse role-based mapping.
  const populateUsageFromMessages = useCallback((msgs: any[]) => {
    const usage: Record<string, any> = {};
    let counted = 0;
    for (const m of msgs) {
      // Messages without visible blocks don't render, so their token fields are
      // excluded from the conversation counter. The server-side tokenCounts list
      // applies the same filter; this guard covers the full-reload path where
      // messages carry their blocks array.
      if (Array.isArray(m.blocks) && m.blocks.length === 0) continue;
      const inT = Number(m.input_tokens) || 0;
      const outT = Number(m.output_tokens) || 0;
      const thT = Number(m.thought_tokens) || 0;
      if (m.role === "assistant" && (inT > 0 || outT > 0 || thT > 0)) {
        usage[m.id] = {
          total_input_tokens: inT,
          total_output_tokens: outT,
          total_thought_tokens: thT,
          total_tokens: inT + outT + thT,
        };
        counted++;
        continue;
      }
      const tc = Number(m.token_count) || 0;
      if (tc > 0) {
        usage[m.id] = {
          total_input_tokens: m.role === "assistant" ? 0 : tc,
          total_output_tokens: m.role === "assistant" ? tc : 0,
          total_thought_tokens: 0,
          total_tokens: tc,
        };
        counted++;
      }
    }
    if (counted > 0) {
      console.log("[AppShell] Populated token usage from token_count for", counted, "messages");
      useChatStore.setState((state) => ({ messageUsage: { ...state.messageUsage, ...usage } }));
    }
  }, []);

  // Fetch the previous batch of older messages (scroll-to-top). Returns true if a
  // batch was prepended so the caller (ChatArea) can preserve the scroll position.
  const loadOlderMessages = useCallback(async (): Promise<boolean> => {
    if (!currentConversation || isLoadingOlder || !hasMoreMessages) return false;
    // Derive the paging cursor from the ACTUAL current messages so it stays correct even if a
    // rerun/send just did a full reload of the transcript (prevents duplicate prepends).
    const existing = useChatStore.getState().messages;
    const cursor = existing.length > 0
      ? Math.min(...existing.map((m) => m.position))
      : oldestPositionRef.current;
    if (cursor == null) return false;
    setIsLoadingOlder(true);
    console.log("[AppShell] Loading older messages before position:", cursor);
    try {
      const res = await fetch(
        `/api/conversations/${currentConversation.id}?limit=${MESSAGE_PAGE_SIZE}&before_position=${cursor}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        const older = data.data.messages || [];
        console.log("[AppShell] Older messages loaded:", older.length, "hasMore:", data.data.hasMore);
        if (older.length > 0) {
          const current = useChatStore.getState().messages;
          setMessages([...older, ...current]);
          oldestPositionRef.current = data.data.oldestPosition ?? (older[0]?.position ?? cursor);
        }
        setHasMoreMessages(!!data.data.hasMore);
        return older.length > 0;
      }
      return false;
    } catch (err) {
      console.error("[AppShell] Load older messages failed:", err);
      return false;
    } finally {
      setIsLoadingOlder(false);
    }
  }, [currentConversation?.id, isLoadingOlder, hasMoreMessages, setMessages]);

  const handleSelectConversation = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      isNavigatingRef.current = true; // Prevent route sync loop
      // Clear messageUsage when user explicitly switches conversations
      console.log("[AppShell] Switching conversation, clearing messageUsage");
      useChatStore.setState({ messageUsage: {} });
      setFullContextBaseline(null);
      setCurrentConversation(conv);
      setActiveView("playground");
      router.push(`/prompts/${convId}`);
    }
  };

  const handleNewChat = () => {
    console.log("[AppShell] handleNewChat called, current pathname:", pathname, "currentConvId:", currentConversation?.id);
    isNavigatingRef.current = true; // Prevent route sync loop
    skipConversationRestoreRef.current = true; // Prevent conversations effect from restoring conversation
    // Clear messageUsage when starting new chat
    console.log("[AppShell] New chat, clearing messageUsage and conversation state");
    useChatStore.setState({ messageUsage: {} });
    setFullContextBaseline(null);
    setPendingRoute("/"); // MUST be first: prevent store→route redirect during navigation
    setCurrentConversation(null);
    setMessages([]);
    setMessagesWithBlocks([]);
    setActiveView("playground");
    router.push("/");
    console.log("[AppShell] handleNewChat: router.push('/') called");
  };

  const refreshConversations = async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    if (data.success && data.data) setConversations(data.data);
  };

  const handleHistoryRename = async (convId: string) => {
    if (!renameTitle.trim()) {
      setRenamingConvId(null);
      return;
    }
    await fetch(`/api/conversations/${convId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameTitle.trim() }),
    });
    setRenamingConvId(null);
    setRenameTitle("");
    await refreshConversations();
  };

  const handleHistoryCopy = async (convId: string) => {
    const res = await fetch("/api/conversations/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: convId }),
    });
    const data = await res.json();
    if (data.success) {
      await refreshConversations();
    }
  };

  const handleHistoryDelete = async (convId: string) => {
    await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
    if (currentConversation?.id === convId) {
      setCurrentConversation(null);
      setMessages([]);
      setMessagesWithBlocks([]);
    }
    await refreshConversations();
  };

  // Deletion requires an explicit second confirmation to prevent accidental
  // loss of chat history.
  const [historyDeleteTarget, setHistoryDeleteTarget] = useState<Conversation | null>(null);

  const handleExportConversation = async (convId: string) => {
    console.log("[AppShell] Exporting conversation:", convId);
    if (!settings) {
      console.error("[AppShell] Settings not loaded yet");
      return;
    }
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      const data = await res.json();
      if (!data.success) {
        console.error("[AppShell] Failed to load conversation for export:", data);
        return;
      }
      const msgs = data.data.messages || [];
      const conv = conversations.find(c => c.id === convId);
      const contextData = exportConversation(settings, msgs, conv?.title || "conversation", true);
      const filename = (conv?.title || "conversation").replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, "_") + ".json";
      downloadContextFile(contextData, filename);
      console.log("[AppShell] Exported conversation:", filename);
    } catch (err) {
      console.error("[AppShell] Failed to export conversation:", err);
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitleValue.trim() || !currentConversation) {
      setIsEditingTitle(false);
      return;
    }
    const newTitle = editTitleValue.trim();
    await fetch(`/api/conversations/${currentConversation.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    setCurrentConversation({ ...currentConversation, title: newTitle });
    setConversations(conversations.map(c => c.id === currentConversation.id ? { ...c, title: newTitle } : c));
    setIsEditingTitle(false);
  };

  // Two token dimensions are deliberately separated:
  //  - currentContextTokens: local CJK-aware estimate of the conversation's
  //    visible blocks — what the user actually occupies in the context.
  //  - cumulativeTokens: sum of the raw usageMetadata totals the API reported
  //    per assistant message. As a stateless proxy, each response's total also
  //    covers all in-window history, so this figure is a billing reference,
  //    NOT the size of the current context.
  const currentConvUsageKeys = currentConversation
    ? messages.filter(m => messageUsage[m.id]).map(m => m.id)
    : [];
  const hasUsageData = currentConvUsageKeys.length > 0;
  const cumulativeTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_tokens || 0), 0);
  const totalInputTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_input_tokens || 0), 0);
  const totalOutputTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_output_tokens || 0), 0);
  const totalThoughtTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_thought_tokens || 0), 0);

  // Local estimate of the current session's context usage. Recomputed whenever
  // the loaded messages or settings change, and follows the streaming reply in
  // real time; after a refresh it derives from the freshly loaded messages.
  const contextTokens = useMemo(() => {
    if (!currentConversation) return null;
    const useModel = settings?.selected_model || "";
    const model = availableModels.find((m) => m.id === useModel);
    let contextWindow = model
      ? getModelContextWindow(model)
      : isGoogleModel(useModel)
        ? GOOGLE_DEFAULT_CONTEXT_WINDOW
        : 128_000;
    if (settings?.max_context_tokens && settings.max_context_tokens > 0) {
      contextWindow = Math.min(contextWindow, settings.max_context_tokens);
    }
    // Mirror the server's budget split (resolveContextBudget) so the windowed
    // figure below describes exactly what the next request will carry.
    const budget = resolveContextBudget({
      contextWindow,
      maxOutputTokens: settings?.max_output_tokens,
      ragReserveRatio: settings?.rag_enabled === false ? 0 : 0.1,
    });

    // Append the in-flight reply so the estimate tracks streaming updates.
    const list: (Message & { blocks: Block[] })[] = [...messagesWithBlocks];
    if (isStreaming && (streamingText || streamingThinking)) {
      const streamingBlocks: Block[] = [];
      if (streamingText) {
        streamingBlocks.push({
          id: "stream-text", message_id: "", type: "text",
          content: streamingText, position: 0, is_deleted: false, created_at: "",
        });
      }
      if (streamingThinking) {
        streamingBlocks.push({
          id: "stream-thinking", message_id: "", type: "thinking",
          content: streamingThinking, position: 1, is_deleted: false, created_at: "",
        });
      }
      list.push({
        id: "__streaming__", conversation_id: currentConversation.id,
        parent_message_id: null, role: "assistant", position: 0,
        created_at: "", blocks: streamingBlocks,
      });
    }

    const systemTokens = settings?.system_instructions
      ? estimateTokens(settings.system_instructions)
      : 0;

    // The mounted list is only the newest page of the transcript, while the
    // server's baseline covers the whole history. Take the larger: the baseline
    // until the live list outgrows it (streaming reply, edit, more pages).
    const mounted = calculateCurrentContextTokens(list, {
      maxTokens: budget.promptTokens,
      systemInstructions: undefined,
    });
    const mountedTokens = mounted.fullContextTokens;
    const hasBaseline =
      fullContextBaseline !== null && fullContextBaseline.conversationId === currentConversation.id;
    const fullContextTokens =
      systemTokens + (hasBaseline ? Math.max(fullContextBaseline.tokens, mountedTokens) : mountedTokens);

    return {
      fullContextTokens,
      windowContextTokens: mounted.windowContextTokens + systemTokens,
      trimmed: mounted.trimmed,
    };
  }, [currentConversation, messagesWithBlocks, isStreaming, streamingText, streamingThinking, settings, availableModels, fullContextBaseline]);

  const currentContextTokens = contextTokens?.fullContextTokens ?? 0;

  // Refresh token usage by re-fetching conversation messages
  const handleRefreshTokenUsage = useCallback(() => {
    if (!currentConversation) return;
    const convId = currentConversation.id;
    console.log("[AppShell] Refreshing token usage for conversation:", convId);
    fetch(`/api/conversations/${convId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.data) {
          // A failed refresh must NOT nuke the current counts — keep the
          // existing numbers instead of silently zeroing them.
          console.error("[AppShell] Token usage refresh failed:", data?.error || "bad response", data);
          return;
        }
        const msgs = data.data.messages || [];
        // Prefer the server's authoritative tokenCounts list (it applies the
        // "message has visible blocks" filter); otherwise derive from the
        // loaded messages, which carry the per-message In/Out/Think breakdown.
        const usageSource = data.data.tokenCounts || msgs;
        // Reload through applyDbMessages so unsaved local state (optimistic
        // bubble, client-only error bubble) survives the refresh, then
        // re-derive the usage numbers from the fresh snapshot.
        applyDbMessages(convId, msgs);
        setMessagesWithBlocks(msgs);
        populateUsageFromMessages(usageSource);
        // A full (unpaged) fetch also carries the whole-history estimate — keep
        // the baseline in sync so it never lags behind an edit or a new turn.
        if (typeof data.data.fullContextEstimate === "number") {
          setFullContextBaseline({ conversationId: convId, tokens: data.data.fullContextEstimate });
        }
        console.log("[AppShell] Token usage refreshed, messages:", msgs.length, "usageSource:", usageSource.length);
      })
      .catch((err) => console.error("[AppShell] Token usage refresh failed:", err));
  }, [currentConversation?.id]);

  const renderHeader = () => {
    if (activeView === "dashboard") {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveView("playground"); router.push("/"); }}
            className="p-1.5 rounded-md hover:bg-surface-variant transition-colors duration-150 text-muted hover:text-foreground"
            title="Back to Playground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground">Dashboard</span>
        </div>
      );
    }
    if (activeView === "documentation") {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveView("playground"); router.push("/"); }}
            className="p-1.5 rounded-md hover:bg-surface-variant transition-colors duration-150 text-muted hover:text-foreground"
            title="Back to Playground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground">Documentation</span>
        </div>
      );
    }
    if (currentConversation) {
      return (
        <div className="flex items-center gap-3 min-w-0">
          {/* Title - inline editable */}
          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                ref={titleInputRef}
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
                onBlur={handleSaveTitle}
                className="flex-1 min-w-0 bg-transparent text-sm font-medium text-foreground border-b border-primary focus:outline-none"
              />
            </div>
          ) : (
            <button
              onClick={() => { setIsEditingTitle(true); setEditTitleValue(currentConversation.title); }}
              className="text-sm font-medium text-foreground hover:text-accent transition-colors truncate max-w-[200px]"
              title="Click to rename"
            >
              {currentConversation.title}
            </button>
          )}

          {/* New chat button */}
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-md hover:bg-surface-variant transition-colors duration-150 text-muted hover:text-foreground flex-shrink-0"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Token count: badge shows the locally estimated current context usage */}
          <div className="relative flex-shrink-0" ref={tokenPopoverRef}>
            <button
              onClick={() => {
                // Boundary detection for popover positioning
                if (tokenPopoverRef.current) {
                  const rect = tokenPopoverRef.current.getBoundingClientRect();
                  const popoverWidth = 288; // w-72 = 18rem = 288px
                  const spaceOnRight = window.innerWidth - rect.right;
                  setPopoverPosition(spaceOnRight < popoverWidth ? "left" : "right");
                }
                setShowTokenPopover(!showTokenPopover);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted hover:text-foreground hover:bg-surface-variant transition-colors duration-150"
              title="Current context usage (estimate) and cumulative consumption"
            >
              <Hash className="w-3 h-3" />
              {contextTokens ? (
                <>
                  <span>~{currentContextTokens.toLocaleString()}</span>
                  <span className="text-[10px] text-muted/60">tokens</span>
                </>
              ) : (
                <span className="text-[10px]">uncounted</span>
              )}
            </button>

            {showTokenPopover && (
              <div
                className={`absolute top-full mt-2 bg-card border border-border rounded-lg shadow-xl p-4 w-72 max-w-[90vw] overflow-x-auto z-50 animate-in fade-in scale-in duration-150 ${
                  popoverPosition === "left" ? "right-0" : "left-0"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">Token Usage</h3>
                  <button
                    onClick={handleRefreshTokenUsage}
                    className="text-xs text-muted hover:text-foreground transition-colors"
                    title="Refresh token data"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {contextTokens && (
                  <div className="space-y-3 text-xs">
                    {/* Dimension 1: current session context usage (local estimate) */}
                    <div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-muted">本次会话上下文用量：</span>
                        <span className="text-foreground font-bold">
                          ~{contextTokens.fullContextTokens.toLocaleString()} tokens
                        </span>
                      </div>
                      {contextTokens.trimmed && (
                        <div className="flex justify-between mt-1">
                          <span className="text-muted">其中发送窗口内：</span>
                          <span className="text-foreground font-medium">
                            ~{contextTokens.windowContextTokens.toLocaleString()} tokens
                          </span>
                        </div>
                      )}
                      <p className="text-[10px] text-muted/60 mt-1 leading-relaxed">
                        Local CJK-aware estimate over all visible blocks (user messages, replies, thinking).
                      </p>
                    </div>

                    <div className="border-t border-border" />

                    {/* Dimension 2: cumulative consumption (raw API usageMetadata) */}
                    {hasUsageData ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted">Input tokens:</span>
                            <span className="text-foreground font-medium">{totalInputTokens.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted">Output tokens:</span>
                            <span className="text-foreground font-medium">{totalOutputTokens.toLocaleString()}</span>
                          </div>
                          {totalThoughtTokens > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted">Thought tokens:</span>
                              <span className="text-foreground font-medium">{totalThoughtTokens.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="border-t border-border my-2" />
                          <div className="flex justify-between items-baseline">
                            <span className="text-muted">累计总消耗：</span>
                            <span className="text-foreground font-bold">{cumulativeTokens.toLocaleString()} tokens</span>
                          </div>
                          <p className="text-[10px] text-muted/60 leading-relaxed">
                            Raw usageMetadata totals per response; each turn also re-bills the in-window history.
                          </p>
                        </div>

                        {/* Per-message breakdown */}
                        {Object.keys(messageUsage).length > 1 && (
                          <>
                            <div className="border-t border-border my-3" />
                            <h4 className="text-xs font-medium text-muted mb-2">Per-message breakdown</h4>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                              {messages
                                .filter(m => messageUsage[m.id])
                                .map(m => (
                                  <div key={m.id} className="flex justify-between text-[11px]">
                                    <span className="text-muted truncate max-w-[120px]">
                                      {m.role === "user" ? "User" : "Model"} #{m.position}
                                    </span>
                                    <span className="text-foreground">
                                      {messageUsage[m.id].total_tokens.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="py-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-muted">累计总消耗：</span>
                          <span className="text-foreground font-medium">—</span>
                        </div>
                        <p className="text-[10px] text-muted/60 mt-1 leading-relaxed">
                          Reported by the API per assistant message; available after the first exchange.
                        </p>
                        <button
                          onClick={handleRefreshTokenUsage}
                          className="mt-2 text-xs text-primary hover:text-accent transition-colors"
                        >
                          Try refreshing
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <span className="text-sm font-medium text-foreground">Playground</span>
    );
  };

  const renderContent = () => {
    if (activeView === "playground") {
      return (
        <div className="flex flex-col flex-1 min-h-0">
                    <ChatArea
                      messages={messagesWithBlocks}
                      hasMoreMessages={hasMoreMessages}
                      isLoadingOlder={isLoadingOlder}
                      onLoadOlder={loadOlderMessages}
                    />
          <InputBox />
        </div>
      );
    }
    if (activeView === "history") {
      return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <h2 className="text-lg font-medium text-foreground mb-4">History</h2>
          {conversations.length === 0 ? (
            <p className="text-muted text-sm">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="group flex items-center gap-2 p-3 rounded-lg border transition-all duration-150 bg-card border-border hover:bg-surface-variant"
                >
                  {renamingConvId === conv.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={renameTitle}
                        onChange={(e) => setRenameTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleHistoryRename(conv.id);
                          if (e.key === "Escape") { setRenamingConvId(null); setRenameTitle(""); }
                        }}
                        onBlur={() => handleHistoryRename(conv.id)}
                        className="flex-1 bg-transparent text-sm text-foreground border-b border-primary focus:outline-none"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectConversation(conv.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-sm text-foreground truncate">{conv.title}</p>
                      <p className="text-xs text-muted mt-1">
                        {new Date(conv.created_at).toLocaleDateString("zh-CN")}
                      </p>
                    </button>
                  )}

                  {renamingConvId !== conv.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity duration-150">
                      <button
                        onClick={() => { setRenamingConvId(conv.id); setRenameTitle(conv.title); }}
                        className="p-1.5 rounded-md hover:bg-surface-variant text-muted hover:text-foreground transition-colors duration-150"
                        title="Rename"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleHistoryCopy(conv.id)}
                        className="p-1.5 rounded-md hover:bg-surface-variant text-muted hover:text-foreground transition-colors duration-150"
                        title="Copy conversation"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleExportConversation(conv.id)}
                        className="p-1.5 rounded-md hover:bg-surface-variant text-muted hover:text-foreground transition-colors duration-150"
                        title="Export as JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setHistoryDeleteTarget(conv)}
                        className="p-1.5 rounded-md hover:bg-surface-variant text-destructive hover:text-destructive transition-colors duration-150"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Second confirmation before deleting a conversation */}
          <ConfirmDialog
            open={historyDeleteTarget !== null}
            title="Delete conversation"
            message={`Delete "${historyDeleteTarget?.title || "this conversation"}" and all of its messages? This cannot be undone.`}
            confirmText="Delete"
            onCancel={() => setHistoryDeleteTarget(null)}
            onConfirm={async () => {
              if (historyDeleteTarget) await handleHistoryDelete(historyDeleteTarget.id);
              setHistoryDeleteTarget(null);
            }}
          />
        </div>
      );
    }
    if (activeView === "dashboard") {
      return <DashboardPage />;
    }
    if (activeView === "documentation") {
      return <DocumentationPage />;
    }
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted text-sm">Documentation - Coming soon</p>
      </div>
    );
  };

  return (
    <MainLayout headerContent={renderHeader()}>
      {renderContent()}
    </MainLayout>
  );
}
