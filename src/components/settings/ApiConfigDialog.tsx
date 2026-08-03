"use client";

import { useChatStore } from "@/store/chatStore";
import { X, ChevronDown, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { ApiConfig } from "@/types";

export default function ApiConfigDialog() {
  const { isSettingsOpen, setIsSettingsOpen, settings, setSettings, apiConfigs, setApiConfigs } = useChatStore();
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [protocol, setProtocol] = useState<"openai" | "gemini">("openai");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavedConfigs, setShowSavedConfigs] = useState(false);
  const savedConfigsRef = useRef<HTMLDivElement>(null);

  // Load API configs from backend when dialog opens
  useEffect(() => {
    if (isSettingsOpen) {
      fetch("/api/api-configs")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setApiConfigs(data.data);
        })
        .catch(console.error);
    }
  }, [isSettingsOpen, setApiConfigs]);

  // Close saved configs dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (savedConfigsRef.current && !savedConfigsRef.current.contains(e.target as Node)) {
        setShowSavedConfigs(false);
      }
    };
    if (showSavedConfigs) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSavedConfigs]);

  useEffect(() => {
    if (settings) {
      setBaseUrl(settings.base_url);
      setApiKey(settings.api_key);
      setProxyUrl(settings.proxy_url || "");
      setProtocol(settings.api_protocol);
    }
  }, [settings, isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleSave = async () => {
    if (!baseUrl.trim() || !apiKey.trim()) {
      setError("Base URL and API Key are required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_url: baseUrl.trim(),
          api_key: apiKey.trim(),
          api_protocol: protocol,
          proxy_url: proxyUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);

        // Problem 1: Sync to Dashboard API Configs — save as a new config entry
        console.log("[ApiConfigDialog] Syncing config to Dashboard API Configs...");
        const syncRes = await fetch("/api/api-configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base_url: baseUrl.trim(),
            api_key: apiKey.trim(),
            label: `Config - ${baseUrl.trim().replace(/^https?:\/\//, "").slice(0, 30)}`,
            protocol,
            model: settings?.selected_model || "",
          }),
        });
        const syncData = await syncRes.json();
        if (syncData.success) {
          console.log("[ApiConfigDialog] Config synced to Dashboard successfully");
          // Refresh apiConfigs in store
          const configsRes = await fetch("/api/api-configs");
          const configsData = await configsRes.json();
          if (configsData.success) setApiConfigs(configsData.data);
        } else {
          console.warn("[ApiConfigDialog] Failed to sync config to Dashboard:", syncData.error);
        }

        setIsSettingsOpen(false);
        setError(null);
      } else {
        setError(data.error || "Failed to save settings");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  // Problem 2: Select a saved config to auto-fill the form
  const handleSelectSavedConfig = (config: ApiConfig) => {
    console.log("[ApiConfigDialog] Selected saved config:", config.label || config.base_url);
    setBaseUrl(config.base_url);
    setApiKey(config.api_key);
    setProtocol(config.protocol as "openai" | "gemini");
    setProxyUrl(""); // Proxy is not stored in api_configs
    setShowSavedConfigs(false);
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
          {/* Saved Configs Selector (Problem 2) */}
          {apiConfigs.length > 0 && (
            <div className="space-y-1.5" ref={savedConfigsRef}>
              <label className="text-sm font-medium text-foreground">Saved Configurations</label>
              <div className="relative">
                <button
                  onClick={() => setShowSavedConfigs(!showSavedConfigs)}
                  className="w-full flex items-center justify-between bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-surface-variant transition-colors"
                >
                  <span className="text-muted">Select a saved configuration...</span>
                  <ChevronDown className={"w-4 h-4 text-muted transition-transform " + (showSavedConfigs ? "rotate-180" : "")} />
                </button>
                {showSavedConfigs && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                    {apiConfigs.map((config) => (
                      <button
                        key={config.id}
                        onClick={() => handleSelectSavedConfig(config)}
                        className="w-full text-left px-3 py-2 hover:bg-surface-variant transition-colors border-b border-border last:border-b-0"
                      >
                        <p className="text-sm text-foreground truncate">
                          {config.label || config.base_url}
                        </p>
                        <p className="text-xs text-muted">
                          {config.protocol} • {config.base_url.slice(0, 50)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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

          {/* Proxy URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">HTTP/HTTPS Proxy <span className="text-muted font-normal">(Optional)</span></label>
            <input
              type="text"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="http://127.0.0.1:7890"
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted">Proxy address for external API requests (e.g. http://127.0.0.1:7890)</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !baseUrl.trim() || !apiKey.trim()}
            className="w-full btn-primary py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
