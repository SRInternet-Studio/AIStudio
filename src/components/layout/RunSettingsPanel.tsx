"use client";

import { useChatStore } from "@/store/chatStore";
import { ChevronDown, ChevronUp, Edit2, X, Plus, Trash2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AVAILABLE_MODELS } from "@/lib/models";
import type { SafetySetting, SafetyThreshold, HarmCategory, SystemTemplate } from "@/types";

const TOOLS_LIST = [
  { key: "structured_outputs" as const, label: "Structured outputs" },
  { key: "code_execution" as const, label: "Code execution" },
  { key: "function_calling" as const, label: "Function calling" },
  { key: "grounding_google_search" as const, label: "Grounding with Google Search" },
  { key: "grounding_google_maps" as const, label: "Grounding with Google Maps" },
  { key: "url_context" as const, label: "URL context" },
];

const THINKING_LEVELS = [
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const SAFETY_CATEGORIES: { key: HarmCategory; label: string }[] = [
  { key: "harassment", label: "Harassment" },
  { key: "hate_speech", label: "Hate" },
  { key: "sexually_explicit", label: "Sexually Explicit" },
  { key: "dangerous_content", label: "Dangerous Content" },
];

const THRESHOLD_OPTIONS: { value: SafetyThreshold; label: string }[] = [
  { value: "block_none", label: "None" },
  { value: "block_low_and_above", label: "Low" },
  { value: "block_medium_and_above", label: "Medium" },
  { value: "block_only_high", label: "High" },
];

export default function RunSettingsPanel() {
  const {
    settings,
    setSettings,
    isRunSettingsOpen,
    setIsRunSettingsOpen,
    systemTemplates,
    setSystemTemplates,
    isSafetySettingsOpen,
    setIsSafetySettingsOpen,
    isSystemTemplateManagerOpen,
    setIsSystemTemplateManagerOpen,
    isModelSelectorOpen,
    setIsModelSelectorOpen,
  } = useChatStore();

  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [modelCategory, setModelCategory] = useState("Featured");
  const [templateTitle, setTemplateTitle] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<SystemTemplate | null>(null);

  // Load templates on mount
  useEffect(() => {
    fetch("/api/system-templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setSystemTemplates(data.data);
        }
      })
      .catch(console.error);
  }, [setSystemTemplates]);

  if (!settings) return null;

  const updateSetting = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) => {
    setSettings({ ...settings, [key]: value, updated_at: new Date().toISOString() });
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
  };

  const toggleTool = (toolKey: keyof typeof settings.tools_config) => {
    const newTools = { ...settings.tools_config, [toolKey]: !settings.tools_config[toolKey] };
    updateSetting("tools_config", newTools);
  };

  const updateSafetySetting = (type: HarmCategory, threshold: SafetyThreshold) => {
    const newSafety = settings.safety_settings.map((s) =>
      s.type === type ? { ...s, threshold } : s
    );
    updateSetting("safety_settings", newSafety);
  };

  const handleSaveTemplate = async () => {
    const body = {
      title: templateTitle || "Untitled",
      content: settings.system_instructions,
    };

    if (editingTemplate) {
      await fetch("/api/system-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTemplate.id, ...body }),
      });
    } else {
      await fetch("/api/system-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    // Reload templates
    const res = await fetch("/api/system-templates");
    const data = await res.json();
    if (data.success) setSystemTemplates(data.data);
    setTemplateTitle("");
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = async (id: string) => {
    await fetch(`/api/system-templates?id=${id}`, { method: "DELETE" });
    const res = await fetch("/api/system-templates");
    const data = await res.json();
    if (data.success) setSystemTemplates(data.data);
  };

  const handleSelectTemplate = (template: SystemTemplate) => {
    updateSetting("system_instructions", template.content);
    setIsSystemTemplateManagerOpen(false);
  };

  const filteredModels = AVAILABLE_MODELS.filter((m) => {
    const matchesSearch =
      !modelSearch ||
      m.displayName.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase());
    const matchesCategory =
      modelCategory === "All" ||
      modelCategory === "Starred" ||
      m.category === modelCategory ||
      (modelCategory === "Gemini" && m.id.includes("gemini"));
    return matchesSearch && matchesCategory;
  });

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === settings.selected_model);

  return (
    <>
      <aside
        className={cn(
          "w-[320px] min-w-[320px] bg-background border-l border-border h-dvh md:h-screen overflow-y-auto transition-all duration-300 ease-in-out relative",
          "pb-20", // Add bottom padding to ensure all content is scrollable
          !isRunSettingsOpen && "w-0 min-w-0 overflow-hidden border-l-0"
        )}
      >
        {/* Close button */}
        <button
          onClick={() => setIsRunSettingsOpen(false)}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-md hover:bg-surface-variant transition-colors text-muted hover:text-foreground"
          title="Close Run Settings"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-4 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Run settings</h2>
          </div>

          {/* Model Selection */}
          <div className="panel p-3 space-y-2">
            <button
              onClick={() => setIsModelSelectorOpen(true)}
              className="w-full text-left"
            >
              <label className="text-sm font-medium text-foreground block">
                {currentModel?.displayName || settings.selected_model}
              </label>
              <p className="text-xs text-muted">
                {currentModel?.description || "AI model"}
              </p>
            </button>
            <div className="text-xs text-muted bg-input rounded-lg px-3 py-2">
              {settings.selected_model}
            </div>
          </div>

          {/* System Instructions */}
          <div className="panel p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                System instructions
              </label>
              <button
                onClick={() => setIsSystemTemplateManagerOpen(true)}
                className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
              >
                <Save className="w-3 h-3" /> Saved
              </button>
            </div>
            <p className="text-xs text-muted">
              Optional tone and style instructions for the model
            </p>
            <textarea
              value={settings.system_instructions}
              onChange={(e) => updateSetting("system_instructions", e.target.value)}
              placeholder="Enter system instructions..."
              rows={4}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Temperature</label>
              <span className="text-sm text-muted">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => updateSetting("temperature", parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Thinking Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Thinking level</label>
            <select
              value={settings.thinking_level}
              onChange={(e) =>
                updateSetting("thinking_level", e.target.value as typeof settings.thinking_level)
              }
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {THINKING_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tools */}
          <div className="space-y-2">
            <button
              onClick={() => setToolsExpanded(!toolsExpanded)}
              className="flex items-center justify-between w-full text-sm font-medium text-foreground"
            >
              <span>Tools</span>
              {toolsExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {toolsExpanded && (
              <div className="space-y-1">
                {TOOLS_LIST.map((tool) => (
                  <div
                    key={tool.key}
                    className="flex items-center justify-between py-2 px-1"
                  >
                    <div className="flex-1">
                      <span className="text-sm text-foreground">{tool.label}</span>
                      {(tool.key === "structured_outputs" || tool.key === "function_calling") && (
                        <button className="text-xs text-accent ml-2 hover:text-accent-hover">
                          Edit
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => toggleTool(tool.key)}
                      className={cn(
                        "relative w-10 h-5 rounded-full transition-colors",
                        settings.tools_config[tool.key] ? "bg-primary" : "bg-border"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                          settings.tools_config[tool.key] ? "left-5.5" : "left-0.5"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="space-y-2">
            <button
              onClick={() => setAdvancedExpanded(!advancedExpanded)}
              className="flex items-center justify-between w-full text-sm text-muted hover:text-foreground transition-colors"
            >
              <span>Advanced settings</span>
              {advancedExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {advancedExpanded && (
              <div className="space-y-3 panel p-3">
                {/* Safety Settings */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Safety settings</span>
                  <button
                    onClick={() => setIsSafetySettingsOpen(true)}
                    className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>

                {/* Top-P */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-foreground">Top-P</label>
                    <span className="text-xs text-muted">{settings.top_p}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.top_p}
                    onChange={(e) => updateSetting("top_p", parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Top-K */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Top-K</span>
                  <input
                    type="number"
                    min="1"
                    value={settings.top_k}
                    onChange={(e) => updateSetting("top_k", parseInt(e.target.value) || 1)}
                    className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground w-20 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                {/* Max Output Tokens */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Output length</span>
                  <input
                    type="number"
                    min="1"
                    value={settings.max_output_tokens}
                    onChange={(e) =>
                      updateSetting("max_output_tokens", parseInt(e.target.value) || 1)
                    }
                    className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground w-24 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Safety Settings Dialog */}
      {isSafetySettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsSafetySettingsOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">Run safety settings</h2>
              <button
                onClick={() => setIsSafetySettingsOpen(false)}
                className="text-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted mb-2">
              Adjust how likely you are to see responses that could be harmful. Content is blocked based on the probability that it is harmful. This only applies to text outputs.
            </p>
            <p className="text-sm text-muted mb-5">
              You are responsible for ensuring that safety settings for your intended use case comply with the Terms and Use Policy.
            </p>

            <div className="space-y-4">
              {SAFETY_CATEGORIES.map((cat) => {
                const current = settings.safety_settings.find((s) => s.type === cat.key);
                const threshold = current?.threshold || "block_none";
                return (
                  <div key={cat.key} className="border-b border-border pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground">{cat.label}</span>
                      <span className="text-sm text-muted">{THRESHOLD_OPTIONS.find(t => t.value === threshold)?.label || threshold}</span>
                    </div>
                    <div className="flex gap-2">
                      {THRESHOLD_OPTIONS.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => updateSafetySetting(cat.key, t.value)}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            threshold === t.value
                              ? "bg-primary text-primary-foreground"
                              : "bg-input text-muted hover:bg-surface-variant"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => {
                  const defaults: SafetySetting[] = [
                    { type: "harassment", threshold: "block_none" },
                    { type: "hate_speech", threshold: "block_none" },
                    { type: "sexually_explicit", threshold: "block_none" },
                    { type: "dangerous_content", threshold: "block_none" },
                  ];
                  updateSetting("safety_settings", defaults);
                }}
                className="btn-ghost text-sm"
              >
                Reset defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Template Manager Dialog */}
      {isSystemTemplateManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              setIsSystemTemplateManagerOpen(false);
              setEditingTemplate(null);
              setTemplateTitle("");
            }}
          />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[80vh] overflow-y-auto scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">System instructions</h2>
              <button
                onClick={() => {
                  setIsSystemTemplateManagerOpen(false);
                  setEditingTemplate(null);
                  setTemplateTitle("");
                }}
                className="text-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Save current as template */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="Template name..."
                  className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={handleSaveTemplate}
                  className="btn-primary text-sm px-4"
                >
                  {editingTemplate ? "Update" : "Save"}
                </button>
              </div>
            </div>

            {/* Template list */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateTitle("");
                  updateSetting("system_instructions", "");
                }}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-surface-variant transition-colors"
              >
                <p className="text-sm font-medium text-foreground">+ Create new instruction</p>
              </button>

              {systemTemplates.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    settings.system_instructions === template.content
                      ? "bg-surface-variant border-border-light"
                      : "bg-card border-border hover:bg-surface-variant"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <button
                      onClick={() => handleSelectTemplate(template)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium text-foreground">{template.title}</p>
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingTemplate(template);
                          setTemplateTitle(template.title);
                        }}
                        className="p-1 text-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1 text-muted hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {settings.system_instructions === template.content && (
                    <p className="text-xs text-muted line-clamp-2 mt-1">{template.content}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Model Selector Dialog */}
      {isModelSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsModelSelectorOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">Model selection</h2>
              <button
                onClick={() => setIsModelSelectorOpen(false)}
                className="text-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Search for a model or agent"
                className="w-full bg-input border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <svg className="absolute left-3 top-3 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {["Featured", "All", "Gemini", "Images"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setModelCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    modelCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-input text-muted hover:bg-surface-variant"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Model list */}
            <div className="space-y-1">
              {filteredModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    updateSetting("selected_model", model.id);
                    setIsModelSelectorOpen(false);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-colors",
                    settings.selected_model === model.id
                      ? "bg-surface-variant border-border-light"
                      : "bg-card border-border hover:bg-surface-variant"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <span className="text-primary text-sm">✦</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {model.displayName}
                        </span>
                        {model.isNew && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            New
                          </span>
                        )}
                        {model.isPaid && (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                            Paid
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted">{model.id}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted mt-1.5 ml-11">{model.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
