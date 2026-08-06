"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import { Settings2, Grid3x3, Send, Mic, Plus, X, Upload, Camera, MicOff, Film, Square } from "lucide-react";
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
    isRerunning,
    setIsRerunning,
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
    setGlobalError,
    setMessageUsage,
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAbortedRef = useRef(false);

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

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit for images/audio
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB limit for video files
  const ALLOWED_TYPES = ['image/', 'audio/', 'video/']; // Allow images, audio, and video

  const validateAndAddFile = useCallback((file: File, addError: (msg: string) => void) => {
    // Check file type
    const isAllowed = ALLOWED_TYPES.some(t => file.type.startsWith(t));
    if (!isAllowed) {
      addError(`File type not supported: ${file.name} (${file.type || 'unknown'}). Only images, audio, and video files are allowed.`);
      console.warn("[InputBox] Rejected file (unsupported type):", file.name, file.type);
      return;
    }
    // Check file size — video has a higher limit (50MB), others 20MB
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      const maxMB = (maxSize / 1024 / 1024).toFixed(0);
      addError(`File too large: ${file.name} (${sizeMB}MB). Maximum size is ${maxMB}MB.`);
      console.warn("[InputBox] Rejected file (too large):", file.name, `${sizeMB}MB`, `max=${maxMB}MB`);
      return;
    }
    // Read as Data URL
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
        console.log("[InputBox] File attached:", file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`, file.type);
      }
    };
    reader.onerror = () => {
      addError(`Failed to read file: ${file.name}`);
      console.error("[InputBox] FileReader error:", file.name);
    };
    reader.readAsDataURL(file);
  }, [setAttachedFiles]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      validateAndAddFile(file, (msg) => setGlobalError(msg));
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
      validateAndAddFile(file, (msg) => setGlobalError(msg));
    }
  }, [setGlobalError]);

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
    console.log("[InputBox] handleSend called", {
      messageText: messageText.slice(0, 100),
      attachmentCount: attachedFiles.length,
      attachments: attachedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
      currentConvId: currentConversation?.id,
      selectedModel: settings?.selected_model,
      apiProtocol: settings?.api_protocol,
      baseUrl: settings?.base_url,
      hasApiKey: !!settings?.api_key,
      proxyUrl: settings?.proxy_url || "(none)",
    });
    setInput("");
    setAttachedFiles([]);
    setIsLoading(true);
    isAbortedRef.current = false;

    // Create AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    console.log("[InputBox] AbortController created");

    // Helper to add an error message to chat display AND show global toast
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
      // Also show full error in global toast banner
      setGlobalError(text);
    };

    let convId = currentConversation?.id;

    try {

      if (!convId) {
        console.log("[InputBox] Creating new conversation...");
        const convRes = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: messageText.slice(0, 50) || "New conversation",
            model: settings?.selected_model ?? "gpt-4o",
          }),
        });
        const convData = await convRes.json();
        console.log("[InputBox] Create conversation response:", convData);
        if (convData.success && convData.data) {
          convId = convData.data.id;
          addConversation(convData.data);
          setCurrentConversation(convData.data);
          setIsChatActive(true);
          console.log("[InputBox] New conversation created:", convId);
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
        const requestBody = {
          conversation_id: convId,
          message: messageText,
          model: settings?.selected_model,
          temperature: settings?.temperature,
          thinking_level: settings?.thinking_level,
          system_instructions: settings?.system_instructions,
          tools: settings?.tools_config,
          stream: useStreaming,
          attachments: attachedFiles.map((f) => ({
            data_url: f.dataUrl ? f.dataUrl.slice(0, 50) + "..." : "(empty)",
            mime_type: f.type,
            name: f.name,
          })),
        };
        console.log("[InputBox] Sending chat request (with AbortController signal)");
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
          signal: abortController.signal,
        });
        console.log("[InputBox] Chat response status:", chatRes.status, "content-type:", chatRes.headers.get("content-type"));

        // Handle non-OK response (API error)
        if (!chatRes.ok) {
          let errorText = "Unknown error";
          try {
            const errData = await chatRes.json();
            errorText = errData.error || `HTTP ${chatRes.status}`;
            console.error("[InputBox] API error response:", errData);
          } catch {
            const rawText = await chatRes.text();
            errorText = `HTTP ${chatRes.status}: ${chatRes.statusText}`;
            console.error("[InputBox] API error (non-JSON):", rawText.slice(0, 300));
          }
          setIsLoading(false);
          console.log("[InputBox] API failed, preserving user message in UI");
          // Replace temp user message with a persistent version (don't reload from DB — user msg may not be saved yet)
          const imageBlocks = attachedFiles.filter(f => f.type.startsWith("image/")).map((f, i) => ({
            id: uuidv4(), message_id: "", type: "image" as const, content: f.dataUrl, position: -1 - i, created_at: new Date().toISOString(), is_deleted: false,
          }));
          const textBlock = { id: uuidv4(), message_id: "", type: "text" as const, content: messageText, position: 0, created_at: new Date().toISOString(), is_deleted: false };
          const realUserMsg = {
            ...tempUserMsg,
            id: uuidv4(),
            conversation_id: convId,
            blocks: [...imageBlocks, textBlock],
          };
          const currentMsgs = useChatStore.getState().messages.filter(m => m.id !== tempUserMsg.id);
          setMessages([...currentMsgs, realUserMsg]);
          addErrorToChat(`API Error: ${errorText}`);
          console.log("[InputBox] Error message added to chat");
          return;
        }

        if (useStreaming && chatRes.headers.get("content-type")?.includes("text/event-stream")) {
          // Handle streaming response
          setIsStreaming(true);
          clearStreaming();
          let streamError = "";
          let wasAborted = false;
          let stopSeqHit = "";
          const reader = chatRes.body?.getReader();
          if (reader) {
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
              try {
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
                      } else if (data.type === "stop_sequence") {
                        // Generation was stopped because the output contained a stop sequence
                        stopSeqHit = data.sequence || "";
                        console.log("[InputBox] Stop sequence hit in generated content:", stopSeqHit);
                      } else if (data.type === "error") {
                        streamError = data.error || "Stream error";
                        console.error("[InputBox] Stream error event:", data.error);
                      } else if (data.type === "done" && data.usage && data.assistant_message) {
                        if (data.stop_sequence_hit) stopSeqHit = data.stop_sequence_hit;
                        // Store per-message token usage
                        setMessageUsage(data.assistant_message.id, {
                          total_input_tokens: data.usage.total_input_tokens || 0,
                          total_output_tokens: data.usage.total_output_tokens || 0,
                          total_thought_tokens: data.usage.total_thought_tokens || 0,
                          total_tokens: data.usage.total_tokens || 0,
                        });
                        // Notify if context was trimmed
                        if (data.context_trimmed) {
                          setGlobalError("Early messages were automatically trimmed to fit within the model's context window.");
                        }
                      }
                    } catch {
                      // Skip malformed JSON
                    }
                  }
                }
              } catch (readErr: any) {
                // AbortError is expected when user clicks Stop
                if (readErr.name === "AbortError" || abortController.signal.aborted) {
                  wasAborted = true;
                  console.log("[InputBox] Stream aborted by user");
                } else {
                  throw readErr;
                }
                break;
              }
            }
          }
          setIsStreaming(false);
          console.log("[InputBox] Stream ended", { streamError: streamError || "(none)", wasAborted, skipFinalReload, stopSeqHit: stopSeqHit || "(none)" });

          if (stopSeqHit) {
            // Notify the user that generation was stopped by a stop sequence (Safety Settings)
            setGlobalError("AI 生成的内容包含 stop sequence，违反了 Safety Settings");
          }

          if (wasAborted) {
            // User aborted — reload from DB to show partial content that was saved
            console.log("[InputBox] Aborted: reloading messages from DB to show partial content...");
            const msgRes = await fetch(`/api/conversations/${convId}`);
            const msgData = await msgRes.json();
            if (msgData.success && msgData.data) setMessages(msgData.data.messages || []);
            skipFinalReload = true;
          } else if (streamError) {
            // Reload from DB to get the real user message (already saved by /api/chat), then add error
            console.log("[InputBox] Stream error occurred, reloading messages from DB...");
            const msgRes = await fetch(`/api/conversations/${convId}`);
            const msgData = await msgRes.json();
            console.log("[InputBox] DB reload after stream error:", msgData.success ? "OK" : "FAILED", "messages:", msgData.data?.messages?.length || 0);
            if (msgData.success && msgData.data) setMessages(msgData.data.messages || []);
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

      // NOTE: Image attachments are already stored as blocks by /api/chat endpoint.
      // Do NOT send them as separate messages to avoid duplicates.
      // Audio files are sent as separate messages since /api/chat doesn't handle audio.
      for (const file of attachedFiles) {
        if (file.type.startsWith("audio/")) {
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
        console.log("[InputBox] Final reload of messages from DB...");
        const msgRes = await fetch(`/api/conversations/${convId}`);
        const msgData = await msgRes.json();
        console.log("[InputBox] Final reload:", msgData.success ? "OK" : "FAILED", "messages:", msgData.data?.messages?.length || 0);
        if (msgData.data?.messages) {
          console.log("[InputBox] Messages after reload:", msgData.data.messages.map((m: any) => ({
            id: m.id, role: m.role, blocks: m.blocks?.map((b: any) => ({ type: b.type, pos: b.position })),
          })));
        }
        if (msgData.success && msgData.data) {
          setMessages(msgData.data.messages || []);
        }
      }
    } catch (err: any) {
      // Check if this is an abort error (user clicked Stop)
      if (err.name === "AbortError" || isAbortedRef.current) {
        console.log("[InputBox] Request was aborted by user");
        // Reload from DB to show partial content
        if (convId) {
          try {
            const msgRes = await fetch(`/api/conversations/${convId}`);
            const msgData = await msgRes.json();
            if (msgData.success && msgData.data) {
              setMessages(msgData.data.messages || []);
            }
          } catch { /* ignore */ }
        }
      } else {
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
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    console.log("[InputBox] User clicked Stop, isLoading:", isLoading, "isRerunning:", isRerunning);
    // Abort initial send if running
    isAbortedRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log("[InputBox] Initial send AbortController.abort() called");
    }
    // Abort rerun if running
    const rerunCtrl = useChatStore.getState().rerunAbortController;
    if (rerunCtrl) {
      rerunCtrl.abort();
      console.log("[InputBox] Rerun AbortController.abort() called");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const sendMethod = (typeof window !== 'undefined' ? localStorage.getItem('app-send-method') : 'enter') || 'enter';
    const autoIndent = localStorage.getItem('app-auto-indent') !== 'false'; // default true

    if (e.key === "Enter") {
      if (sendMethod === 'enter' && !e.shiftKey) {
        // Enter sends (Shift+Enter for newline)
        e.preventDefault();
        handleSend();
      } else if (sendMethod === 'ctrl-enter' && e.ctrlKey && !e.shiftKey) {
        // Ctrl+Enter sends (Enter for newline)
        e.preventDefault();
        handleSend();
      } else if (sendMethod === 'ctrl-enter' && !e.ctrlKey && !e.shiftKey && autoIndent) {
        // Auto-indent for lists when pressing Enter
        const textarea = e.target as HTMLTextAreaElement;
        const cursorPos = textarea.selectionStart;
        const textBefore = input.substring(0, cursorPos);
        const lines = textBefore.split('\n');
        const currentLine = lines[lines.length - 1];

        // Check for numbered list: "1. ", "2. ", etc.
        const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);
        // Check for unordered list: "- ", "* ", etc.
        const unorderedMatch = currentLine.match(/^(\s*)([-*])\s(.*)$/);

        if (numberedMatch) {
          e.preventDefault();
          const indent = numberedMatch[1];
          const num = parseInt(numberedMatch[2]) + 1;
          const content = numberedMatch[3];
          // If current line is empty (just the number), stop the list
          if (!content.trim()) {
            // Remove the list marker and insert newline
            const newText = input.substring(0, cursorPos - currentLine.length) + '\n' + input.substring(cursorPos);
            setInput(newText);
            // Set cursor position after the newline
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = cursorPos - currentLine.length + 1;
            }, 0);
          } else {
            const insertion = `\n${indent}${num}. `;
            const newText = input.substring(0, cursorPos) + insertion + input.substring(cursorPos);
            setInput(newText);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = cursorPos + insertion.length;
            }, 0);
          }
        } else if (unorderedMatch) {
          e.preventDefault();
          const indent = unorderedMatch[1];
          const marker = unorderedMatch[2];
          const content = unorderedMatch[3];
          // If current line is empty (just the marker), stop the list
          if (!content.trim()) {
            const newText = input.substring(0, cursorPos - currentLine.length) + '\n' + input.substring(cursorPos);
            setInput(newText);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = cursorPos - currentLine.length + 1;
            }, 0);
          } else {
            const insertion = `\n${indent}${marker} `;
            const newText = input.substring(0, cursorPos) + insertion + input.substring(cursorPos);
            setInput(newText);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = cursorPos + insertion.length;
            }, 0);
          }
        }
      }
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
      {/* Attached files — horizontal scroll instead of stacking into multiple rows */}
      {attachedFiles.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 bg-surface-variant border border-border rounded-lg px-3 py-1.5 text-xs text-foreground flex-shrink-0 whitespace-nowrap"
            >
              {file.type.startsWith("image/") && <Camera className="w-3 h-3" />}
              {file.type.startsWith("audio/") && <Mic className="w-3 h-3" />}
              {file.type.startsWith("video/") && <Film className="w-3 h-3" />}
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
                      accept="image/*,audio/*,video/*"
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

            {/* Send/Stop button — show Stop when either sending or regenerating */}
            {(isLoading || isRerunning) ? (
              <button
                onClick={handleStop}
                className="btn-primary flex items-center gap-1.5 ml-1 transition-all duration-150 hover:scale-105 bg-destructive hover:bg-destructive/90"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="text-xs">Stop</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() && attachedFiles.length === 0}
                className={cn(
                  "btn-primary flex items-center gap-1.5 ml-1 transition-all duration-150",
                  (!input.trim() && attachedFiles.length === 0)
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:scale-105"
                )}
              >
                <span className="text-xs">Run</span>
                <span className="text-xs text-primary-foreground/60">Ctrl ↵</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
