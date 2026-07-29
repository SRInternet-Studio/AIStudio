"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Trash2, GitBranch } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import type { Conversation, Message, Block } from "@/types";

interface BlockActionsProps {
  blockId: string;
  messageId: string;
}

export default function BlockActions({ blockId, messageId }: BlockActionsProps) {
  const [open, setOpen] = useState(false);
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
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleDelete = async () => {
    await fetch(`/api/blocks/${blockId}`, { method: "DELETE" });
    // Reload current conversation messages without full page reload
    const conv = useChatStore.getState().currentConversation;
    if (conv) {
      const res = await fetch(`/api/conversations/${conv.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setMessages(data.data.messages || []);
      }
    }
    setOpen(false);
  };

  const handleBranch = async () => {
    const res = await fetch("/api/conversations/branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: messageId }),
    });
    const data = await res.json();
    if (data.success && data.data) {
      const newConv = data.data as Conversation;
      // Switch to new conversation without page reload
      setCurrentConversation(newConv);
      setActiveView("playground");
      setIsRunSettingsOpen(false);

      // Load new conversation messages
      const msgRes = await fetch(`/api/conversations/${newConv.id}`);
      const msgData = await msgRes.json();
      if (msgData.success && msgData.data) {
        setMessages(msgData.data.messages || []);
      }

      // Refresh conversation list
      const convListRes = await fetch("/api/conversations");
      const convListData = await convListRes.json();
      if (convListData.success) {
        setConversations(convListData.data);
      }
    }
    setOpen(false);
  };

  return (
    <div className="absolute top-2 right-2 z-10" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-surface-variant transition-all text-muted hover:text-foreground"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-xl py-1 w-48 z-50 animate-in fade-in scale-in duration-150">
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
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
