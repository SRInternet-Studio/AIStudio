"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, RotateCcw, MoreVertical, Trash2, GitBranch, Copy, FileText } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import type { Message } from "@/types";

interface MessageActionsProps {
  message: Message & { blocks?: any[] };
  onEdit: (message: Message & { blocks?: any[] }) => void;
  onRerun: (message: Message & { blocks?: any[] }) => void;
  disabled?: boolean;
}

export default function MessageActions({ message, onEdit, onRerun, disabled }: MessageActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    setCurrentConversation,
    setActiveView,
    setIsRunSettingsOpen,
    setMessages,
    setConversations,
    setGlobalError,
  } = useChatStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const getTextContent = (): string => {
    const textBlock = message.blocks?.find((b: any) => b.type === "text");
    return textBlock?.content || "";
  };

  const handleCopyAsText = async () => {
    const text = getTextContent();
    // Strip markdown formatting for plain text
    const plainText = text
      .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, "").trim())
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/>\s+/gm, "")
      .replace(/[-*+]\s+/g, "")
      .replace(/^\d+\.\s+/gm, "");
    try {
      await navigator.clipboard.writeText(plainText);
      setGlobalError("Copied as plain text");
      setTimeout(() => setGlobalError(null), 2000);
    } catch {
      setGlobalError("Failed to copy");
      setTimeout(() => setGlobalError(null), 2000);
    }
    setMenuOpen(false);
  };

  const handleCopyAsMarkdown = async () => {
    const text = getTextContent();
    try {
      await navigator.clipboard.writeText(text);
      setGlobalError("Copied as markdown");
      setTimeout(() => setGlobalError(null), 2000);
    } catch {
      setGlobalError("Failed to copy");
      setTimeout(() => setGlobalError(null), 2000);
    }
    setMenuOpen(false);
  };

  const handleBranch = async () => {
    const res = await fetch("/api/conversations/branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: message.id }),
    });
    const data = await res.json();
    if (data.success && data.data) {
      const newConv = data.data;
      setCurrentConversation(newConv);
      setActiveView("playground");
      setIsRunSettingsOpen(false);

      const msgRes = await fetch(`/api/conversations/${newConv.id}`);
      const msgData = await msgRes.json();
      if (msgData.success && msgData.data) {
        setMessages(msgData.data.messages || []);
      }

      const convListRes = await fetch("/api/conversations");
      const convListData = await convListRes.json();
      if (convListData.success) {
        setConversations(convListData.data);
      }
    }
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    const conv = useChatStore.getState().currentConversation;
    if (conv) {
      const res = await fetch(`/api/messages/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conv.id, from_position: message.position - 1 }),
      });
      if (res.ok) {
        // Server-side truncate keeps position <= message.position - 1. Mirror that
        // locally instead of refetching the whole transcript — the old full reload
        // (no ?limit=) re-downloaded and re-rendered EVERY block, freezing the UI
        // for seconds in huge conversations.
        const current = useChatStore.getState().messages;
        setMessages(current.filter((m) => m.position < message.position));
      } else {
        // Truncate failed — resync from the DB as a fallback.
        const fullRes = await fetch(`/api/conversations/${conv.id}`);
        const data = await fullRes.json();
        if (data.success && data.data) {
          setMessages(data.data.messages || []);
        }
      }
    }
    setMenuOpen(false);
  };

  const isUser = message.role === "user";

  return (
    <div className="absolute top-0 right-0 z-10 flex items-center gap-1" ref={menuRef}>
      {/* Edit button */}
      <button
        onClick={() => onEdit(message)}
        disabled={disabled}
        className="p-1.5 rounded-full bg-surface-variant/80 border border-border/50 text-muted hover:text-foreground hover:bg-surface-variant transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Edit message"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {/* Rerun button - only for user messages */}
      {isUser && (
        <button
          onClick={() => onRerun(message)}
          disabled={disabled}
          className="p-1.5 rounded-full bg-surface-variant/80 border border-border/50 text-muted hover:text-foreground hover:bg-surface-variant transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Rerun this turn"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}

      {/* More options - for ALL messages */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={disabled}
          className="p-1.5 rounded-full bg-surface-variant/80 border border-border/50 text-muted hover:text-foreground hover:bg-surface-variant transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          title="More options"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl py-1 w-52 z-50 animate-in fade-in scale-in duration-150">
            {/* Copy options - for all messages with text content */}
            {getTextContent() && (
              <>
                <button
                  onClick={handleCopyAsText}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-variant transition-colors duration-150"
                >
                  <Copy className="w-4 h-4 text-muted" />
                  Copy as text
                </button>
                <button
                  onClick={handleCopyAsMarkdown}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-variant transition-colors duration-150"
                >
                  <FileText className="w-4 h-4 text-muted" />
                  Copy as markdown
                </button>
                <div className="border-t border-border my-1" />
              </>
            )}
            <button
              onClick={handleBranch}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-variant transition-colors duration-150"
            >
              <GitBranch className="w-4 h-4 text-accent" />
              Branch from here
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-surface-variant transition-colors duration-150"
            >
              <Trash2 className="w-4 h-4" />
              Delete from here
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
