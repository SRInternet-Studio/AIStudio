"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import MainLayout from "@/components/layout/MainLayout";
import ChatArea from "@/components/chat/ChatArea";
import InputBox from "@/components/chat/InputBox";
import ApiConfigDialog from "@/components/settings/ApiConfigDialog";
import ToolSelector from "@/components/settings/ToolSelector";
import DashboardPage from "@/components/dashboard/DashboardPage";
import { useChatStore } from "@/store/chatStore";
import { exportConversation, downloadContextFile } from "@/lib/context-io";
import { Plus, ArrowLeft, Copy, Pencil, Trash2, Check, X, Hash, Download, RefreshCw } from "lucide-react";
import { useRouter, usePathname, useParams } from "next/navigation";
import type { Message, Block, Conversation } from "@/types";

interface AppShellProps {
  initialView?: "playground" | "history" | "dashboard" | "documentation";
  initialConversationId?: string;
}

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
  } = useChatStore();

  const [messagesWithBlocks, setMessagesWithBlocks] = useState<
    (Message & { blocks: Block[] })[]
  >([]);

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

  // Track if we're navigating to prevent route sync loop (Bug 3 fix)
  const isNavigatingRef = useRef(false);

  // Sync route to store state (Bug 3 fix: use isNavigatingRef to prevent loop)
  useEffect(() => {
    console.log("[AppShell] Route sync effect:", pathname, "params:", params, "isNavigating:", isNavigatingRef.current);
    if (initialView === "history") {
      setActiveView("history");
    } else if (initialView === "dashboard") {
      setActiveView("dashboard");
    } else if (initialConversationId) {
      const conv = conversations.find((c) => c.id === initialConversationId);
      if (conv) {
        setCurrentConversation(conv);
        setActiveView("playground");
      }
    } else if (pathname === "/" || pathname === "/prompts/new_chat") {
      // When navigating to new chat, clear current conversation to prevent route loop
      console.log("[AppShell] Navigating to new chat, clearing currentConversation");
      setCurrentConversation(null);
      setActiveView("playground");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync store state to route (Bug 3 fix: use isNavigatingRef guard to prevent loop)
  useEffect(() => {
    if (isNavigatingRef.current) {
      console.log("[AppShell] Route sync skipped - navigation in progress");
      isNavigatingRef.current = false;
      return;
    }
    console.log("[AppShell] Store→Route sync:", { activeView, convId: currentConversation?.id, pathname });
    if (activeView === "history" && pathname !== "/library") {
      isNavigatingRef.current = true;
      router.replace("/library");
    } else if (activeView === "playground" && currentConversation && pathname !== `/prompts/${currentConversation.id}`) {
      isNavigatingRef.current = true;
      router.replace(`/prompts/${currentConversation.id}`);
    } else if (activeView === "playground" && !currentConversation && pathname !== "/" && pathname !== "/prompts/new_chat") {
      isNavigatingRef.current = true;
      router.replace("/");
    }
  }, [activeView, currentConversation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Load messages when conversation changes (Bug 2 fix: clear messageUsage on switch)
  useEffect(() => {
    if (!currentConversation) {
      console.log("[AppShell] No current conversation, clearing messages and token usage");
      setMessages([]);
      setMessagesWithBlocks([]);
      // Clear message usage when no conversation
      useChatStore.getState().setMessageUsage = useChatStore.getState().setMessageUsage; // no-op, usage already empty for new conv
      return;
    }
    console.log("[AppShell] Loading messages for conversation:", currentConversation.id);
    // Clear messageUsage when switching conversations (Bug 2 fix)
    console.log("[AppShell] Clearing messageUsage for conversation switch");
    // Reset messageUsage by setting empty - will be repopulated when messages are sent
    const resetUsage: Record<string, any> = {};
    useChatStore.setState({ messageUsage: resetUsage });

    fetch(`/api/conversations/${currentConversation.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const msgs = data.data.messages || [];
          console.log("[AppShell] Messages loaded:", msgs.length, "messages");
          setMessages(msgs);
          setMessagesWithBlocks(msgs);
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

  const handleSelectConversation = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      isNavigatingRef.current = true; // Prevent route sync loop
      setCurrentConversation(conv);
      setActiveView("playground");
      router.push(`/prompts/${convId}`);
    }
  };

  const handleNewChat = () => {
    isNavigatingRef.current = true; // Prevent route sync loop
    setCurrentConversation(null);
    setMessages([]);
    setMessagesWithBlocks([]);
    setActiveView("playground");
    router.push("/");
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

  // Compute token totals (Bug 2: track if we have usage data for current conversation)
  const currentConvUsageKeys = currentConversation
    ? messages.filter(m => messageUsage[m.id]).map(m => m.id)
    : [];
  const hasUsageData = currentConvUsageKeys.length > 0;
  const totalTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_tokens || 0), 0);
  const totalInputTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_input_tokens || 0), 0);
  const totalOutputTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_output_tokens || 0), 0);
  const totalThoughtTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_thought_tokens || 0), 0);
  console.log("[AppShell] Token totals:", { totalTokens, hasUsageData, usageKeys: Object.keys(messageUsage).length, currentConvId: currentConversation?.id });

  // Refresh token usage by re-fetching conversation messages (Bug 2: refresh button handler)
  const handleRefreshTokenUsage = useCallback(() => {
    if (!currentConversation) return;
    console.log("[AppShell] Refreshing token usage for conversation:", currentConversation.id);
    // Clear current usage and re-fetch
    useChatStore.setState({ messageUsage: {} });
    fetch(`/api/conversations/${currentConversation.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const msgs = data.data.messages || [];
          setMessages(msgs);
          setMessagesWithBlocks(msgs);
          console.log("[AppShell] Token usage refreshed, messages:", msgs.length);
        }
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

          {/* Token count (Bug 1 & 2: boundary-aware popover + uncounted state) */}
          <div className="relative flex-shrink-0" ref={tokenPopoverRef}>
            <button
              onClick={() => {
                // Boundary detection for popover positioning (Bug 1 fix)
                if (tokenPopoverRef.current) {
                  const rect = tokenPopoverRef.current.getBoundingClientRect();
                  const popoverWidth = 256; // w-64 = 16rem = 256px
                  const spaceOnRight = window.innerWidth - rect.right;
                  setPopoverPosition(spaceOnRight < popoverWidth ? "left" : "right");
                }
                setShowTokenPopover(!showTokenPopover);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted hover:text-foreground hover:bg-surface-variant transition-colors duration-150"
              title={hasUsageData ? "View token usage" : "Token usage not available"}
            >
              <Hash className="w-3 h-3" />
              {hasUsageData ? (
                <>
                  <span>{totalTokens.toLocaleString()}</span>
                  <span className="text-[10px] text-muted/60">tokens</span>
                </>
              ) : (
                <span className="text-[10px]">uncounted</span>
              )}
            </button>

            {showTokenPopover && (
              <div
                className={`absolute top-full mt-2 bg-card border border-border rounded-lg shadow-xl p-4 w-64 z-50 animate-in fade-in scale-in duration-150 ${
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
                {hasUsageData ? (
                  <>
                    <div className="space-y-2 text-xs">
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
                      <div className="flex justify-between">
                        <span className="text-muted font-medium">Total tokens:</span>
                        <span className="text-foreground font-bold">{totalTokens.toLocaleString()}</span>
                      </div>
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
                  <div className="text-center py-4">
                    <p className="text-xs text-muted mb-2">Token data not available</p>
                    <p className="text-[10px] text-muted/60 mb-3">Token usage is only tracked for messages sent in the current session.</p>
                    <button
                      onClick={handleRefreshTokenUsage}
                      className="text-xs text-primary hover:text-accent transition-colors"
                    >
                      Try refreshing
                    </button>
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
          <ChatArea messages={messagesWithBlocks} />
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
                        onClick={() => handleHistoryDelete(conv.id)}
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
        </div>
      );
    }
    if (activeView === "dashboard") {
      return <DashboardPage />;
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
