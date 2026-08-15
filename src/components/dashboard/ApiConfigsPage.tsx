"use client";

import { useState, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { Plus, Trash2, Edit2, Save, X, Key, Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import type { ApiConfig } from "@/types";

export default function ApiConfigsPage() {
  const { apiConfigs, setApiConfigs } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ base_url: "", api_key: "", label: "", protocol: "openai" as const, model: "" });
  // API config pending delete confirmation (replaces native confirm()).
  const [deleteTarget, setDeleteTarget] = useState<ApiConfig | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    const res = await fetch("/api/api-configs");
    const data = await res.json();
    if (data.success) setApiConfigs(data.data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.base_url || !form.api_key) return;
    const url = editingId ? "/api/api-configs" : "/api/api-configs";
    const method = editingId ? "PUT" : "POST";
    const body = editingId ? { id: editingId, ...form } : form;

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setForm({ base_url: "", api_key: "", label: "", protocol: "openai", model: "" });
    setEditingId(null);
    setShowForm(false);
    await loadConfigs();
  };

  const handleEdit = (config: ApiConfig) => {
    setForm({
      base_url: config.base_url,
      api_key: config.api_key,
      label: config.label,
      protocol: config.protocol as any,
      model: config.model,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/api-configs?id=${id}`, { method: "DELETE" });
    await loadConfigs();
  };

  // Group configs by base_url
  const groupedConfigs = apiConfigs.reduce((acc, config) => {
    if (!acc[config.base_url]) acc[config.base_url] = [];
    acc[config.base_url].push(config);
    return acc;
  }, {} as Record<string, ApiConfig[]>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-foreground">API Configs</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ base_url: "", api_key: "", label: "", protocol: "openai", model: "" }); }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Config
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="panel p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground">{editingId ? "Edit Config" : "New Config"}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-muted hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Base URL</label>
              <input
                value={form.base_url}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">API Key</label>
              <input
                value={form.api_key}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                placeholder="sk-..."
                type="password"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Label</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="My API Key"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Protocol</label>
              <select
                value={form.protocol}
                onChange={(e) => setForm({ ...form, protocol: e.target.value as any })}
                className="input-field w-full"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted mb-1 block">Model</label>
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="gpt-4o, gemini-3.5-flash..."
                className="input-field w-full"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleSubmit} className="btn-primary text-sm flex items-center gap-1">
              <Save className="w-3 h-3" /> {editingId ? "Update" : "Save"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">Loading...</p>
      ) : apiConfigs.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-muted text-sm">No API configs yet. Click &quot;Add Config&quot; to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedConfigs).map(([baseUrl, configs]) => (
            <div key={baseUrl} className="panel p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Globe className="w-4 h-4 text-accent" />
                <span className="truncate">{baseUrl}</span>
                <span className="text-xs text-muted ml-auto">{configs.length} key(s)</span>
              </div>
              <div className="space-y-2">
                {configs.map((config) => (
                  <div key={config.id} className="bg-surface-variant rounded-lg p-3 flex items-center gap-3">
                    <Key className="w-4 h-4 text-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {config.label || config.api_key.slice(0, 8) + "..."}
                      </p>
                      <p className="text-xs text-muted">
                        {config.protocol} • {config.model || "N/A"} • Last used: {config.last_used_at ? new Date(config.last_used_at).toLocaleDateString() : "Never"}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleEdit(config)} className="p-1.5 rounded-md hover:bg-card transition-colors text-muted hover:text-foreground">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(config)} className="p-1.5 rounded-md hover:bg-card transition-colors text-muted hover:text-destructive" title="Delete config">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Second confirmation replaces the native confirm() dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete API config"
        message={`Delete the API config "${deleteTarget?.label || deleteTarget?.base_url || "this config"}"? This cannot be undone.`}
        confirmText="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
