"use client";

import { useChatStore } from "@/store/chatStore";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS_LIST = [
  { key: "structured_outputs" as const, label: "Structured outputs", description: "Force model to output structured JSON" },
  { key: "code_execution" as const, label: "Code execution", description: "Execute code in a sandboxed environment" },
  { key: "function_calling" as const, label: "Function calling", description: "Call external functions from the model" },
  { key: "grounding_google_search" as const, label: "Grounding with Google Search", description: "Search the web for up-to-date information" },
  { key: "grounding_google_maps" as const, label: "Grounding with Google Maps", description: "Access location and map data" },
  { key: "url_context" as const, label: "URL context", description: "Fetch and analyze content from URLs" },
];

export default function ToolSelector() {
  const { isToolSelectorOpen, setIsToolSelectorOpen, settings, setSettings } = useChatStore();

  if (!isToolSelectorOpen || !settings) return null;

  const toggleTool = (toolKey: keyof typeof settings.tools_config) => {
    const newTools = {
      ...settings.tools_config,
      [toolKey]: !settings.tools_config[toolKey],
    };
    setSettings({ ...settings, tools_config: newTools });
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tools_config: newTools }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsToolSelectorOpen(false)}
      />

      <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl scale-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-foreground">Select Tools</h2>
          <button
            onClick={() => setIsToolSelectorOpen(false)}
            className="text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {TOOLS_LIST.map((tool) => {
            const isActive = settings.tools_config[tool.key];
            return (
              <button
                key={tool.key}
                onClick={() => toggleTool(tool.key)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left",
                  isActive
                    ? "bg-surface-variant border-border-light"
                    : "bg-card border-border hover:bg-surface-variant"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0",
                    isActive
                      ? "bg-primary border-primary"
                      : "border-border-light"
                  )}
                >
                  {isActive && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{tool.label}</p>
                  <p className="text-xs text-muted truncate">{tool.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={() => setIsToolSelectorOpen(false)}
            className="btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
