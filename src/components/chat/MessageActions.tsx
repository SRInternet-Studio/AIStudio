"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, RotateCcw, MoreVertical, Trash2, GitBranch } from "lucide-react";
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
    // Delete this message and all after it
    const conv = useChatStore.getState().currentConversation;
    if (conv) {
      await fetch(`/api/messages/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conv.id, from_position: message.position }),
      });
      const res = await fetch(`/api/conversations/${conv.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setMessages(data.data.messages || []);
      }
    }
    setMenuOpen(false);
  };

  return (
    <div className="flex items-center gap-1 mb-2">
      {/* Edit button */}
      <button
        onClick={() => onEdit(message)}
        disabled={disabled}
        className="p-2 rounded-full bg-surface-variant/80 border border-border/50 text-muted hover:text-foreground hover:bg-surface-variant transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Edit message"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {/* Rerun button */}
      <button
        onClick={() => onRerun(message)}
        disabled={disabled}
        className="p-2 rounded-full bg-surface-variant/80 border border-border/50 text-muted hover:text-foreground hover:bg-surface-variant transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Rerun this turn"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* More options */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={disabled}
          className="p-2 rounded-full bg-surface-variant/80 border border-border/50 text-muted hover:text-foreground hover:bg-surface-variant transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          title="More options"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl py-1 w-48 z-50 animate-in fade-in scale-in duration-150">
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
