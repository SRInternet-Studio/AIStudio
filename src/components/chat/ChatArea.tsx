"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import type { Block, Message } from "@/types";
import ContentBlock from "./ContentBlock";
import TextBlock from "./TextBlock";
import ThinkingBlock from "./ThinkingBlock";
import MessageActions from "./MessageActions";
import { AlertTriangle, XCircle, Pencil, Check, X, Image, XIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { estimateTokens } from "@/lib/context-manager";

interface ChatAreaProps {
  messages: (Message & { blocks: Block[] })[];
}

export default function ChatArea({ messages }: ChatAreaProps) {
  const {
    currentConversation,
    settings,
    isStreaming,
    streamingText,
    streamingThinking,
    isLoading,
    setMessages,
    updateMessage,
    setGlobalError,
    messageUsage,
  } = useChatStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Rerun streaming state
  const [isRerunning, setIsRerunning] = useState(false);
  const [rerunStreamingText, setRerunStreamingText] = useState("");
  const [rerunStreamingThinking, setRerunStreamingThinking] = useState("");
  const [rerunStreamError, setRerunStreamError] = useState("");
  const [rerunCatchError, setRerunCatchError] = useState("");

  const isAnyStreaming = isStreaming || isRerunning;

  // Smart auto-scroll: scroll to bottom on new content, but respect user scrolling
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
    }
  }, []);

  const isNearBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  // Track user scroll to detect manual scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (!isNearBottom()) {
        isUserScrolling.current = true;
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
          isUserScrolling.current = false;
        }, 1500);
      } else {
        isUserScrolling.current = false;
      }
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [isNearBottom]);

  // Auto-scroll to bottom when conversation changes
  useEffect(() => {
    if (currentConversation && messages.length > 0) {
      // Use instant scroll for conversation switch
      requestAnimationFrame(() => {
        scrollToBottom("instant");
      });
    }
  }, [currentConversation?.id, messages.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smart scroll during streaming
  useEffect(() => {
    if (isAnyStreaming && !isUserScrolling.current) {
      scrollToBottom("smooth");
    }
  }, [streamingText, streamingThinking, rerunStreamingText, rerunStreamingThinking, isAnyStreaming, scrollToBottom]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingMessageId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.select();
    }
  }, [editingMessageId]);

  const handleEdit = (message: Message & { blocks?: any[] }) => {
    if (isAnyStreaming) return;
    const textBlock = message.blocks?.find((b: any) => b.type === "text");
    if (textBlock) {
      setEditingMessageId(message.id);
      setEditingContent(textBlock.content);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingContent.trim() || isAnyStreaming) return;

    const newContent = editingContent.trim();
    const msg = messages.find((m) => m.id === editingMessageId);
    if (!msg || !currentConversation) return;

    setEditingMessageId(null);
    setEditingContent("");

    await fetch("/api/messages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: msg.id, content: newContent }),
    });

    updateMessage(msg.id, newContent);

    if (msg.role === "user") {
      await handleRerunFromMessage({ ...msg, blocks: msg.blocks || [] }, newContent);
    }
  };

  const handleRerun = async (message: Message & { blocks?: any[] }) => {
    if (isAnyStreaming) return;
    const textBlock = message.blocks?.find((b: any) => b.type === "text");
    if (textBlock) {
      await handleRerunFromMessage(message, textBlock.content);
    }
  };

  const handleRerunFromMessage = async (message: Message & { blocks?: any[] }, content: string) => {
    if (!currentConversation) return;

    console.log("[ChatArea] handleRerunFromMessage called, message position:", message.position, "content:", content.slice(0, 50));
    setIsRerunning(true);
    setRerunStreamingText("");
    setRerunStreamingThinking("");
    setRerunStreamError("");
    setRerunCatchError("");

    const messagesBeforeRerun = [...useChatStore.getState().messages];
    let apiCallSucceeded = false;
    // Use plain variables (not React state) to track errors — React state is async and stale in finally block
    let streamErrorMsg = "";
    let catchErrorMsg = "";

    try {
      console.log("[ChatArea] Rerun: deleting messages from position", message.position);
      const rerunRes = await fetch(`/api/messages/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          from_position: message.position,
        }),
      });

      if (!rerunRes.ok) {
        throw new Error(`Failed to delete messages: HTTP ${rerunRes.status}`);
      }

      console.log("[ChatArea] Rerun: messages deleted, reloading from DB...");
      const reloadRes = await fetch(`/api/conversations/${currentConversation.id}`);
      const reloadData = await reloadRes.json();
      if (reloadData.success && reloadData.data) {
        setMessages(reloadData.data.messages || []);
        console.log("[ChatArea] Rerun: DB reloaded, messages:", reloadData.data.messages?.length || 0);
      }

      console.log("[ChatArea] Rerun: sending chat request...");
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          message: content,
          model: settings?.selected_model,
          temperature: settings?.temperature,
          thinking_level: settings?.thinking_level,
          system_instructions: settings?.system_instructions,
          tools: settings?.tools_config,
          stream: true,
          skip_user_message_creation: true,
        }),
      });

      if (!chatRes.ok) {
        let errorText = "Unknown error";
        try {
          const errData = await chatRes.json();
          errorText = errData.error || `HTTP ${chatRes.status}`;
        } catch {
          errorText = `HTTP ${chatRes.status}: ${chatRes.statusText}`;
        }
        throw new Error(errorText);
      }

      if (chatRes.headers.get("content-type")?.includes("text/event-stream")) {
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
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === "text") {
                    setRerunStreamingText((prev) => prev + (data.text || ""));
                  } else if (data.type === "thinking") {
                    setRerunStreamingThinking((prev) => prev + (data.text || ""));
                  } else if (data.type === "error") {
                    streamErrorMsg = data.error || "Stream error";
                    setRerunStreamError(streamErrorMsg);
                    console.error("[ChatArea] Rerun stream error:", streamErrorMsg);
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        }
      }

      apiCallSucceeded = true;
      console.log("[ChatArea] Rerun: API call succeeded, streamErrorMsg:", streamErrorMsg || "(none)");
    } catch (err: any) {
      console.error("[ChatArea] Rerun failed:", err);
      catchErrorMsg = err.message || "Failed to regenerate";
      setRerunCatchError(catchErrorMsg);
    } finally {
      setIsRerunning(false);
      setRerunStreamingText("");
      setRerunStreamingThinking("");
      console.log("[ChatArea] Rerun: finally block, apiCallSucceeded:", apiCallSucceeded,
        "streamErrorMsg:", streamErrorMsg || "(none)", "catchErrorMsg:", catchErrorMsg || "(none)");

      if (apiCallSucceeded) {
        // Reload from DB to get the persisted assistant message
        if (currentConversation) {
          const res = await fetch(`/api/conversations/${currentConversation.id}`);
          const data = await res.json();
          if (data.success && data.data) {
            setMessages(data.data.messages || []);
            console.log("[ChatArea] Rerun: final DB reload, messages:", data.data.messages?.length || 0);
          }
        }
      } else {
        // API failed — restore messages to before rerun
        setMessages(messagesBeforeRerun);
        console.log("[ChatArea] Rerun: API failed, restored messagesBeforeRerun");
      }

      // Add error messages using plain variables (not React state) to avoid stale closure
      if (streamErrorMsg) {
        const errMsg = {
          id: uuidv4(),
          conversation_id: currentConversation!.id,
          parent_message_id: null,
          role: "assistant" as const,
          position: -1,
          created_at: new Date().toISOString(),
          blocks: [{ id: uuidv4(), message_id: "", type: "error" as any, content: `Stream Error: ${streamErrorMsg}`, position: 0, created_at: new Date().toISOString(), is_deleted: false }],
        };
        setMessages([...useChatStore.getState().messages, errMsg]);
        setGlobalError(`Stream Error: ${streamErrorMsg}`);
        console.log("[ChatArea] Rerun: stream error message added to chat");
      }
      if (catchErrorMsg) {
        const errMsg = {
          id: uuidv4(),
          conversation_id: currentConversation!.id,
          parent_message_id: null,
          role: "assistant" as const,
          position: -1,
          created_at: new Date().toISOString(),
          blocks: [{ id: uuidv4(), message_id: "", type: "error" as any, content: `Rerun Error: ${catchErrorMsg}`, position: 0, created_at: new Date().toISOString(), is_deleted: false }],
        };
        setMessages([...useChatStore.getState().messages, errMsg]);
        setGlobalError(`Rerun Error: ${catchErrorMsg}`);
        console.log("[ChatArea] Rerun: catch error message added to chat");
      }
    }
  };

  // Compute total tokens for the conversation
  const totalTokens = Object.values(messageUsage).reduce(
    (acc, u) => acc + (u.total_tokens || 0), 0
  );
  const totalInputTokens = Object.values(messageUsage).reduce(
    (acc, u) => acc + (u.total_input_tokens || 0), 0
  );
  const totalOutputTokens = Object.values(messageUsage).reduce(
    (acc, u) => acc + (u.total_output_tokens || 0), 0
  );
  const totalThoughtTokens = Object.values(messageUsage).reduce(
    (acc, u) => acc + (u.total_thought_tokens || 0), 0
  );

  // Log messages being rendered
  useEffect(() => {
    console.log("[ChatArea] Rendering", messages.length, "messages:",
      messages.map(m => ({
        id: m.id, role: m.role,
        blocks: m.blocks?.map(b => ({ type: b.type, position: b.position, contentPreview: b.content?.slice(0, 50) })),
      }))
    );
  }, [messages]);

  if (!currentConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 min-h-0 overflow-y-auto">
        <h1 className="text-4xl font-normal text-foreground mb-8">
          Explore AI models
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            { icon: "⭐", title: "Featured", desc: "Test out our most advanced and newest models." },
            { icon: "", title: "Code and Chat", desc: "Build chatbots, agents, and code with AI models." },
            { icon: "🖼️", title: "Image Generation", desc: "Create and edit images with AI." },
            { icon: "", title: "Video Generation", desc: "Generate videos with state of the art video generation models." },
            { icon: "", title: "Speech and Music", desc: "Explore text to speech and music generation models." },
            { icon: "⚡", title: "Real-time", desc: "Real-time voice and video with Live API." },
          ].map((item) => (
            <div
              key={item.title}
              className="panel p-5 panel-hover cursor-pointer space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium text-foreground">{item.title}</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <button className="btn-primary mt-8">Start building</button>
      </div>
    );
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 min-h-0">
        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className="group/msg relative space-y-3 animate-in fade-in duration-300">
            {/* Message header */}
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-medium">
                {msg.role === "user" ? "User" : "Model"}
              </span>
              <span>•</span>
              <span>
                {new Date(msg.created_at).toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Message actions - hover reveal, absolute positioned top-right */}
            {msg.role !== "system" && (
              <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
                <MessageActions
                  message={msg}
                  onEdit={handleEdit}
                  onRerun={handleRerun}
                  disabled={isAnyStreaming}
                />
              </div>
            )}

            {/* Blocks */}
            {msg.blocks
              .filter((b) => !b.is_deleted)
              .sort((a, b) => a.position - b.position)
              .map((block) => {
                // Editing textarea
                if (editingMessageId === msg.id && block.type === "text") {
                  return (
                    <div key={block.id} className="bg-card border border-border rounded-xl p-4">
                      <textarea
                        ref={editTextareaRef}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleSaveEdit();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            handleCancelEdit();
                          }
                        }}
                        className="w-full bg-transparent text-sm text-foreground resize-none focus:outline-none min-h-[80px]"
                        rows={4}
                      />
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-surface-variant rounded-lg transition-colors duration-150"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editingContent.trim() || isAnyStreaming}
                          className="px-3 py-1.5 text-xs btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {msg.role === "user" ? "Save & Rerun" : "Save"}
                        </button>
                      </div>
                    </div>
                  );
                }

                // Error blocks
                if ((block as any).type === "error") {
                  return (
                    <div key={block.id} className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl p-4 animate-in fade-in duration-300">
                      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-destructive font-medium">{block.content}</span>
                    </div>
                  );
                }

                return (
                  <div key={block.id}>
                    <ContentBlock type={block.type}>
                      {block.type === "text" && <TextBlock content={block.content} />}
                      {block.type === "image" && (
                        <button
                          onClick={() => setPreviewImage(block.content)}
                          className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors w-full text-left"
                          title="Click to preview"
                        >
                          <Image className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {block.content.length > 60
                              ? block.content.slice(0, 60) + "..."
                              : block.content}
                          </span>
                        </button>
                      )}
                      {block.type === "thinking" && <ThinkingBlock content={block.content} />}
                      {block.type === "tool_result" && (
                        <TextBlock
                          content={block.content}
                          className="bg-surface-variant border-l-2 border-l-accent"
                        />
                      )}
                    </ContentBlock>
                  </div>
                );
              })}

            {/* Token usage for assistant messages */}
            {msg.role === "assistant" && messageUsage[msg.id] && (
              <div className="flex items-center gap-3 text-[11px] text-muted px-1">
                <span title="Input tokens">In: {messageUsage[msg.id].total_input_tokens.toLocaleString()}</span>
                <span title="Output tokens">Out: {messageUsage[msg.id].total_output_tokens.toLocaleString()}</span>
                {messageUsage[msg.id].total_thought_tokens > 0 && (
                  <span title="Thought tokens">Think: {messageUsage[msg.id].total_thought_tokens.toLocaleString()}</span>
                )}
                <span title="Total tokens" className="font-medium">Total: {messageUsage[msg.id].total_tokens.toLocaleString()}</span>
              </div>
            )}
          </div>
        ))}

        {/* Rerun streaming */}
        {isRerunning && (rerunStreamingText || rerunStreamingThinking) && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-medium">Model</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Regenerating...
              </span>
            </div>
            {rerunStreamingThinking && (
              <ContentBlock type="thinking">
                <ThinkingBlock content={rerunStreamingThinking} />
              </ContentBlock>
            )}
            {rerunStreamingText && (
              <ContentBlock type="text">
                <TextBlock content={rerunStreamingText} />
              </ContentBlock>
            )}
          </div>
        )}

        {isRerunning && !rerunStreamingText && !rerunStreamingThinking && (
          <div className="flex items-center gap-2 text-sm text-muted animate-in fade-in duration-300">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Regenerating...
          </div>
        )}

        {/* InputBox streaming */}
        {isStreaming && !isRerunning && (streamingText || streamingThinking) && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-medium">Model</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Generating...
              </span>
            </div>
            {streamingThinking && (
              <ContentBlock type="thinking">
                <ThinkingBlock content={streamingThinking} />
              </ContentBlock>
            )}
            {streamingText && (
              <ContentBlock type="text">
                <TextBlock content={streamingText} />
              </ContentBlock>
            )}
          </div>
        )}

        {isStreaming && !isRerunning && !streamingText && !streamingThinking && (
          <div className="flex items-center gap-2 text-sm text-muted animate-in fade-in duration-300">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Thinking...
          </div>
        )}

        {/* Initial send: show Generating... when isLoading but streaming hasn't started yet */}
        {isLoading && !isStreaming && !isRerunning && (
          <div className="flex items-center gap-2 text-sm text-muted animate-in fade-in duration-300">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Generating...
          </div>
        )}
      </div>

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-surface-variant/80 text-foreground hover:bg-surface-variant transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
