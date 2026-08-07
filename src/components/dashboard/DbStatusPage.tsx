"use client";

import { useState, useEffect } from "react";
import { Database, Table, HardDrive, MessageSquare, FileText, Layers, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DbStats } from "@/types";

export default function DbStatusPage() {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const res = await fetch("/api/db-stats");
    const data = await res.json();
    if (data.success) setStats(data.data);
    setLoading(false);
  };

  if (loading) return <div className="p-6"><p className="text-muted text-sm">Loading...</p></div>;
  if (!stats) return <div className="p-6"><p className="text-destructive text-sm">Failed to load stats</p></div>;

  const summaryCards = [
    { label: "Database Size", value: stats.db_size_formatted, icon: HardDrive, color: "text-blue-400" },
    { label: "Conversations", value: stats.total_conversations, icon: MessageSquare, color: "text-green-400" },
    { label: "Messages", value: stats.total_messages, icon: FileText, color: "text-purple-400" },
    { label: "Blocks", value: stats.total_blocks, icon: Layers, color: "text-amber-400" },
    { label: "Templates", value: stats.total_templates, icon: FileText, color: "text-pink-400" },
    { label: "API Configs", value: stats.total_api_configs, icon: Key, color: "text-cyan-400" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-foreground">Database Status</h2>
        <button onClick={loadStats} className="btn-ghost text-sm">Refresh</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="panel p-4 space-y-2">
            <card.icon className={cn("w-4 h-4", card.color)} />
            <p className="text-xs text-muted">{card.label}</p>
            <p className="text-lg font-medium text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tables Detail */}
      <div className="panel overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Table className="w-4 h-4 text-accent" /> Tables
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-variant">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Table</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted">Records</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted">Est. Size</th>
              </tr>
            </thead>
            <tbody>
              {stats.tables.map((table) => (
                <tr key={table.name} className="border-b border-border/50 hover:bg-surface-variant/50 transition-colors">
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{table.name}</td>
                  <td className="px-4 py-3 text-right text-foreground">{table.count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted">{table.size_estimate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Context window behavior */}
      <div className="panel p-4 space-y-2">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Database className="w-4 h-4 text-accent" /> Sliding Window + RAG
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          Each request rebuilds the context from the database and fits it into the
          model&apos;s context window with a sliding window: the newest messages are kept,
          the oldest are left out of the API request. Excluded messages are never
          deleted — they remain in the database and stay visible in the conversation.
        </p>
        <p className="text-xs text-muted leading-relaxed">
          When the window trims messages, RAG (Retrieval-Augmented Generation) keeps the
          excluded history reachable: trimmed messages are embedded into vectors and
          stored in the <span className="font-mono">message_embeddings</span> table, then
          semantically retrieved against the current user message and injected into the
          system prompt within a reserved token budget. RAG can be enabled/disabled and
          its embedding provider, model and Top-K configured in the settings panel.
        </p>
      </div>
    </div>
  );
}
