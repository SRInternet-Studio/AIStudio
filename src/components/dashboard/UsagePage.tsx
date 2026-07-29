"use client";

import { useState, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { BarChart3, TrendingUp, MessageSquare, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UsageStat } from "@/types";

export default function UsagePage() {
  const { usageStats, setUsageStats, apiConfigs } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const [selectedConfig, setSelectedConfig] = useState("");

  useEffect(() => {
    loadStats();
  }, [range, selectedConfig]);

  const loadStats = async () => {
    setLoading(true);
    const params = new URLSearchParams({ range });
    if (selectedConfig) params.set("api_config_id", selectedConfig);
    const res = await fetch(`/api/usage-stats?${params}`);
    const data = await res.json();
    if (data.success) setUsageStats(data.data);
    setLoading(false);
  };

  // Aggregate stats
  const totalInputTokens = usageStats.reduce((sum, s) => sum + (s.input_tokens || 0), 0);
  const totalOutputTokens = usageStats.reduce((sum, s) => sum + (s.output_tokens || 0), 0);
  const totalRequests = usageStats.reduce((sum, s) => sum + (s.request_count || 0), 0);
  const totalConversations = usageStats.reduce((sum, s) => sum + (s.conversation_count || 0), 0);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  const statCards = [
    { label: "Input Tokens", value: formatNumber(totalInputTokens), icon: Cpu, color: "text-blue-400" },
    { label: "Output Tokens", value: formatNumber(totalOutputTokens), icon: TrendingUp, color: "text-green-400" },
    { label: "Total Requests", value: formatNumber(totalRequests), icon: BarChart3, color: "text-purple-400" },
    { label: "Conversations", value: formatNumber(totalConversations), icon: MessageSquare, color: "text-amber-400" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-medium text-foreground">Usage Statistics</h2>
        <div className="flex items-center gap-2">
          <select
            value={selectedConfig}
            onChange={(e) => setSelectedConfig(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">All Configs</option>
            {apiConfigs.map((c) => (
              <option key={c.id} value={c.id}>{c.label || c.base_url}</option>
            ))}
          </select>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="input-field text-sm"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="panel p-4 space-y-2">
            <div className="flex items-center gap-2">
              <card.icon className={cn("w-4 h-4", card.color)} />
              <span className="text-xs text-muted">{card.label}</span>
            </div>
            <p className="text-2xl font-medium text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Stats Table */}
      {loading ? (
        <p className="text-muted text-sm">Loading...</p>
      ) : usageStats.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-muted text-sm">No usage data yet. Stats are recorded when you use the API.</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-variant">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted">Model</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted">Input Tokens</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted">Output Tokens</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted">Requests</th>
                </tr>
              </thead>
              <tbody>
                {usageStats.map((stat) => (
                  <tr key={stat.id} className="border-b border-border/50 hover:bg-surface-variant/50 transition-colors">
                    <td className="px-4 py-3 text-foreground">{stat.date}</td>
                    <td className="px-4 py-3 text-foreground">{stat.model || "N/A"}</td>
                    <td className="px-4 py-3 text-right text-foreground">{formatNumber(stat.input_tokens)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{formatNumber(stat.output_tokens)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{stat.request_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
