"use client";

import { useState, useEffect } from "react";
import { Trash2, Edit2, ChevronRight, ChevronDown, MessageSquare, Eye, Save, X, FolderOpen, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

interface ConvWithCount extends Conversation {
  message_count: number;
}

interface FullConv extends Conversation {
  messages: any[];
}

export default function DbContentPage() {
  const [conversations, setConversations] = useState<ConvWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fullConv, setFullConv] = useState<FullConv | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [dbSize, setDbSize] = useState<string>("");

  useEffect(() => {
    loadConversations();
    loadDbPath();
  }, []);

  const loadDbPath = async () => {
    try {
      const res = await fetch("/api/db-path");
      const data = await res.json();
      if (data.success) {
        setDbPath(data.data.path);
        setDbSize(data.data.sizeFormatted);
      }
    } catch (err) {
      console.error("[DbContentPage] Failed to load DB path:", err);
    }
  };

  const handleDownloadDb = () => {
    console.log("[DbContentPage] Downloading database file...");
    window.open("/api/db-path?download=true", "_blank");
  };

  const loadConversations = async () => {
    setLoading(true);
    const res = await fetch("/api/db-content");
    const data = await res.json();
    if (data.success) setConversations(data.data);
    setLoading(false);
  };

  const loadFullConv = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setFullConv(null);
      return;
    }
    setExpandedId(id);
    const res = await fetch(`/api/db-content?conversation_id=${id}`);
    const data = await res.json();
    if (data.success) setFullConv(data.data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this conversation and all its messages/blocks? This cannot be undone.")) return;
    await fetch(`/api/db-content?conversation_id=${id}`, { method: "DELETE" });
    if (expandedId === id) { setExpandedId(null); setFullConv(null); }
    await loadConversations();
  };

  const handleEditTitle = async (id: string) => {
    await fetch("/api/db-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: editTitleValue }),
    });
    setEditingTitle(null);
    await loadConversations();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-foreground">Database Content</h2>
        <div className="flex items-center gap-2">
          {dbPath && (
            <span className="text-xs text-muted bg-surface-variant px-2 py-1 rounded-md">
              {dbSize} • {dbPath.split("\\").pop() || dbPath.split("/").pop()}
            </span>
          )}
          <button
            onClick={handleDownloadDb}
            className="btn-ghost text-sm flex items-center gap-1"
            title="Download database file"
          >
            <Download className="w-3.5 h-3.5" /> Download DB
          </button>
          <button onClick={loadConversations} className="btn-ghost text-sm">Refresh</button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Loading...</p>
      ) : conversations.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-muted text-sm">No conversations in database.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <div key={conv.id} className="panel overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => loadFullConv(conv.id)}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  {expandedId === conv.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  {editingTitle === conv.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleEditTitle(conv.id)}
                        className="input-field text-sm flex-1"
                        autoFocus
                      />
                      <button onClick={() => handleEditTitle(conv.id)} className="text-accent hover:text-accent-hover">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingTitle(null)} className="text-muted hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground truncate">{conv.title}</p>
                      <span className="text-xs text-muted bg-surface-variant px-2 py-0.5 rounded-full">{conv.message_count} msgs</span>
                    </div>
                  )}
                  <p className="text-xs text-muted mt-0.5">
                    {conv.model} • {new Date(conv.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => { setEditingTitle(conv.id); setEditTitleValue(conv.title); }}
                    className="p-1.5 rounded-md hover:bg-surface-variant transition-colors text-muted hover:text-foreground"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(conv.id)}
                    className="p-1.5 rounded-md hover:bg-surface-variant transition-colors text-muted hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {expandedId === conv.id && fullConv && (
                <div className="border-t border-border bg-surface-variant/30 p-4 space-y-3 animate-in fade-in duration-200">
                  {fullConv.messages.map((msg: any) => (
                    <div key={msg.id} className="bg-card rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          msg.role === "user" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                        )}>
                          {msg.role}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      {msg.blocks?.map((block: any) => (
                        <div key={block.id} className="mt-2 text-xs">
                          <span className="text-muted uppercase tracking-wider">{block.type}: </span>
                          <span className="text-foreground">
                            {block.type === "image" ? "[Image]" : block.content.slice(0, 200)}
                            {block.content.length > 200 ? "..." : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
