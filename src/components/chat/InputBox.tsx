"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import { Settings2, Grid3x3, Send, Mic, Plus, X, Upload, Camera, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface AttachedFile {
  name: string;
  type: string;
  dataUrl: string;
  size: number;
}

export default function InputBox() {
  const {
    settings,
    isChatActive,
    setIsChatActive,
    setIsSettingsOpen,
    setIsToolSelectorOpen,
    isLoading,
    setIsLoading,
    currentConversation,
    setCurrentConversation,
    messages,
    setMessages,
    addMessage,
    addConversation,
    setSettings,
    isStreaming,
    setIsStreaming,
    appendStreamingText,
    appendStreamingThinking,
    clearStreaming,
  } = useChatStore();

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    if (showPlusMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPlusMenu]);

  const getActiveTools = () => {
    if (!settings) return [];
    const tools: string[] = [];
    const tc = settings.tools_config;
    if (tc.structured_outputs) tools.push("Structured outputs");
    if (tc.code_execution) tools.push("Code execution");
    if (tc.function_calling) tools.push("Function calling");
    if (tc.grounding_google_search) tools.push("Grounding with Google Search");
    if (tc.grounding_google_maps) tools.push("Grounding with Google Maps");
    if (tc.url_context) tools.push("URL context");
    return tools;
  };

  const removeTool = (tool: string) => {
    if (!settings) return;
    const keyMap: Record<string, keyof typeof settings.tools_config> = {
      "Structured outputs": "structured_outputs",
      "Code execution": "code_execution",
      "Function calling": "function_calling",
      "Grounding with Google Search": "grounding_google_search",
      "Grounding with Google Maps": "grounding_google_maps",
      "URL context": "url_context",
    };
    const key = keyMap[tool];
    if (key) {
      const newTools = { ...settings.tools_config, [key]: false };
      setSettings({ ...settings, tools_config: newTools });
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tools_config: newTools }),
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setAttachedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              type: file.type,
              dataUrl: ev.target!.result as string,
              size: file.size,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setAttachedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              type: file.type,
              dataUrl: ev.target!.result as string,
              size: file.size,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Recording
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (ev.target?.result) {
              setAttachedFiles((prev) => [
                ...prev,
                {
                  name: `recording_${new Date().toISOString()}.webm`,
                  type: "audio/webm",
                  dataUrl: ev.target!.result as string,
                  size: blob.size,
                },
              ]);
            }
          };
          reader.readAsDataURL(blob);
          stream.getTracks().forEach((track) => track.stop());
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start recording:", err);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0 || isLoading) return;

    const messageText = input.trim();
    setInput("");
    setAttachedFiles([]);
    setIsLoading(true);

    // Helper to add an error message to chat display
    const addErrorToChat = (text: string) => {
      const errMsg = {
        id: uuidv4(),
        conversation_id: "",
        parent_message_id: null,
        role: "assistant" as const,
        position: -1,
        created_at: new Date().toISOString(),
        blocks: [{ id: uuidv4(), message_id: "", type: "error" as any, content: text, position: 0, created_at: new Date().toISOString(), is_deleted: false }],
      };
      setMessages([...useChatStore.getState().messages, errMsg]);
    };

    let convId = currentConversation?.id;

    try {

      if (!convId) {
        const convRes = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: messageText.slice(0, 50) || "New conversation",
            model: settings?.selected_model ?? "gpt-4o",
          }),
        });
        const convData = await convRes.json();
        if (convData.success && convData.data) {
          convId = convData.data.id;
          addConversation(convData.data);
          setCurrentConversation(convData.data);
          setIsChatActive(true);
        }
      }

      if (!convId) {
        addErrorToChat("Failed to create conversation. Please check your connection.");
        setIsLoading(false);
        return;
      }

      // === Optimistic update: show user message immediately ===
      const tempUserMsg = {
        id: `temp-${uuidv4()}`,
        conversation_id: convId,
        parent_message_id: null,
        role: "user" as const,
        position: 9999,
        created_at: new Date().toISOString(),
        blocks: [{ id: `temp-block-${uuidv4()}`, message_id: `temp-${uuidv4()}`, type: "text" as const, content: messageText, position: 0, created_at: new Date().toISOString(), is_deleted: false }],
      };
      setMessages([...useChatStore.getState().messages, tempUserMsg]);

      let skipFinalReload = false;

      // Send text message
      if (messageText) {
        const useStreaming = true;
        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: convId,
            message: messageText,
            model: settings?.selected_model,
            temperature: settings?.temperature,
            thinking_level: settings?.thinking_level,
            system_instructions: settings?.system_instructions,
            tools: settings?.tools_config,
            stream: useStreaming,
            attachments: attachedFiles.map((f) => ({
              data_url: f.dataUrl,
              mime_type: f.type,
              name: f.name,
            })),
          }),
        });

        // Handle non-OK response (API error)
        if (!chatRes.ok) {
          let errorText = "Unknown error";
          try {
            const errData = await chatRes.json();
            errorText = errData.error || `HTTP ${chatRes.status}`;
          } catch {
            errorText = `HTTP ${chatRes.status}: ${chatRes.statusText}`;
          }
          setIsLoading(false);
          // Reload messages FIRST to replace temp user msg with real DB data
          const msgRes = await fetch(`/api/conversations/${convId}`);
          const msgData = await msgRes.json();
          if (msgData.success && msgData.data) setMessages(msgData.data.messages || []);
          // THEN add error message so it's not wiped out by reload
          addErrorToChat(`API Error: ${errorText}`);
          return;
        }

        if (useStreaming && chatRes.headers.get("content-type")?.includes("text/event-stream")) {
          // Handle streaming response
          setIsStreaming(true);
          clearStreaming();
          let streamError = "";
          const reader = chatRes.body?.getReader();
          if (reader) {
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                if (line.startsWith("event: ")) continue;
                if (line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === "text") {
                      appendStreamingText(data.text);
                    } else if (data.type === "thinking") {
                      appendStreamingThinking(data.text);
                    } else if (data.type === "error") {
                      streamError = data.error || "Stream error";
                    }
                  } catch {
                    // Skip malformed JSON
                  }
                }
              }
            }
          }
          setIsStreaming(false);

          if (streamError) {
            addErrorToChat(`Stream Error: ${streamError}`);
            skipFinalReload = true;
          }
        } else {
          // Non-streaming response
          const chatData = await chatRes.json();
          if (!chatData.success) {
            addErrorToChat(`API Error: ${chatData.error || "Unknown error"}`);
          }
        }
      }

      // Send attached files as messages
      for (const file of attachedFiles) {
        if (file.type.startsWith("image/")) {
          const msgRes = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversation_id: convId,
              role: "user",
              content: `[Image: ${file.name}]`,
              position: 999,
            }),
          });
          const msgData = await msgRes.json();
          if (msgData.success) {
            await fetch("/api/blocks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message_id: msgData.data.id,
                type: "image",
                content: file.dataUrl,
                position: 0,
              }),
            });
          }
        } else if (file.type.startsWith("audio/")) {
          await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversation_id: convId,
              role: "user",
              content: `[Audio: ${file.name}]`,
              position: 999,
            }),
          });
        }
      }

      // Reload messages to get final state (replaces temp messages with real DB ones)
      // ONLY reload if no error occurred — otherwise reload would overwrite the error message
      if (messageText && !skipFinalReload) {
        const msgRes = await fetch(`/api/conversations/${convId}`);
        const msgData = await msgRes.json();
        if (msgData.success && msgData.data) {
          setMessages(msgData.data.messages || []);
        }
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      // On network error, try to reload messages first to replace temp user msg
      if (convId) {
        try {
          const msgRes = await fetch(`/api/conversations/${convId}`);
          const msgData = await msgRes.json();
          if (msgData.success && msgData.data) {
            setMessages(msgData.data.messages || []);
          }
        } catch {
          // If reload also fails, keep temp messages as-is
        }
      }
      // THEN add error message so it's not wiped out by reload
      addErrorToChat(`Network Error: ${err.message || "Failed to connect"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeTools = getActiveTools();

  return (
    <div
      ref={inputContainerRef}
      className={cn(
        "border-t border-border bg-background px-4 md:px-8 py-3 md:py-4 transition-colors duration-200 flex-shrink-0",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        isDragOver && "bg-surface-variant/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 bg-surface-variant border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
            >
              {file.type.startsWith("image/") && <Camera className="w-3 h-3" />}
              {file.type.startsWith("audio/") && <Mic className="w-3 h-3" />}
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeFile(idx)}
                className="text-muted hover:text-foreground ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className={cn(
        "bg-card border border-border rounded-2xl px-4 py-3 transition-all duration-200",
        isDragOver && "border-primary ring-1 ring-primary"
      )}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start typing a prompt to see what our models can do"
          rows={1}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted resize-none focus:outline-none max-h-[200px]"
        />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {/* API Config button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={cn(
                "p-2 rounded-full transition-colors duration-150",
                settings?.base_url
                  ? "text-muted hover:text-foreground hover:bg-surface-variant"
                  : "text-destructive hover:bg-surface-variant"
              )}
              title="Configure API"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* Tools selector button + active tool tags inline */}
            <button
              onClick={() => setIsToolSelectorOpen(true)}
              className="p-2 rounded-full text-muted hover:text-foreground hover:bg-surface-variant transition-colors duration-150 flex items-center gap-1"
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="text-xs">Tools</span>
            </button>

            {/* Active tools shown inline next to Tools button */}
            {activeTools.length > 0 && (
              <div className="flex flex-wrap gap-1 ml-1">
                {activeTools.map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center gap-1 bg-surface-variant border border-border rounded-full px-2.5 py-0.5 text-[11px] text-foreground"
                  >
                    {tool === "Grounding with Google Search" ? "Google Search" : tool === "Grounding with Google Maps" ? "Google Maps" : tool}
                    <button
                      onClick={() => removeTool(tool)}
                      className="text-muted hover:text-foreground ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 relative">
            {/* Mic button */}
            <button
              onClick={toggleRecording}
              className={cn(
                "p-2 rounded-full transition-colors duration-150",
                isRecording
                  ? "text-destructive hover:bg-surface-variant animate-pulse"
                  : "text-muted hover:text-foreground hover:bg-surface-variant"
              )}
              title={isRecording ? "Stop recording" : "Record audio"}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Plus button with popup menu */}
            <div className="relative" ref={plusMenuRef}>
              <button
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className="p-2 rounded-full text-muted hover:text-foreground hover:bg-surface-variant transition-colors duration-150"
                title="Add files"
              >
                <Plus className="w-4 h-4" />
              </button>

              {showPlusMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-xl shadow-2xl py-2 w-52 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <label className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-surface-variant cursor-pointer transition-colors duration-150">
                    <Upload className="w-4 h-4 text-muted" />
                    <span>Upload files</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <label className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-surface-variant cursor-pointer transition-colors duration-150">
                    <Camera className="w-4 h-4 text-muted" />
                    <span>Camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <button
                    onClick={() => {
                      setShowPlusMenu(false);
                      toggleRecording();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-surface-variant transition-colors duration-150"
                  >
                    <Mic className="w-4 h-4 text-muted" />
                    <span>Record Audio</span>
                  </button>
                </div>
              )}
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
              className={cn(
                "btn-primary flex items-center gap-1.5 ml-1 transition-all duration-150",
                (!input.trim() && attachedFiles.length === 0) || isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-105"
              )}
            >
              {isLoading ? (
                <span className="text-xs">Running...</span>
              ) : (
                <>
                  <span className="text-xs">Run</span>
                  <span className="text-xs text-primary-foreground/60">Ctrl ↵</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
