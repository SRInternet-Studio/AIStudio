"use client";

import { ReactNode, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import RunSettingsPanel from "./RunSettingsPanel";
import { useChatStore } from "@/store/chatStore";
import { Menu, Share2, ChevronLeft, FileInput, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportConversation, downloadContextFile } from "@/lib/context-io";

// Module-level flag to prevent resetting sidebar defaults on remount (route changes)
let sidebarDefaultsApplied = false;

interface MainLayoutProps {
  children: ReactNode;
  headerContent?: ReactNode;
}

export default function MainLayout({ children, headerContent }: MainLayoutProps) {
  const {
    currentConversation,
    isRunSettingsOpen,
    setIsRunSettingsOpen,
    isSidebarOpen,
    setIsSidebarOpen,
    settings,
    messages,
    globalError,
    setGlobalError,
    activeView,
  } = useChatStore();

  // Auto-dismiss global error after 10 seconds
  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => setGlobalError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [globalError, setGlobalError]);

  // Issue 1 (mobile flicker): after activeView changes on mobile, immediately close the
  // sidebar overlay so it doesn't replay its slide-in/slide-out animation across page
  // transitions. Desktop sidebar is persistent (it's a non-overlay block element).
  const firstMountRef = useRef(true);
  const prevActiveViewRef = useRef(activeView);
  useEffect(() => {
    const changed = prevActiveViewRef.current !== activeView;
    prevActiveViewRef.current = activeView;
    if (firstMountRef.current) {
      firstMountRef.current = false;
      return;
    }
    if (!changed) return;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      console.log("[MainLayout] activeView changed on mobile -> closing sidebar, view:", activeView);
      setIsSidebarOpen(false);
    }
  }, [activeView, setIsSidebarOpen]);

  const importFileRef = useRef<HTMLInputElement>(null);

  // Set sidebar default based on screen size — only on FIRST mount ever
  // Module-level flag persists across component remounts (route changes)
  useEffect(() => {
    if (!sidebarDefaultsApplied) {
      sidebarDefaultsApplied = true;
      const isDesktop = window.innerWidth >= 768;
      console.log("[MainLayout] Initial mount: setting sidebar defaults, isDesktop:", isDesktop);
      setIsSidebarOpen(isDesktop);
      // RunSettingsPanel defaults to open on desktop, closed on mobile
      setIsRunSettingsOpen(isDesktop);
    } else {
      console.log("[MainLayout] Re-mount skipped sidebar defaults (preserving user preference), isRunSettingsOpen:", isRunSettingsOpen);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Guard: subscribe to isRunSettingsOpen changes to detect unexpected resets
  useEffect(() => {
    console.log("[MainLayout] Current isRunSettingsOpen:", isRunSettingsOpen);
  }, [isRunSettingsOpen]);

  const handleExport = async () => {
    if (!currentConversation || !settings) return;
    const res = await fetch(`/api/conversations/${currentConversation.id}`);
    const data = await res.json();
    if (!data.success) return;
    const msgs = data.data.messages || [];
    const contextData = exportConversation(settings, msgs, currentConversation.title, true);
    downloadContextFile(contextData, currentConversation.title || "context");
  };

  const handleImport = () => {
    importFileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const importedModel = jsonData.runSettings?.model?.replace("models/", "") || settings?.selected_model || "gpt-4o";

      // Bulk server-side import: creates the conversation and inserts ALL messages/blocks
      // in batched transactions. This replaces the old per-chunk fetch loop that silently
      // dropped most messages on very large files.
      const chunks = jsonData.chunkedPrompt?.chunks || [];
      console.log("[MainLayout] Importing context file:", file.name, "chunks:", chunks.length);
      const importRes = await fetch("/api/conversations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name || "Imported Context",
          model: importedModel,
          chunks,
        }),
      });
      const importData = await importRes.json();
      if (!importData.success) {
        console.error("[MainLayout] Import failed:", importData.error);
        setGlobalError(`Import failed: ${importData.error || "unknown error"}`);
        if (importFileRef.current) importFileRef.current.value = "";
        return;
      }
      const convId = importData.data.conversation.id;
      console.log("[MainLayout] Import succeeded:", {
        convId,
        messages: importData.data.messageCount,
        blocks: importData.data.blockCount,
        chunks: importData.data.chunkCount,
      });

      if (jsonData.systemInstruction?.text) {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ system_instructions: jsonData.systemInstruction.text }),
        });
      }
      if (jsonData.runSettings) {
        const rs = jsonData.runSettings;
        const settingsUpdate: any = {
          temperature: rs.temperature,
          top_p: rs.topP,
          top_k: rs.topK,
          max_output_tokens: rs.maxOutputTokens,
          safety_settings: rs.safetySettings,
          thinking_level: rs.thinkingLevel?.replace("THINKING_", "").toLowerCase() || "minimal",
          tools_config: {
            ...settings?.tools_config,
            code_execution: rs.enableCodeExecution || false,
            grounding_google_search: rs.enableSearchAsATool || false,
            grounding_google_maps: rs.enableGoogleMaps || false,
          },
        };
        if (jsonData._custom) {
          if (jsonData._custom.base_url) settingsUpdate.base_url = jsonData._custom.base_url;
          if (jsonData._custom.api_key) settingsUpdate.api_key = jsonData._custom.api_key;
          if (jsonData._custom.proxy_url !== undefined) settingsUpdate.proxy_url = jsonData._custom.proxy_url;
        }
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settingsUpdate),
        });
      }
      const convListRes = await fetch("/api/conversations");
      const convListData = await convListRes.json();
      if (convListData.success) {
        // Update the conversations list in store so History/Sidebar refresh immediately
        useChatStore.getState().setConversations(convListData.data);
        const newConv = convListData.data.find((c: any) => c.id === convId);
        if (newConv) {
          useChatStore.getState().setCurrentConversation(newConv);
          useChatStore.getState().setActiveView("playground");
        }
      }

      // 4b: Check if the imported model is in availableModels; if not, try to add it as custom
      if (importedModel) {
        const availableModels = useChatStore.getState().availableModels;
        const modelExists = availableModels.some(m => m.id === importedModel);
        if (!modelExists) {
          console.log("[MainLayout] Imported model not in available list, adding as custom:", importedModel);
          try {
            const addRes = await fetch("/api/models", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: importedModel,
                displayName: importedModel,
                description: "Auto-added from imported context",
                contextWindow: 800000,
                category: "Custom",
              }),
            });
            if (addRes.ok) {
              await useChatStore.getState().fetchModels();
              console.log("[MainLayout] Custom model added:", importedModel);
            } else {
              const addData = await addRes.json();
              console.warn("[MainLayout] Failed to add custom model:", addData.error);
            }
          } catch (addErr) {
            console.warn("[MainLayout] Error adding custom model:", addErr);
          }
        }
      }
      if (jsonData._custom) {
        const settingsRes = await fetch("/api/settings");
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.data) {
          useChatStore.getState().setSettings(settingsData.data);
        }
      }
    } catch (err) {
      console.error("Failed to import context:", err);
    }
    if (importFileRef.current) importFileRef.current.value = "";
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Hidden file input for import */}
      <input
        ref={importFileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Left Sidebar - hidden on mobile by default */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative w-[200px] h-full animate-in slide-in-from-left-2 duration-300">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top Header Bar */}
        <header className="h-12 min-h-[48px] border-b border-border flex items-center justify-between px-4 bg-background flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Hamburger menu */}
            {isSidebarOpen ? (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-md hover:bg-surface-variant transition-colors duration-150 text-muted hover:text-foreground flex-shrink-0"
                title="Close sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-md hover:bg-surface-variant transition-colors duration-150 text-muted hover:text-foreground flex-shrink-0"
                title="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {/* Header content (title + token count from page.tsx) */}
            <div className="flex-1 min-w-0">
              {headerContent}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Share / Export button */}
            <button
              onClick={handleExport}
              disabled={!currentConversation}
              className={cn(
                "p-2 rounded-md hover:bg-surface-variant transition-colors duration-150",
                currentConversation
                  ? "text-muted hover:text-foreground"
                  : "text-muted/40 cursor-not-allowed"
              )}
              title={currentConversation ? "Export context" : "No active conversation"}
            >
              <Share2 className="w-4 h-4" />
            </button>
            {/* Import button */}
            <button
              onClick={handleImport}
              className="p-2 rounded-md hover:bg-surface-variant transition-colors duration-150 text-muted hover:text-foreground"
              title="Import context"
            >
              <FileInput className="w-4 h-4" />
            </button>
            {/* Run Settings toggle */}
            {!isRunSettingsOpen && (
              <button
                onClick={() => setIsRunSettingsOpen(true)}
                className="p-2 rounded-md hover:bg-surface-variant transition-colors duration-150 text-muted hover:text-foreground"
                title="Show Run Settings"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Content + Run Settings */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          {/* Center Content */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {children}
          </div>

          {/* Issue 3: Global error toast - floating overlay (does not shift layout height).
              z-[150] keeps it above dialogs (z-50), run-settings overlays (z-40/100) and
              any message content underneath. */}
          {globalError && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[150] pointer-events-none">
              <div className="pointer-events-auto bg-destructive/95 border border-destructive text-destructive-foreground shadow-2xl rounded-lg px-3 py-2 flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-200 max-w-[90vw] w-auto">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm flex-1 truncate max-w-[420px]">{globalError}</span>
                <button
                  onClick={() => setGlobalError(null)}
                  className="p-1 rounded hover:bg-destructive/50 transition-colors duration-150 flex-shrink-0"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Right Run Settings Panel - hidden on mobile by default */}
          <div className="hidden md:block">
            <RunSettingsPanel />
          </div>
          {/* Mobile run settings overlay */}
          {isRunSettingsOpen && (
            <div className="md:hidden fixed inset-0 z-40">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setIsRunSettingsOpen(false)}
              />
              <div className="relative w-[320px] max-w-[85vw] h-full ml-auto animate-in slide-in-from-right-2 duration-300">
                <RunSettingsPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
