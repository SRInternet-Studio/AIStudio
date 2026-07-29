"use client";

import { useChatStore } from "@/store/chatStore";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

export default function ApiConfigDialog() {
  const { isSettingsOpen, setIsSettingsOpen, settings, setSettings } = useChatStore();
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [protocol, setProtocol] = useState<"openai" | "gemini">("openai");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setBaseUrl(settings.base_url);
      setApiKey(settings.api_key);
      setProtocol(settings.api_protocol);
    }
  }, [settings, isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_url: baseUrl,
          api_key: apiKey,
          api_protocol: protocol,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
        setIsSettingsOpen(false);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsSettingsOpen(false)}
      />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-foreground">API Configuration</h2>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Protocol */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">API Protocol</label>
            <div className="flex gap-2">
              {(["openai", "gemini"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProtocol(p)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    protocol === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-input text-muted-foreground hover:bg-surface-variant"
                  }`}
                >
                  {p === "openai" ? "OpenAI Compatible" : "Gemini Native"}
                </button>
              ))}
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={
                protocol === "openai"
                  ? "https://api.openai.com"
                  : "https://generativelanguage.googleapis.com"
              }
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted">
              {protocol === "openai"
                ? "Supports OpenAI /v1/chat/completions compatible APIs"
                : "Google Gemini API endpoint"}
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !baseUrl}
            className="w-full btn-primary py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
