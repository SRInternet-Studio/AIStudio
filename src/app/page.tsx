"use client";

import { useEffect, useState, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import ChatArea from "@/components/chat/ChatArea";
import InputBox from "@/components/chat/InputBox";
import ApiConfigDialog from "@/components/settings/ApiConfigDialog";
import ToolSelector from "@/components/settings/ToolSelector";
import DashboardPage from "@/components/dashboard/DashboardPage";
import { useChatStore } from "@/store/chatStore";
import { Plus, ArrowLeft, Copy, Pencil, Trash2, Check, X, Hash } from "lucide-react";
import type { Message, Block } from "@/types";

export default function Home() {
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
    console.log("[Page] Loading settings...");
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        console.log("[Page] Settings loaded:", data.success ? "OK" : "FAILED",
          data.data ? { baseUrl: data.data.base_url, protocol: data.data.api_protocol, model: data.data.selected_model, hasKey: !!data.data.api_key } : null);
        if (data.success && data.data) setSettings(data.data);
      })
      .catch((err) => console.error("[Page] Settings load failed:", err));
  }, [setSettings]);

  useEffect(() => {
    console.log("[Page] Loading conversations...");
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => {
        console.log("[Page] Conversations loaded:", data.success ? "OK" : "FAILED", "count:", data.data?.length || 0);
        if (data.success && data.data) setConversations(data.data);
      })
      .catch((err) => console.error("[Page] Conversations load failed:", err));
  }, [setConversations]);

  useEffect(() => {
    fetch("/api/system-templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) setSystemTemplates(data.data);
      })
      .catch(console.error);
  }, [setSystemTemplates]);

  useEffect(() => {
    if (!currentConversation) {
      console.log("[Page] No current conversation, clearing messages");
      setMessages([]);
      setMessagesWithBlocks([]);
      return;
    }
    console.log("[Page] Loading messages for conversation:", currentConversation.id, "title:", currentConversation.title);
    fetch(`/api/conversations/${currentConversation.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const msgs = data.data.messages || [];
          console.log("[Page] Messages loaded:", msgs.length, "messages",
            msgs.map((m: any) => ({ id: m.id, role: m.role, blocks: m.blocks?.map((b: any) => ({ type: b.type, pos: b.position })) })));
          setMessages(msgs);
          setMessagesWithBlocks(msgs);
        } else {
          console.error("[Page] Failed to load messages:", data);
        }
      })
      .catch((err) => console.error("[Page] Messages load failed:", err));
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
      setCurrentConversation(conv);
      setActiveView("playground");
    }
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setMessagesWithBlocks([]);
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

  // Compute token totals
  const totalTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_tokens || 0), 0);
  const totalInputTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_input_tokens || 0), 0);
  const totalOutputTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_output_tokens || 0), 0);
  const totalThoughtTokens = Object.values(messageUsage).reduce((acc, u) => acc + (u.total_thought_tokens || 0), 0);

  const renderHeader = () => {
    if (activeView === "dashboard") {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("playground")}
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

          {/* Token count */}
          {totalTokens > 0 && (
            <div className="relative flex-shrink-0" ref={tokenPopoverRef}>
              <button
                onClick={() => setShowTokenPopover(!showTokenPopover)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted hover:text-foreground hover:bg-surface-variant transition-colors duration-150"
                title="View token usage"
              >
                <Hash className="w-3 h-3" />
                <span>{totalTokens.toLocaleString()}</span>
                <span className="text-[10px] text-muted/60">tokens</span>
              </button>

              {showTokenPopover && (
                <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-xl p-4 w-64 z-50 animate-in fade-in scale-in duration-150">
                  <h3 className="text-sm font-medium text-foreground mb-3">Token Usage</h3>
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
                </div>
              )}
            </div>
          )}
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
    <>
      <MainLayout headerContent={renderHeader()}>
        {renderContent()}
      </MainLayout>
      <ApiConfigDialog />
      <ToolSelector />
    </>
  );
}
