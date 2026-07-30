"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import type { Block, Message } from "@/types";
import ContentBlock from "./ContentBlock";
import TextBlock from "./TextBlock";
import ImageBlock from "./ImageBlock";
import ThinkingBlock from "./ThinkingBlock";
import MessageActions from "./MessageActions";
import { AlertTriangle, XCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

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
    setMessages,
    updateMessage,
  } = useChatStore();

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Rerun streaming state (local, separate from InputBox streaming)
  const [isRerunning, setIsRerunning] = useState(false);
  const [rerunStreamingText, setRerunStreamingText] = useState("");
  const [rerunStreamingThinking, setRerunStreamingThinking] = useState("");
  const [rerunStreamError, setRerunStreamError] = useState("");
  const [rerunCatchError, setRerunCatchError] = useState("");
  const rerunScrollRef = useRef<HTMLDivElement>(null);

  const isAnyStreaming = isStreaming || isRerunning;

  // Auto-scroll during rerun streaming
  useEffect(() => {
    if (rerunScrollRef.current) {
      rerunScrollRef.current.scrollTop = rerunScrollRef.current.scrollHeight;
    }
  }, [rerunStreamingText, rerunStreamingThinking]);

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

    // Update message content in DB
    await fetch("/api/messages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: msg.id, content: newContent }),
    });

    // Update local state
    updateMessage(msg.id, newContent);

    // Delete all messages after this one and rerun
    await handleRerunFromMessage({ ...msg, blocks: msg.blocks || [] }, newContent);
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

    setIsRerunning(true);
    setRerunStreamingText("");
    setRerunStreamingThinking("");
    setRerunStreamError("");
    setRerunCatchError("");

    // Save current messages to restore on failure
    const messagesBeforeRerun = [...useChatStore.getState().messages];
    let apiCallSucceeded = false;

    try {
      // Delete messages from this position onward
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

      // Reload messages (now without the deleted ones)
      const reloadRes = await fetch(`/api/conversations/${currentConversation.id}`);
      const reloadData = await reloadRes.json();
      if (reloadData.success && reloadData.data) {
        setMessages(reloadData.data.messages || []);
      }

      // Send chat request with skip_user_message_creation
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

      // Handle non-OK response BEFORE streaming
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
                    setRerunStreamError(data.error || "Stream error");
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
    } catch (err: any) {
      console.error("Rerun failed:", err);
      setRerunCatchError(err.message || "Failed to regenerate");
    } finally {
      setIsRerunning(false);
      setRerunStreamingText("");
      setRerunStreamingThinking("");

      if (apiCallSucceeded) {
        // Success: reload messages from DB to get the new assistant response
        if (currentConversation) {
          const res = await fetch(`/api/conversations/${currentConversation.id}`);
          const data = await res.json();
          if (data.success && data.data) {
            setMessages(data.data.messages || []);
          }
        }
      } else {
        // Failure: restore old messages and show error
        setMessages(messagesBeforeRerun);
      }

      // Add error messages after reload/restore so they're not wiped out
      if (rerunStreamError) {
        const errMsg = {
          id: uuidv4(),
          conversation_id: currentConversation!.id,
          parent_message_id: null,
          role: "assistant" as const,
          position: -1,
          created_at: new Date().toISOString(),
          blocks: [{ id: uuidv4(), message_id: "", type: "error" as any, content: `Stream Error: ${rerunStreamError}`, position: 0, created_at: new Date().toISOString(), is_deleted: false }],
        };
        setMessages([...useChatStore.getState().messages, errMsg]);
        setRerunStreamError("");
      }
      if (rerunCatchError) {
        const errMsg = {
          id: uuidv4(),
          conversation_id: currentConversation!.id,
          parent_message_id: null,
          role: "assistant" as const,
          position: -1,
          created_at: new Date().toISOString(),
          blocks: [{ id: uuidv4(), message_id: "", type: "error" as any, content: `Rerun Error: ${rerunCatchError}`, position: 0, created_at: new Date().toISOString(), is_deleted: false }],
        };
        setMessages([...useChatStore.getState().messages, errMsg]);
        setRerunCatchError("");
      }
    }
  };

  if (!currentConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 min-h-0 overflow-y-auto">
        <h1 className="text-4xl font-normal text-foreground mb-8">
          Explore AI models
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            { icon: "⭐", title: "Featured", desc: "Test out our most advanced and newest models." },
            { icon: "💬", title: "Code and Chat", desc: "Build chatbots, agents, and code with AI models." },
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
    <div ref={rerunScrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 min-h-0">
      {/* Conversation title */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-medium text-foreground">
          {currentConversation.title}
        </h2>
      </div>

      {/* Messages */}
      {messages.map((msg) => (
        <div key={msg.id} className="space-y-3 animate-in fade-in duration-300">
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

          {/* Message actions for user messages */}
          {msg.role === "user" && (
            <MessageActions
              message={msg}
              onEdit={handleEdit}
              onRerun={handleRerun}
              disabled={isAnyStreaming}
            />
          )}

          {/* Blocks rendered as ContentBlock cards */}
          {msg.blocks
            .filter((b) => !b.is_deleted)
            .sort((a, b) => a.position - b.position)
            .map((block) => {
              // If this message is being edited and this is the text block, show textarea
              if (msg.role === "user" && editingMessageId === msg.id && block.type === "text") {
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
                        Save & Rerun
                      </button>
                    </div>
                  </div>
                );
              }

              // Error blocks rendered directly (not through ContentBlock)
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
                    {block.type === "image" && <ImageBlock content={block.content} />}
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
        </div>
      ))}

      {/* Rerun streaming response indicator */}
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

      {/* Loading indicator (no streaming text yet) */}
      {isRerunning && !rerunStreamingText && !rerunStreamingThinking && (
        <div className="flex items-center gap-2 text-sm text-muted animate-in fade-in duration-300">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Regenerating...
        </div>
      )}

      {/* InputBox streaming response indicator (for normal sends) */}
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

      {/* Loading indicator for normal send (no streaming text yet) */}
      {isStreaming && !isRerunning && !streamingText && !streamingThinking && (
        <div className="flex items-center gap-2 text-sm text-muted animate-in fade-in duration-300">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Thinking...
        </div>
      )}
    </div>
  );
}
