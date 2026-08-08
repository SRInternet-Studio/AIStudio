"use client";

import { useChatStore } from "@/store/chatStore";
import { ChevronDown, ChevronUp, Edit2, X, Plus, Trash2, Save, RefreshCw, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getModelContextWindow } from "@/lib/models";
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

// Default safety categories — used to seed the settings when the stored array is empty
// (legacy DB rows), so the options are clickable without pressing "Reset defaults" first.
const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
  { type: "harassment", threshold: "block_none" },
  { type: "hate_speech", threshold: "block_none" },
  { type: "sexually_explicit", threshold: "block_none" },
  { type: "dangerous_content", threshold: "block_none" },
];

// Gemini allows up to 5 stop sequences per request (OpenAI-compatible allows 4; api-client slices).
const MAX_STOP_SEQUENCES = 5;

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
    availableModels,
    modelsLoading,
    modelsUsedFallback,
    fetchModels,
  } = useChatStore();

  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [modelCategory, setModelCategory] = useState("Featured");
  const [templateTitle, setTemplateTitle] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<SystemTemplate | null>(null);

  // Custom model form state
  const [showCustomModelForm, setShowCustomModelForm] = useState(false);
  const [customModelId, setCustomModelId] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [customModelDesc, setCustomModelDesc] = useState("");
  const [customModelContext, setCustomModelContext] = useState("800000");
  const [customModelCategory, setCustomModelCategory] = useState("Custom");

  const [showStructuredEditor, setShowStructuredEditor] = useState(false);
  const [showFunctionEditor, setShowFunctionEditor] = useState(false);
  const [schemaDraft, setSchemaDraft] = useState("");
  const [functionDraft, setFunctionDraft] = useState("");
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [functionError, setFunctionError] = useState<string | null>(null);
  const [stopSeqDraft, setStopSeqDraft] = useState("");

  // Fetch models on mount
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

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

  const openStructuredEditor = () => {
    console.log("[RunSettingsPanel] Opening Structured outputs editor");
    setSchemaDraft(settings.structured_output_schema || "");
    setSchemaError(null);
    setShowStructuredEditor(true);
  };

  const saveStructuredSchema = () => {
    const trimmed = schemaDraft.trim();
    if (trimmed) {
      try {
        JSON.parse(trimmed);
      } catch (e: any) {
        console.warn("[RunSettingsPanel] Structured schema invalid JSON:", e?.message);
        setSchemaError(e?.message || "Invalid JSON");
        return;
      }
    }
    console.log("[RunSettingsPanel] Saving structured_output_schema, length:", trimmed.length);
    updateSetting("structured_output_schema", trimmed);
    if (trimmed && !settings.tools_config.structured_outputs) {
      updateSetting("tools_config", { ...settings.tools_config, structured_outputs: true });
    }
    setShowStructuredEditor(false);
  };

  const openFunctionEditor = () => {
    console.log("[RunSettingsPanel] Opening Function calling editor");
    setFunctionDraft(settings.function_declarations || "");
    setFunctionError(null);
    setShowFunctionEditor(true);
  };

  const saveFunctionDeclarations = () => {
    const trimmed = functionDraft.trim();
    if (trimmed) {
      try {
        JSON.parse(trimmed);
      } catch (e: any) {
        console.warn("[RunSettingsPanel] Function declarations invalid JSON:", e?.message);
        setFunctionError(e?.message || "Invalid JSON");
        return;
      }
    }
    console.log("[RunSettingsPanel] Saving function_declarations, length:", trimmed.length);
    updateSetting("function_declarations", trimmed);
    if (trimmed && !settings.tools_config.function_calling) {
      updateSetting("tools_config", { ...settings.tools_config, function_calling: true });
    }
    setShowFunctionEditor(false);
  };

  const updateSafetySetting = (type: HarmCategory, threshold: SafetyThreshold) => {
    // Bug fix: when safety_settings is empty (legacy DB row), seed from the defaults so
    // the category buttons work immediately without needing "Reset defaults" first.
    const base = settings.safety_settings.length > 0 ? settings.safety_settings : DEFAULT_SAFETY_SETTINGS;
    let newSafety = base.map((s) => (s.type === type ? { ...s, threshold } : s));
    if (!newSafety.some((s) => s.type === type)) {
      newSafety = [...newSafety, { type, threshold }];
    }
    updateSetting("safety_settings", newSafety);
  };

  // Stop sequences (Safety Settings)
  const stopSequences = Array.isArray(settings.stop_sequences) ? settings.stop_sequences : [];

  const addStopSequence = () => {
    const value = stopSeqDraft.trim();
    if (!value) return;
    if (stopSequences.includes(value)) {
      setStopSeqDraft("");
      return;
    }
    if (stopSequences.length >= MAX_STOP_SEQUENCES) {
      useChatStore.getState().setGlobalError(`Maximum ${MAX_STOP_SEQUENCES} stop sequences allowed.`);
      return;
    }
    updateSetting("stop_sequences", [...stopSequences, value]);
    setStopSeqDraft("");
  };

  const removeStopSequence = (seq: string) => {
    updateSetting("stop_sequences", stopSequences.filter((s) => s !== seq));
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

  const filteredModels = availableModels.filter((m) => {
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

  const currentModel = availableModels.find((m) => m.id === settings.selected_model);

  const handleAddCustomModel = async () => {
    if (!customModelId.trim() || !customModelName.trim()) return;

    const trimmedId = customModelId.trim();
    console.log("[RunSettings] Adding custom model:", trimmedId);

    // Pre-check: see if model ID already exists in availableModels
    const alreadyExists = availableModels.some(m => m.id === trimmedId);
    if (alreadyExists) {
      console.warn("[RunSettings] Model ID already exists:", trimmedId);
      useChatStore.getState().setGlobalError(`Model "${trimmedId}" already exists in the model list.`);
      return;
    }

    const res = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: trimmedId,
        displayName: customModelName.trim(),
        description: customModelDesc.trim(),
        contextWindow: parseInt(customModelContext) || 800_000,
        category: customModelCategory || "Custom",
      }),
    });

    if (res.ok) {
      console.log("[RunSettings] Custom model added successfully:", trimmedId);
      setShowCustomModelForm(false);
      setCustomModelId("");
      setCustomModelName("");
      setCustomModelDesc("");
      setCustomModelContext("800000");
      setCustomModelCategory("Custom");
      await fetchModels();
    } else {
      // Handle error responses
      const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      console.error("[RunSettings] Failed to add custom model:", errorData);

      if (res.status === 409) {
        useChatStore.getState().setGlobalError(`Model "${trimmedId}" already exists. Please use a different model ID.`);
      } else {
        useChatStore.getState().setGlobalError(`Failed to add model: ${errorData.error || `HTTP ${res.status}`}`);
      }
    }
  };

  const handleDeleteCustomModel = async (modelId: string) => {
    await fetch(`/api/models?id=${modelId}`, { method: "DELETE" });
    await fetchModels();
  };

  const formatContextWindow = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
    return `${tokens}`;
  };

  // Bug fix: guarantee numeric display for Top-K / Output length even when a legacy DB row
  // holds an empty string. Output length is clamped to [1, 65536] with default 65536.
  const topKValue = Number.isFinite(Number(settings.top_k)) && Number(settings.top_k) >= 1
    ? Number(settings.top_k)
    : 64;
  const maxOutputValue = Number.isFinite(Number(settings.max_output_tokens)) && Number(settings.max_output_tokens) >= 1
    ? Math.min(65536, Number(settings.max_output_tokens))
    : 65536;

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
            {settings.thinking_level === "minimal" && (
              <p className="text-xs text-muted">
                Minimal thinking budget &mdash; the model will not generate visible thinking content. Set to Low, Medium, or High to see the model&apos;s reasoning process.
              </p>
            )}
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
                        <button
                          onClick={() =>
                            tool.key === "structured_outputs"
                              ? openStructuredEditor()
                              : openFunctionEditor()
                          }
                          className="text-xs text-accent ml-2 hover:text-accent-hover"
                        >
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
                    value={topKValue}
                    onChange={(e) => updateSetting("top_k", Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground w-20 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                {/* Max Output Tokens */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Output length</span>
                  <input
                    type="number"
                    min="1"
                    max="65536"
                    value={maxOutputValue}
                    onChange={(e) =>
                      updateSetting("max_output_tokens", Math.min(65536, Math.max(1, parseInt(e.target.value) || 65536)))
                    }
                    className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground w-24 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                {/* Stop sequences */}
                <div className="space-y-1.5">
                  <label className="text-sm text-foreground">Add stop sequence</label>
                  <input
                    type="text"
                    value={stopSeqDraft}
                    onChange={(e) => setStopSeqDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addStopSequence();
                      }
                    }}
                    placeholder="Type a stop sequence and press Enter"
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {stopSequences.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {stopSequences.map((seq) => (
                        <span
                          key={seq}
                          className="inline-flex items-center gap-1 bg-surface-variant border border-border rounded-full px-2.5 py-0.5 text-[11px] text-foreground max-w-full"
                        >
                          <span className="truncate max-w-[180px]">{seq}</span>
                          <button
                            onClick={() => removeStopSequence(seq)}
                            className="text-muted hover:text-foreground flex-shrink-0"
                            title="Remove stop sequence"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-muted">
                    Generation stops as soon as the model outputs any of these sequences (max {MAX_STOP_SEQUENCES}).
                  </p>
                </div>

                {/* RAG long-term memory */}
                <div className="space-y-1.5 border-t border-border pt-3">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">RAG long-term memory</span>
                    <button
                      onClick={() => updateSetting("rag_enabled", !settings.rag_enabled)}
                      className={cn(
                        "relative w-10 h-5 rounded-full transition-colors",
                        settings.rag_enabled ? "bg-primary" : "bg-border"
                      )}
                      title="Toggle RAG"
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                          settings.rag_enabled ? "left-5.5" : "left-0.5"
                        )}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted">
                    When the sliding window trims early messages, RAG retrieves the most relevant
                    trimmed history from the database and injects it into the request, so the model
                    keeps access to long-term conversation memory. 当上下文窗口裁剪早期消息时，RAG 会从数据库检索最相关的历史并注入请求。
                  </p>
                  {settings.rag_enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground">Embedding provider</span>
                        <select
                          value={settings.rag_provider || "api"}
                          onChange={(e) => updateSetting("rag_provider", e.target.value as "api" | "local")}
                          className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="api">API (configured endpoint)</option>
                          <option value="local">Local (on-device, ONNX)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-foreground">Embedding model</label>
                        <input
                          type="text"
                          value={settings.rag_embedding_model || ""}
                          onChange={(e) => updateSetting("rag_embedding_model", e.target.value)}
                          placeholder={
                            (settings.rag_provider || "api") === "local"
                              ? "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
                              : settings.api_protocol === "gemini"
                                ? "text-embedding-004"
                                : "text-embedding-3-small"
                          }
                          className="w-full bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <p className="text-[11px] text-muted">
                          Leave empty to use the default for the selected provider.
                          {(settings.rag_provider || "api") === "local"
                            ? " The local model is downloaded once on first use."
                            : " Requires the endpoint to support the embeddings API."}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground">Retrieval Top-K</span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={settings.rag_top_k ?? 5}
                          onChange={(e) =>
                            updateSetting("rag_top_k", Math.min(20, Math.max(1, parseInt(e.target.value) || 5)))
                          }
                          className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground w-20 focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Media resolution — caps media token cost (Gemini 3+) */}
                <div className="space-y-1.5 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Media resolution</span>
                    <select
                      value={settings.media_resolution || "unspecified"}
                      onChange={(e) =>
                        updateSetting(
                          "media_resolution",
                          e.target.value as "unspecified" | "low" | "medium" | "high" | "ultra_high"
                        )
                      }
                      className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="unspecified">Unspecified (auto)</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="ultra_high">Ultra high</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-muted">
                    Controls how many tokens media (images / video / audio / PDF) consumes. Gemini
                    3+ applies it per media part; older models ignore it. Recommended: images&nbsp;
                    <b>high</b>, PDF&nbsp;<b>medium</b>, video&nbsp;<b>low/medium</b>.
                    控制媒体消耗的 token 上限，仅 Gemini 3+ 生效。推荐：图片 high、PDF medium、视频 low/medium。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Issue 8: Structured outputs JSON editor dialog */}
      {showStructuredEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowStructuredEditor(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl p-6 shadow-2xl scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">Edit structured output schema</h2>
              <button
                onClick={() => setShowStructuredEditor(false)}
                className="text-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted mb-3">
              Define the JSON schema the model must follow for its response. Leave empty to request
              generic JSON mode. Applied as <code>responseSchema</code> (Gemini) or{" "}
              <code>response_format.json_schema</code> (OpenAI-compatible).
            </p>

            <textarea
              value={schemaDraft}
              onChange={(e) => {
                setSchemaDraft(e.target.value);
                if (schemaError) setSchemaError(null);
              }}
              spellCheck={false}
              placeholder={'{\n  "type": "object",\n  "properties": {\n    "name": { "type": "string" }\n  },\n  "required": ["name"]\n}'}
              className="w-full h-72 bg-input border border-border rounded-lg p-3 font-mono text-xs text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {schemaError && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {schemaError}
              </p>
            )}

            <div className="mt-5 flex justify-between">
              <button
                onClick={() => {
                  setSchemaDraft("");
                  setSchemaError(null);
                }}
                className="btn-ghost text-sm"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowStructuredEditor(false)} className="btn-ghost text-sm">
                  Cancel
                </button>
                <button
                  onClick={saveStructuredSchema}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue 9: Function calling JSON editor dialog */}
      {showFunctionEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowFunctionEditor(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl p-6 shadow-2xl scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">Edit function declarations</h2>
              <button
                onClick={() => setShowFunctionEditor(false)}
                className="text-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted mb-3">
              Define an array of callable functions (name, description, parameters). Sent as{" "}
              <code>functionDeclarations</code> (Gemini) or <code>tools</code> (OpenAI-compatible).
            </p>

            <textarea
              value={functionDraft}
              onChange={(e) => {
                setFunctionDraft(e.target.value);
                if (functionError) setFunctionError(null);
              }}
              spellCheck={false}
              placeholder={'[\n  {\n    "name": "get_weather",\n    "description": "Get the weather for a location",\n    "parameters": {\n      "type": "object",\n      "properties": {\n        "location": { "type": "string" }\n      },\n      "required": ["location"]\n    }\n  }\n]'}
              className="w-full h-72 bg-input border border-border rounded-lg p-3 font-mono text-xs text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {functionError && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {functionError}
              </p>
            )}

            <div className="mt-5 flex justify-between">
              <button
                onClick={() => {
                  setFunctionDraft("");
                  setFunctionError(null);
                }}
                className="btn-ghost text-sm"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowFunctionEditor(false)} className="btn-ghost text-sm">
                  Cancel
                </button>
                <button
                  onClick={saveFunctionDeclarations}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            onClick={() => { setIsModelSelectorOpen(false); setShowCustomModelForm(false); }}
          />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">Model selection</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchModels()}
                  className={cn("p-1.5 rounded-md hover:bg-surface-variant text-muted hover:text-foreground transition-colors", modelsLoading && "animate-spin")}
                  title="Refresh models"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setIsModelSelectorOpen(false); setShowCustomModelForm(false); }}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Fallback warning */}
            {modelsUsedFallback && (
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-600 dark:text-amber-400">Using fallback model list. Check your API configuration to load dynamic models.</span>
              </div>
            )}

            {/* Add custom model button */}
            <button
              onClick={() => setShowCustomModelForm(!showCustomModelForm)}
              className="w-full mb-3 p-2.5 rounded-xl border border-dashed border-border hover:border-primary hover:bg-surface-variant transition-colors text-sm text-muted hover:text-foreground flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add custom model
            </button>

            {/* Custom model form */}
            {showCustomModelForm && (
              <div className="mb-4 p-4 rounded-xl border border-border bg-surface-variant/50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted mb-1 block">Model ID *</label>
                    <input
                      value={customModelId}
                      onChange={(e) => setCustomModelId(e.target.value)}
                      placeholder="e.g. gemini-2.5-flash"
                      className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">Display Name *</label>
                    <input
                      value={customModelName}
                      onChange={(e) => setCustomModelName(e.target.value)}
                      placeholder="e.g. Gemini 2.5 Flash"
                      className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">Context Window (tokens)</label>
                    <input
                      type="number"
                      value={customModelContext}
                      onChange={(e) => setCustomModelContext(e.target.value)}
                      placeholder="800000"
                      className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">Category</label>
                    <input
                      value={customModelCategory}
                      onChange={(e) => setCustomModelCategory(e.target.value)}
                      placeholder="Custom"
                      className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Description</label>
                  <input
                    value={customModelDesc}
                    onChange={(e) => setCustomModelDesc(e.target.value)}
                    placeholder="Short description..."
                    className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowCustomModelForm(false)} className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors">Cancel</button>
                  <button onClick={handleAddCustomModel} disabled={!customModelId.trim() || !customModelName.trim()} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed">Add Model</button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Search for a model"
                className="w-full bg-input border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <svg className="absolute left-3 top-3 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {["Featured", "All", "Gemini", "Gemma", "Images", "Custom"].map((cat) => (
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

            {/* Loading indicator */}
            {modelsLoading && (
              <div className="text-center py-4">
                <RefreshCw className="w-5 h-5 animate-spin text-muted mx-auto mb-2" />
                <p className="text-xs text-muted">Loading models...</p>
              </div>
            )}

            {/* Model list */}
            <div className="space-y-1">
              {filteredModels.map((model) => {
                const ctx = getModelContextWindow(model);
                const isCustom = model.category === "Custom";
                return (
                  <div
                    key={model.id}
                    className={cn(
                      "group/model p-3 rounded-xl border transition-colors",
                      settings.selected_model === model.id
                        ? "bg-surface-variant border-border-light"
                        : "bg-card border-border hover:bg-surface-variant"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          updateSetting("selected_model", model.id);
                          setIsModelSelectorOpen(false);
                        }}
                        className="flex-1 min-w-0 text-left"
                      >
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
                          {isCustom && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">Custom</span>
                          )}
                          <span className="text-xs text-muted ml-auto flex-shrink-0">
                            {formatContextWindow(ctx)} ctx
                          </span>
                        </div>
                        <p className="text-xs text-muted">{model.id}</p>
                        {model.description && (
                          <p className="text-xs text-muted mt-1">{model.description}</p>
                        )}
                      </button>
                      {isCustom && (
                        <button
                          onClick={() => handleDeleteCustomModel(model.id)}
                          className="p-1 rounded-md opacity-0 group-hover/model:opacity-100 text-muted hover:text-destructive transition-all"
                          title="Delete custom model"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!modelsLoading && filteredModels.length === 0 && (
                <p className="text-center text-muted text-sm py-8">No models found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
