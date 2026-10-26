"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useChatStore, applyDbMessages } from "@/store/chatStore";
import type { Block, Message } from "@/types";
import ContentBlock from "./ContentBlock";
import TextBlock from "./TextBlock";
import ThinkingBlock from "./ThinkingBlock";
import MessageActions from "./MessageActions";
import { AlertTriangle, XCircle, Pencil, Check, X, XIcon, Volume2, Square } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { estimateTokens, shouldAutoReadReply } from "@/lib/context-manager";
import { buildOptimisticAssistantMessage, hasPersistableContent } from "@/lib/chat-persistence";
import { insertGroundingFootnotes, type GroundingMetadata } from "@/lib/grounding";
import { markdownToPlainText } from "@/lib/tts-text";
import { cn } from "@/lib/utils";

interface ChatAreaProps {
  messages: (Message & { blocks: Block[] })[];
  hasMoreMessages?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlder?: () => Promise<boolean>;
}

export default function ChatArea({ messages, hasMoreMessages, isLoadingOlder, onLoadOlder }: ChatAreaProps) {
  const {
    currentConversation,
    settings,
    isStreaming,
    streamingText,
    streamingThinking,
    isLoading,
    isRerunning,
    setIsRerunning,
    setMessages,
    updateMessage,
    setGlobalError,
    messageUsage,
    ttsEnabled,
    ttsVoice,
    ttsReadCodeBlocks,
    ttsAutoRead,
    ttsPlayingMessageId,
    setTtsPlayingMessageId,
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

  // TTS state — now backed by Edge-TTS (server) played through an <audio> element
  const prevIsAnyStreamingRef = useRef(false);
  const pendingAutoReadRef = useRef(false);
  // Id of the last assistant message we auto-read. Guards against reading the
  // PREVIOUS reply: when streaming ends, `isAnyStreaming` flips to false BEFORE
  // the final DB reload updates `messages`, so the last assistant message in a
  // stale snapshot is still the earlier turn.
  const lastAutoReadMessageIdRef = useRef<string | null>(null);
  // Id of the last assistant message visible AT the moment the reply completed
  // (the streaming -> idle snapshot). In a continued conversation that message
  // is the PREVIOUS turn, so auto-read must stay armed until the final DB
  // reload surfaces a DIFFERENT (fresh) assistant id before speaking.
  const armedLastAssistantIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);

  // Rerun streaming state — isRerunning now comes from store
  const [rerunStreamingText, setRerunStreamingText] = useState("");
  const [rerunStreamingThinking, setRerunStreamingThinking] = useState("");
  const [rerunStreamError, setRerunStreamError] = useState("");
  const [rerunCatchError, setRerunCatchError] = useState("");
  // Position of the user message being regenerated, so the streaming bubble can be
  // rendered right after it instead of at the end of the conversation.
  const [rerunTargetPosition, setRerunTargetPosition] = useState<number | null>(null);

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

  // Lazy-load older messages when the user scrolls near the top.
  const pendingScrollAdjustRef = useRef<number | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onLoadOlder) return;
    const handleTopScroll = () => {
      if (el.scrollTop < 120 && hasMoreMessages && !isLoadingOlder) {
        console.log("[ChatArea] Scroll near top -> requesting older messages");
        // Capture current scrollHeight so we can keep the viewport anchored after prepend.
        pendingScrollAdjustRef.current = el.scrollHeight;
        onLoadOlder().then((loaded) => {
          if (!loaded) pendingScrollAdjustRef.current = null;
        });
      }
    };
    el.addEventListener("scroll", handleTopScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleTopScroll);
  }, [hasMoreMessages, isLoadingOlder, onLoadOlder]);

  // Preserve the scroll position after a batch of older messages is prepended, so the content
  // the user was reading does not jump.
  useLayoutEffect(() => {
    if (pendingScrollAdjustRef.current != null && scrollRef.current) {
      const delta = scrollRef.current.scrollHeight - pendingScrollAdjustRef.current;
      if (delta > 0) {
        scrollRef.current.scrollTop += delta;
        console.log("[ChatArea] Preserved scroll after prepend, delta:", delta);
      }
      pendingScrollAdjustRef.current = null;
    }
  }, [messages]);

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

  // Follow newly appended messages (error bubbles, reloaded transcripts)
  // when the user is already reading at the bottom — a failed send must not
  // leave its error bubble out of view.
  useEffect(() => {
    if (!isAnyStreaming && !isUserScrolling.current && isNearBottom()) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    }
  }, [messages, isAnyStreaming, isNearBottom, scrollToBottom]);

  // Reset auto-read bookkeeping when switching conversations so a stale message
  // id (or an armed flag) from another conversation can never trigger—or
  // suppress—an auto-read for the wrong conversation.
  useEffect(() => {
    pendingAutoReadRef.current = false;
    lastAutoReadMessageIdRef.current = null;
    armedLastAssistantIdRef.current = null;
  }, [currentConversation?.id]);

  // TTS auto-read after a reply (streaming or rerun) completes. A pending flag
  // is armed on the streaming->idle transition — tracked via isAnyStreaming so
  // both paths trigger — and fires exactly once after the messages list settles
  // with a readable assistant message.
  useEffect(() => {
    if (prevIsAnyStreamingRef.current && !isAnyStreaming) {
      if (ttsEnabled && ttsAutoRead) {
        console.log("[ChatArea] Reply completed, arming auto-read");
        pendingAutoReadRef.current = true;
        // Snapshot the last assistant visible NOW, before the final DB reload
        // inserts the fresh reply. In a continued conversation this is the
        // PREVIOUS turn — we only speak a message that differs from it later.
        armedLastAssistantIdRef.current =
          useChatStore.getState().messages.slice().reverse().find((m) => m.role === "assistant")?.id ?? null;
        console.log("[ChatArea] Auto-read armed; snapshot last assistant id:", armedLastAssistantIdRef.current);
      } else {
        console.log("[ChatArea] Reply completed, auto-read skipped:", { ttsEnabled, ttsAutoRead });
      }
    }
    prevIsAnyStreamingRef.current = isAnyStreaming;
  }, [isAnyStreaming, ttsEnabled, ttsAutoRead]);

  // Fire the armed auto-read once the reloaded messages contain a readable assistant reply.
  // Only a NEW assistant message (a different id from the one last auto-read) is spoken:
  // the streaming->idle transition can land before the final DB reload updates `messages`,
  // in which case the last assistant in a stale snapshot is still the PREVIOUS turn. By
  // staying armed (not clearing the flag) until a fresh message id appears, the effect
  // re-fires when the new reply is actually present, instead of reading the old one.
  useEffect(() => {
    if (!pendingAutoReadRef.current || isAnyStreaming) return;
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistantMsg) return;
    const decision = shouldAutoReadReply({
      pendingAutoRead: pendingAutoReadRef.current,
      isAnyStreaming,
      armedLastAssistantId: armedLastAssistantIdRef.current,
      lastAutoReadId: lastAutoReadMessageIdRef.current,
      currentLastAssistantId: lastAssistantMsg.id,
      hasReadableText: Boolean(extractReadableText(lastAssistantMsg)),
    });
    if (!decision.fire) return;
    console.log("[ChatArea] Auto-read firing for settled message:", lastAssistantMsg.id);
    pendingAutoReadRef.current = false;
    lastAutoReadMessageIdRef.current = decision.settledId;
    armedLastAssistantIdRef.current = decision.settledId;
    speakMessage(lastAssistantMsg);
  }, [messages, isAnyStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract readable text from message blocks
  const extractReadableText = useCallback((msg: Message & { blocks: Block[] }): string => {
    const parts: string[] = [];
    for (const block of msg.blocks) {
      if (block.is_deleted) continue;
      if (block.type === "thinking") continue; // Always skip thinking content
      if (block.type === "text") {
        let cleaned = block.content;
        // Remove markdown code blocks if ttsReadCodeBlocks is false
        if (!ttsReadCodeBlocks) {
          cleaned = cleaned.replace(/```[\s\S]*?```/g, " [code block] ").replace(/`[^`]+`/g, " [code] ");
        }
        // Edge-TTS must receive plain prose: strip markdown syntax (headings,
        // emphasis markers, links, footnote definitions…) while keeping
        // ordinary punctuation — otherwise the voice reads out "asterisk
        // asterisk" and raw URLs.
        parts.push(markdownToPlainText(cleaned));
      }
    }
    return parts.join("\n").trim();
  }, [ttsReadCodeBlocks]);

  // Tear down the current <audio> element without triggering its onerror
  // handler: assigning src="" aborts the load and fires
  // MEDIA_ERR_SRC_NOT_SUPPORTED, so the handlers must be detached first to keep
  // normal teardowns from being reported as playback failures.
  const discardCurrentAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    }
  }, []);

  // Speak a message using the Edge-TTS backend (/api/tts). The returned mp3 is played
  // through an <audio> element so the *selected* voice is actually honored.
  const speakMessage = useCallback(async (msg: Message & { blocks: Block[] }) => {
    const text = extractReadableText(msg);
    if (!text) {
      console.log("[ChatArea] TTS: No readable text found");
      return;
    }

    // Stop any current playback / pending request first
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    discardCurrentAudio();

    console.log("[ChatArea] TTS: Requesting Edge-TTS for message:", msg.id, "voice:", ttsVoice, "text length:", text.length);
    setTtsPlayingMessageId(msg.id);

    const controller = new AbortController();
    ttsAbortRef.current = controller;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: ttsVoice }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch { /* not json */ }
        console.error("[ChatArea] TTS: backend error:", errMsg);
        setGlobalError(`TTS failed: ${errMsg}`);
        setTtsPlayingMessageId(null);
        return;
      }

      const blob = await res.blob();
      // Defensive validation: a 200 response must carry real audio bytes of an
      // audio MIME type, otherwise the <audio> element would later fail with an
      // opaque MEDIA_ERR_SRC_NOT_SUPPORTED / MEDIA_ERR_DECODE error.
      if (blob.size === 0) {
        throw new Error("TTS returned an empty audio body");
      }
      if (blob.type && !blob.type.startsWith("audio/")) {
        throw new Error(`TTS returned non-audio content (${blob.type}, ${blob.size} bytes)`);
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        console.log("[ChatArea] TTS: Finished playing message:", msg.id);
        URL.revokeObjectURL(url);
        setTtsPlayingMessageId(null);
      };
      audio.onerror = () => {
        // The error event serializes as {} in the console — pull the real
        // diagnostics from audio.error (MediaError) plus the blob metadata.
        const mediaErr = audio.error;
        const codeLabel =
          ["MEDIA_ERR_ABORTED", "MEDIA_ERR_NETWORK", "MEDIA_ERR_DECODE", "MEDIA_ERR_SRC_NOT_SUPPORTED"][
            (mediaErr?.code || 0) - 1
          ] || `UNKNOWN(code=${mediaErr?.code})`;
        console.error("[ChatArea] TTS: audio playback error:", {
          kind: codeLabel,
          code: mediaErr?.code ?? null,
          message: mediaErr?.message || null,
          mime: blob.type,
          bytes: blob.size,
          voice: ttsVoice,
          messageId: msg.id,
          objectUrl: url,
          stack: new Error().stack,
        });
        // Keep the object URL alive for a few minutes so the failing audio can
        // be opened / saved manually from the console as a download fallback.
        setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
        setTtsPlayingMessageId(null);
        setGlobalError(
          `TTS playback failed (${codeLabel}) — the audio may be truncated or unsupported by this browser. Try the ▶ icon again; the raw audio URL is kept in the console for manual download.`
        );
      };

      await audio.play();
      console.log("[ChatArea] TTS: Playback started for message:", msg.id);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.log("[ChatArea] TTS: request aborted");
      } else {
        console.error("[ChatArea] TTS: fetch/play failed:", err);
        setGlobalError(`TTS failed: ${err?.message || "unknown error"}`);
      }
      setTtsPlayingMessageId(null);
    }
  }, [ttsVoice, extractReadableText, setTtsPlayingMessageId, setGlobalError, discardCurrentAudio]);

  // Stop TTS playback
  const stopTts = useCallback(() => {
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    discardCurrentAudio();
    console.log("[ChatArea] TTS: Stopped");
    setTtsPlayingMessageId(null);
  }, [discardCurrentAudio, setTtsPlayingMessageId]);

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

  // Per-block delete: soft-deletes a single block (text or media) via the
  // blocks API and reloads the conversation, so the removed media no longer
  // participates in the context sent to the model.
  const handleDeleteBlock = async (block: Block) => {
    if (isAnyStreaming) return;
    const res = await fetch(`/api/blocks/${block.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!data?.success) {
      setGlobalError(data?.error || "Failed to delete block");
      return;
    }
    const conv = currentConversation;
    if (conv) {
      const convRes = await fetch(`/api/conversations/${conv.id}`);
      const convData = await convRes.json();
      if (convData.success && convData.data) {
        setMessages(convData.data.messages || []);
      }
    }
  };

  const handleRerunFromMessage = async (message: Message & { blocks?: any[] }, content: string) => {
    if (!currentConversation) return;

    console.log("[ChatArea] handleRerunFromMessage called, message position:", message.position, "content:", content.slice(0, 50));
    setIsRerunning(true);
    setRerunTargetPosition(message.position);
    setRerunStreamingText("");
    setRerunStreamingThinking("");
    setRerunStreamError("");
    setRerunCatchError("");

    // Create AbortController for this rerun so InputBox can abort it
    const rerunAbortController = new AbortController();
    useChatStore.getState().setRerunAbortController(rerunAbortController);

    const messagesBeforeRerun = [...useChatStore.getState().messages];
    let apiCallSucceeded = false;
    let wasAborted = false;
    // Use plain variables (not React state) to track errors — React state is async and stale in finally block
    let streamErrorMsg = "";
    let catchErrorMsg = "";
    let stopSeqNotice = false;

    try {
      console.log("[ChatArea] Rerun: removing only the assistant reply after position", message.position, "(in-place regenerate)");
      const rerunRes = await fetch(`/api/messages/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          from_position: message.position,
          mode: "regenerate", // preserve later turns, only drop this reply
        }),
      });

      if (!rerunRes.ok) {
        throw new Error(`Failed to delete messages: HTTP ${rerunRes.status}`);
      }

      console.log("[ChatArea] Rerun: old reply removed, reloading from DB...");
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
          regenerate_at_position: message.position, // build context only up to this user turn
        }),
        signal: rerunAbortController.signal,
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
            try {
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
                    } else if (data.type === "stop_sequence") {
                      // Generation was stopped because the output contained a stop sequence
                      stopSeqNotice = true;
                      console.log("[ChatArea] Rerun: stop sequence hit:", data.sequence);
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
            } catch (readErr: any) {
              if (readErr.name === "AbortError" || rerunAbortController.signal.aborted) {
                wasAborted = true;
                console.log("[ChatArea] Rerun: stream aborted by user");
              } else {
                throw readErr;
              }
              break;
            }
          }
        }
      }

      apiCallSucceeded = true;
      console.log("[ChatArea] Rerun: API call succeeded, streamErrorMsg:", streamErrorMsg || "(none)", "wasAborted:", wasAborted);
    } catch (err: any) {
      if (err.name === "AbortError" || rerunAbortController.signal.aborted) {
        wasAborted = true;
        console.log("[ChatArea] Rerun: request aborted by user");
      } else {
        console.error("[ChatArea] Rerun failed:", err);
        catchErrorMsg = err.message || "Failed to regenerate";
        setRerunCatchError(catchErrorMsg);
      }
    } finally {
      // Promote the accumulated rerun buffer into a message BEFORE clearing the
      // rerun streaming state, so the regenerated reply stays visible across the
      // async DB write + reload (same as the send path).
      if (apiCallSucceeded && !wasAborted && !streamErrorMsg && hasPersistableContent(rerunStreamingText, rerunStreamingThinking)) {
        const optimisticReply = buildOptimisticAssistantMessage({
          conversationId: currentConversation.id,
          id: `assistant-${uuidv4()}`,
          text: rerunStreamingText,
          thinking: rerunStreamingThinking,
          now: new Date().toISOString(),
        });
        setMessages([...useChatStore.getState().messages, optimisticReply]);
        console.log("[ChatArea] Rerun: promoted streamed reply to a message while the DB write is in flight:", optimisticReply.id);
      }
      setIsRerunning(false);
      setRerunTargetPosition(null);
      setRerunStreamingText("");
      setRerunStreamingThinking("");
      useChatStore.getState().setRerunAbortController(null);
      console.log("[ChatArea] Rerun: finally block, apiCallSucceeded:", apiCallSucceeded,
        "wasAborted:", wasAborted,
        "streamErrorMsg:", streamErrorMsg || "(none)", "catchErrorMsg:", catchErrorMsg || "(none)");

      if (wasAborted) {
        // User aborted — reload from DB to show partial content
        console.log("[ChatArea] Rerun: aborted, reloading messages from DB...");
        if (currentConversation) {
          try {
            const res = await fetch(`/api/conversations/${currentConversation.id}`);
            const data = await res.json();
            if (data.success && data.data) {
              applyDbMessages(currentConversation.id, data.data.messages || []);
            }
          } catch { /* ignore */ }
        }
      } else if (apiCallSucceeded) {
        // Reload from DB to get the persisted assistant message. applyDbMessages
        // keeps the optimistic reply only until the persisted row (same text)
        // arrives, so the reply is never duplicated nor dropped.
        if (currentConversation) {
          const res = await fetch(`/api/conversations/${currentConversation.id}`);
          const data = await res.json();
          if (data.success && data.data) {
            applyDbMessages(currentConversation.id, data.data.messages || []);
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
      if (stopSeqNotice) {
        // Notify the user that generation was stopped by a stop sequence (Safety Settings)
        setGlobalError("AI 生成的内容包含 stop sequence，违反了 Safety Settings");
        console.log("[ChatArea] Rerun: stop sequence notice shown");
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
      <div className="flex-1 overflow-y-auto">
        {/* min-h-[100dvh] ensures the wrapper is at least viewport height for vertical centering */}
        <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 md:px-8 py-8">
          <h1 className="text-2xl md:text-4xl font-normal text-foreground mb-6 md:mb-8">
            Explore AI models
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 max-w-3xl w-full">
            {[
              { icon: "🗄️", title: "Local-first storage", desc: "All conversations, settings and usage stats stay in a local SQLite database." },
              { icon: "🔌", title: "Bring your own endpoint", desc: "Works with any Gemini or OpenAI-compatible API: custom Base URL, key, protocol and proxy." },
              { icon: "🧠", title: "Long-term memory (RAG)", desc: "Trimmed history is still retrievable via semantic search — fully on-device, no embedding channel needed." },
              { icon: "🧰", title: "Full tool suite", desc: "Structured outputs, function calling, code execution, Search / Maps grounding and URL context." },
              { icon: "🗣️", title: "Edge-TTS voice", desc: "Read replies aloud with multiple voices and volume / rate / pitch control." },
              { icon: "🔒", title: "Password protection", desc: "Optional lock screen guarding the whole app, with dark / light / system themes." },
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

          <button className="btn-primary mt-8 mb-4">Start building</button>
        </div>
      </div>
    );
  }

  // In-place rerun: build the streaming bubble once and render it right after the
  // target user message; only fall back to the end of the list when that message is
  // not currently rendered (e.g. lazy-loaded away).
  const rerunTargetRendered =
    rerunTargetPosition === null ||
    messages.some((m) => m.role === "user" && m.position === rerunTargetPosition);

  const rerunStreamingBubble =
    isRerunning && (rerunStreamingText || rerunStreamingThinking) ? (
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
    ) : null;

  const rerunPendingBubble =
    isRerunning && !rerunStreamingText && !rerunStreamingThinking ? (
      <div className="flex items-center gap-2 text-sm text-muted animate-in fade-in duration-300">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Regenerating...
      </div>
    ) : null;

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 min-h-0">
        {/* Lazy-load indicator / hint at the top of the transcript */}
        {isLoadingOlder && (
          <div className="flex items-center justify-center py-2 text-xs text-muted">
            <span className="animate-pulse">Loading earlier messages…</span>
          </div>
        )}
        {!isLoadingOlder && hasMoreMessages && (
          <div className="flex items-center justify-center py-2 text-xs text-muted/60">
            Scroll up to load earlier messages
          </div>
        )}
        {/* Messages */}
        {messages.map((msg) => {
          // Skip messages with no visible blocks: they would render as an empty
          // placeholder (header + token stats only). The blocks API purges such
          // rows when the last visible block is deleted; this guard covers any
          // remaining ones.
          const hasVisibleBlocks = msg.blocks.some(
            (b) => !b.is_deleted && b.type !== "grounding"
          );
          const isRerunTarget = isRerunning && msg.position === rerunTargetPosition;
          if (!hasVisibleBlocks && editingMessageId !== msg.id && !isRerunTarget) {
            return null;
          }
          return (
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
              {/* TTS play/stop button for assistant messages */}
              {msg.role === "assistant" && ttsEnabled && (
                <button
                  onClick={() => {
                    if (ttsPlayingMessageId === msg.id) {
                      stopTts();
                    } else {
                      speakMessage(msg);
                    }
                  }}
                  className={cn(
                    "p-0.5 rounded transition-colors duration-150",
                    ttsPlayingMessageId === msg.id
                      ? "text-accent hover:text-accent/80"
                      : "text-muted hover:text-foreground"
                  )}
                  title={ttsPlayingMessageId === msg.id ? "Stop reading" : "Read aloud"}
                >
                  {ttsPlayingMessageId === msg.id ? (
                    <Square className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                </button>
              )}
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

            {/* Google Search grounding citations are stored in a dedicated
                `grounding` block; they annotate the text blocks below as
                footnotes and are never rendered on their own. */}
            {(() => {
              const gb = msg.blocks.find((b) => b.type === "grounding" && !b.is_deleted);
              let groundingMeta: GroundingMetadata | undefined;
              if (gb) {
                try {
                  groundingMeta = JSON.parse(gb.content) as GroundingMetadata;
                } catch {
                  groundingMeta = undefined;
                }
              }
              return (
            /* Blocks */
            msg.blocks
              .filter((b) => !b.is_deleted)
              .sort((a, b) => a.position - b.position)
              .map((block) => {
                if (block.type === "grounding") return null;
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
                        className="w-full bg-transparent text-sm text-foreground resize-y focus:outline-none min-h-[180px] md:min-h-[140px] max-h-[60vh]"
                        rows={6}
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
                    <ContentBlock
                      type={block.type}
                      onDelete={
                        // Only persisted blocks can be deleted; temp/streaming
                        // blocks have no DB row yet.
                        block.message_id && !block.id.startsWith("temp")
                          ? () => handleDeleteBlock(block)
                          : undefined
                      }
                    >
                      {block.type === "text" && (
                        <TextBlock
                          content={
                            groundingMeta
                              // Scope the footnote labels to this message so the
                              // generated anchor ids stay unique across turns.
                              ? insertGroundingFootnotes(block.content, groundingMeta, msg.id)
                              : block.content
                          }
                        />
                      )}
                      {block.type === "image" && (
                        <button
                          onClick={() => setPreviewImage(block.content)}
                          className="block w-full text-left"
                          title="Click to preview"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={block.content}
                            alt="Uploaded content"
                            className="max-h-[320px] max-w-full rounded-lg"
                          />
                        </button>
                      )}
                      {block.type === "video" && (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video
                          src={block.content}
                          controls
                          className="max-h-[320px] max-w-full rounded-lg"
                        />
                      )}
                      {block.type === "audio" && (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <audio src={block.content} controls className="w-full" />
                      )}
                      {(block.type === "pdf" || block.type === "file") && (
                        <a
                          href={block.content}
                          download={block.type === "pdf" ? "attachment.pdf" : "attachment.txt"}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-variant px-3 py-2 text-sm text-foreground hover:bg-border/40 transition-colors"
                          title="Click to download"
                        >
                          <span>{block.type === "pdf" ? "📄" : "📎"}</span>
                          <span>{block.type === "pdf" ? "PDF document" : "Text file"}</span>
                        </a>
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
              })
              );
            })()}

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

            {/* In-place rerun: show the streaming bubble directly after the target user message */}
            {msg.role === "user" && msg.position === rerunTargetPosition && (
              <>
                {rerunStreamingBubble}
                {rerunPendingBubble}
              </>
            )}
          </div>
          );
        })}

        {/* Rerun streaming fallback — only when the target user message is not rendered */}
        {!rerunTargetRendered && (
          <>
            {rerunStreamingBubble}
            {rerunPendingBubble}
          </>
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
