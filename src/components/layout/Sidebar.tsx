"use client";

import { useChatStore } from "@/store/chatStore";
import {
  Compass,
  Clock,
  LayoutDashboard,
  FileText,
  ChevronRight,
  ExternalLink,
  Menu,
  Trash2,
  Pencil,
  Check,
  X as XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import type { Conversation } from "@/types";

const exploreItems = [
  { id: "playground" as const, label: "Playground", icon: Compass },
  { id: "history" as const, label: "History", icon: Clock },
];

const manageItems = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, hasArrow: true },
  { id: "documentation" as const, label: "Documentation", icon: FileText, hasExternal: true },
];

export default function Sidebar() {
  const {
    activeView,
    setActiveView,
    isSidebarOpen,
    setIsSidebarOpen,
    conversations,
    currentConversation,
    setCurrentConversation,
    setConversations,
    setMessages,
  } = useChatStore();

  // Sidebar rename state
  const [sidebarRenamingId, setSidebarRenamingId] = useState<string | null>(null);
  const [sidebarRenameTitle, setSidebarRenameTitle] = useState("");

  const [historyHover, setHistoryHover] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close history popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryHover(false);
      }
    };
    if (historyHover) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [historyHover]);

  // Handle mouse enter/leave for the History button + popup area
  const handleHistoryEnter = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    setHoverTimer(null);
    setHistoryHover(true);
  };

  const handleHistoryLeave = () => {
    const timer = setTimeout(() => setHistoryHover(false), 250);
    setHoverTimer(timer);
  };

  const handleSelectConversation = (conv: Conversation) => {
    if (sidebarRenamingId) return; // Don't select while renaming
    setCurrentConversation(conv);
    setActiveView("playground");
    setHistoryHover(false);
  };

  const refreshConversations = async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    if (data.success && data.data) setConversations(data.data);
  };

  const handleSidebarRename = async (convId: string) => {
    if (!sidebarRenameTitle.trim()) {
      setSidebarRenamingId(null);
      return;
    }
    await fetch(`/api/conversations/${convId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: sidebarRenameTitle.trim() }),
    });
    setSidebarRenamingId(null);
    setSidebarRenameTitle("");
    await refreshConversations();
  };

  const handleSidebarDelete = async (convId: string) => {
    await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
    if (currentConversation?.id === convId) {
      setCurrentConversation(null);
      setMessages([]);
    }
    await refreshConversations();
  };

  const recentConversations = conversations.slice(0, 5);

  return (
    <aside
      className={cn(
        "bg-sidebar border-r border-border flex flex-col h-dvh md:h-screen transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-[200px] min-w-[200px]" : "w-0 min-w-0 overflow-hidden border-r-0"
      )}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2">
        <span className="text-lg font-medium text-foreground">AI Studio</span>
        <ChevronRight className="w-4 h-4 text-muted" />
      </div>

      {/* Explore Section */}
      <div className="px-3 mt-2">
        <p className="text-xs font-medium text-muted uppercase tracking-wider px-2 mb-1">
          Explore
        </p>
        {exploreItems.map((item) => (
          <div key={item.id} className="relative" ref={item.id === "history" ? historyRef : undefined}>
            <button
              onClick={() => setActiveView(item.id)}
              onMouseEnter={item.id === "history" ? handleHistoryEnter : undefined}
              onMouseLeave={item.id === "history" ? handleHistoryLeave : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
                activeView === item.id
                  ? "bg-sidebar-active text-foreground"
                  : "text-muted-foreground hover:bg-surface-variant hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>

            {/* History hover popup */}
            {item.id === "history" && historyHover && recentConversations.length > 0 && (
              <div
                ref={popupRef}
                onMouseEnter={handleHistoryEnter}
                onMouseLeave={handleHistoryLeave}
                className="absolute left-full top-0 ml-2 bg-card border border-border rounded-xl shadow-2xl py-2 w-72 z-50 animate-in fade-in slide-in-from-left-2 duration-200"
              >
                <p className="text-xs font-medium text-muted uppercase tracking-wider px-3 mb-2">
                  Recent
                </p>
                {recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group/conv flex items-center gap-1 px-3 py-2 transition-colors duration-150 rounded-md",
                      currentConversation?.id === conv.id
                        ? "bg-surface-variant text-foreground"
                        : "text-foreground hover:bg-surface-variant"
                    )}
                  >
                    {sidebarRenamingId === conv.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="text"
                          value={sidebarRenameTitle}
                          onChange={(e) => setSidebarRenameTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSidebarRename(conv.id);
                            if (e.key === "Escape") { setSidebarRenamingId(null); setSidebarRenameTitle(""); }
                          }}
                          onBlur={() => handleSidebarRename(conv.id)}
                          className="flex-1 bg-transparent text-sm text-foreground border-b border-primary focus:outline-none min-w-0"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSelectConversation(conv)}
                          className="flex-1 text-left min-w-0"
                        >
                          <span className="truncate block text-sm">{conv.title}</span>
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/conv:opacity-100 transition-opacity duration-150 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSidebarRenamingId(conv.id); setSidebarRenameTitle(conv.title); }}
                            className="p-1 rounded hover:bg-surface-variant text-muted hover:text-foreground transition-colors duration-150"
                            title="Rename"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSidebarDelete(conv.id); }}
                            className="p-1 rounded hover:bg-surface-variant text-destructive transition-colors duration-150"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Manage Section */}
      <div className="px-3 mt-4">
        <p className="text-xs font-medium text-muted uppercase tracking-wider px-2 mb-1">
          Manage
        </p>
        {manageItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
              activeView === item.id
                ? "bg-sidebar-active text-foreground"
                : "text-muted-foreground hover:bg-surface-variant hover:text-foreground"
            )}
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.hasArrow && <ChevronRight className="w-3 h-3" />}
            {item.hasExternal && <ExternalLink className="w-3 h-3" />}
          </button>
        ))}
      </div>
    </aside>
  );
}
