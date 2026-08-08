import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, queryAll, execute } from "@/lib/db";
import { sendChatRequest, sendChatRequestStream, type StreamDelta } from "@/lib/api-client";
import { buildApiMessages, buildApiMessagesWithSlidingWindow } from "@/lib/context-manager";
import { resolveRagConfig, retrieveMemoriesSafe } from "@/lib/rag";
import { nextMessagePosition, persistAssistantMessage, hasPersistableContent } from "@/lib/chat-persistence";
import { requireUnlock } from "@/lib/auth";
import { getModelContextWindow, isGoogleModel, GOOGLE_DEFAULT_CONTEXT_WINDOW } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "@/types";

export const dynamic = "force-dynamic";

// Derive the mime type from a stored data URL ("data:image/png;base64,...").
// Used when rebuilding attachments for rerun/regenerate requests, where the
// client sends no attachments and only DB blocks carry the media.
function mimeFromDataUrl(dataUrl: string, fallback: string): string {
  const m = /^data:([^;,]+)/.exec(dataUrl || "");
  return m?.[1] || fallback;
}

const MIME_FALLBACK_BY_BLOCK_TYPE: Record<string, string> = {
  image: "image/png",
  video: "video/mp4",
  audio: "audio/webm",
  pdf: "application/pdf",
  file: "text/plain",
};

export async function POST(request: NextRequest) {
  try {
    // Security: no chat data may be read/written while the app is locked.
    const locked = await requireUnlock(request);
    if (locked) return locked;

    console.log("[chat/api] ====== POST /api/chat START ======");
    await getDb();
    const body = await request.json();
    console.log("[chat/api] Request body keys:", Object.keys(body));
    console.log("[chat/api] conversation_id:", body.conversation_id);
    console.log("[chat/api] message:", (body.message || "").slice(0, 100));
    console.log("[chat/api] model:", body.model);
    console.log("[chat/api] stream:", body.stream);
    console.log("[chat/api] attachments:", body.attachments?.length || 0, body.attachments?.map((a: any) => ({ mime_type: a.mime_type, name: a.name, data_url_len: a.data_url?.length || 0 })));
    console.log("[chat/api] skip_user_message_creation:", body.skip_user_message_creation);
    const {
      conversation_id,
      message,
      model,
      temperature,
      system_instructions,
      tools,
      thinking_level,
      stream: wantStream,
      attachments,
      skip_user_message_creation,
      regenerate_at_position,
    } = body;

    // Issue 6: in-place regeneration. When set, we only use context up to and including the
    // user message at this position and regenerate its assistant reply (position P+1) WITHOUT
    // touching any later turns (which the rerun endpoint preserved in "regenerate" mode).
    const regeneratePosition =
      regenerate_at_position !== undefined && regenerate_at_position !== null
        ? Number(regenerate_at_position)
        : null;
    console.log("[chat/api] regenerate_at_position:", regeneratePosition);

    if (!conversation_id || (!message && !(attachments?.length > 0))) {
      return NextResponse.json(
        { success: false, error: "conversation_id and message (or attachments) are required" },
        { status: 400 }
      );
    }

    const settingsRow = await queryOne("SELECT * FROM settings WHERE id = 1");

    if (!settingsRow?.base_url) {
      return NextResponse.json(
        { success: false, error: "Please configure Base URL and API Key first" },
        { status: 400 }
      );
    }

    console.log("[chat/api] Settings:", {
      base_url: settingsRow.base_url,
      api_protocol: settingsRow.api_protocol,
      proxy_url: settingsRow.proxy_url || "(none)",
      model: settingsRow.selected_model,
      hasApiKey: !!settingsRow.api_key,
    });

    // Normalize proxy_url: treat null/undefined/empty as no proxy
    const proxyUrl = (settingsRow.proxy_url as string) || "";

    const now = new Date().toISOString();

    // Link this request's usage row to a matching saved API config (Dashboard)
    // and refresh its "last used" timestamp. Best-effort: chat must never fail
    // because of dashboard bookkeeping.
    let apiConfigId = "";
    try {
      const cfg = await queryOne(
        "SELECT id FROM api_configs WHERE base_url = ? ORDER BY created_at DESC LIMIT 1",
        [settingsRow.base_url]
      );
      if (cfg?.id) {
        apiConfigId = cfg.id as string;
        await execute("UPDATE api_configs SET last_used_at = ? WHERE id = ?", [now, cfg.id]);
      }
    } catch {
      // ignore linkage failures
    }

    const existingMsgs = await queryAll(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY position ASC",
      [conversation_id]
    );
    console.log("[chat/api] Existing messages in DB:", existingMsgs.length);

    // First message of a conversation = one new conversation touched today.
    const conversationCountDelta = existingMsgs.length === 0 ? 1 : 0;

    // Positions must come from MAX(position), never from the row count: after messages are
    // deleted, length+1 can reuse a position that a later message still occupies, which
    // corrupted conversation ordering (duplicate positions).
    const nextPosition = nextMessagePosition(existingMsgs);

    const allMessages: ChatMessage[] = [];
    for (const msg of existingMsgs) {
      // Issue 6: for in-place regeneration only include context up to (and including) the
      // target user message; later turns must not leak into the prompt.
      if (regeneratePosition !== null && msg.position > regeneratePosition) continue;
      const blocks = await queryAll(
        "SELECT * FROM blocks WHERE message_id = ? AND is_deleted = 0 ORDER BY position ASC",
        [msg.id]
      );

      const textContent = blocks
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.content)
        .join("\n");

      // Attachment-only user messages (no text) must still reach the API so
      // their saved media blocks can be re-attached (e.g. on rerun).
      const hasMediaBlocks = blocks.some((b: any) =>
        ["image", "video", "audio", "pdf", "file"].includes(b.type)
      );

      if (textContent || (msg.role === "user" && hasMediaBlocks)) {
        // Carry the DB id/position along so RAG can tell which messages the sliding
        // window kept vs. dropped (ChatMessage itself stays id-free).
        allMessages.push(Object.assign({ role: msg.role as any, content: textContent }, { id: msg.id, position: msg.position }));
      }
    }
    console.log("[chat/api] Reconstructed messages from DB:", allMessages.length, allMessages.map(m => ({ role: m.role, contentLen: m.content.length })));

    // For a fresh send we append the new user turn. For in-place regeneration the user message
    // already exists in DB (and is included above), so we must NOT duplicate it.
    if (regeneratePosition === null) {
      allMessages.push({ role: "user", content: message });
    }
    console.log("[chat/api] allMessages after context build:", allMessages.length);

    // Get conversation row for model info
    const convRow = await queryOne("SELECT * FROM conversations WHERE id = ?", [conversation_id]);

    // Determine model context window for sliding window
    const useModel = model || convRow?.model || settingsRow.selected_model;
    let modelContextWindow = 800_000; // default
    // Try to get context window from custom_models table
    const customModelRow = await queryOne("SELECT context_window FROM custom_models WHERE id = ?", [useModel]);
    if (customModelRow?.context_window) {
      modelContextWindow = customModelRow.context_window as number;
    } else if (isGoogleModel(useModel)) {
      modelContextWindow = GOOGLE_DEFAULT_CONTEXT_WINDOW;
    } else {
      modelContextWindow = 128_000;
    }

    // User-configured context cap (0 = model default). CJK tokenization is
    // dense (~1 token/char), so a long history otherwise re-sends EVERYTHING
    // each turn up to the model's whole window (observed: ~412K input tokens
    // per message on a 670-turn Chinese conversation). The cap engages the
    // sliding window + RAG earlier, bounding per-message cost.
    const contextCapRaw = parseInt(settingsRow.max_context_tokens as any, 10);
    const contextCap = Number.isFinite(contextCapRaw) && contextCapRaw > 0 ? contextCapRaw : 0;
    if (contextCap > 0) {
      modelContextWindow = Math.min(modelContextWindow, contextCap);
      console.log("[chat/api] Context capped by user setting:", modelContextWindow);
    }

    // Use sliding window to fit within context limit
    const sysInstructions = system_instructions || settingsRow.system_instructions || undefined;
    let { messages: apiMessages, trimmed: contextTrimmed, originalCount: originalMsgCount } = buildApiMessagesWithSlidingWindow(
      allMessages,
      sysInstructions,
      modelContextWindow
    );

    if (contextTrimmed) {
      console.log(`[chat/api] Context trimmed: ${originalMsgCount} -> ${apiMessages.filter(m => m.role !== "system").length} messages (limit: ${modelContextWindow} tokens)`);
    }

    // ===== RAG: restore sliding-window-dropped history via retrieval =====
    // Runs ONLY when trimming actually happened, alongside (never instead of) the
    // sliding window. Dropped messages are lazily embedded into the vector store,
    // then the most relevant ones for the current question are injected back into
    // the request as a retrieved-memory block. Any failure degrades to plain
    // sliding-window behavior — chat must never break because of RAG.
    let ragInjectedCount = 0;
    const ragConfig = resolveRagConfig(settingsRow);
    if (contextTrimmed && ragConfig.enabled) {
      const keptIds = new Set(
        apiMessages.map((m) => (m as any).id).filter(Boolean) as string[]
      );
      const excluded = allMessages.filter(
        (m) => (m as any).id && !keptIds.has((m as any).id)
      ) as unknown as { id: string; role: string; position: number; content: string }[];
      // Reserve headroom for the retrieved memories, then re-trim so the final
      // request (window content + memories) still fits the context window.
      const ragBudget = Math.min(Math.floor(modelContextWindow * 0.1), 32_000);
      // retrieveMemoriesSafe never throws: any RAG failure degrades to plain
      // sliding-window behavior — chat must never break because of RAG.
      const memories = await retrieveMemoriesSafe(
        conversation_id,
        message,
        excluded,
        keptIds,
        ragConfig,
        ragBudget,
        {
          baseUrl: settingsRow.base_url as string,
          apiKey: settingsRow.api_key as string,
          protocol: settingsRow.api_protocol as any,
          proxyUrl,
        }
      );
      if (memories.text) {
        const reduced = buildApiMessagesWithSlidingWindow(
          allMessages,
          sysInstructions,
          modelContextWindow - ragBudget
        );
        apiMessages = reduced.messages;
        // Inject into the system message (provider-agnostic; avoids role-alternation
        // issues that a synthetic user/model turn could cause).
        const sysMsg = apiMessages.find((m) => m.role === "system");
        if (sysMsg) {
          sysMsg.content = `${sysMsg.content}\n\n${memories.text}`;
        } else {
          apiMessages.unshift({ role: "system", content: memories.text });
        }
        ragInjectedCount = memories.count;
        console.log(`[chat/api] RAG injected ${memories.count} memory chunk(s) (indexed ${memories.indexed} new)`);
      } else {
        console.log("[chat/api] RAG: no relevant memories found, proceeding with sliding window only");
      }
    }

    // Attach multimodal data for the last user message
    const lastUserMsg = apiMessages[apiMessages.length - 1];
    console.log("[chat/api] Last API message:", lastUserMsg?.role, "content len:", lastUserMsg?.content?.length);
    if (attachments?.length > 0 && lastUserMsg?.role === "user") {
      console.log("[chat/api] Attaching", attachments.length, "files to last user message");
      (lastUserMsg as any).attachments = attachments.map((a: any) => ({
        data_url: a.data_url || a.dataUrl,
        mime_type: a.mime_type || a.mimeType || a.type,
        name: a.name || "file",
      }));
    } else if (lastUserMsg?.role === "user" && (lastUserMsg as any).id) {
      // Rerun / in-place regenerate: the client sends no attachments, but the
      // user message being re-answered may still have media blocks saved in DB.
      // Without rebuilding them the model answers blind ("I can't see any image").
      const mediaBlocks = await queryAll(
        "SELECT type, content FROM blocks WHERE message_id = ? AND is_deleted = 0 AND type IN ('image','video','audio','pdf','file') ORDER BY position ASC",
        [(lastUserMsg as any).id]
      );
      const rebuilt = mediaBlocks
        .map((b: any) => ({
          data_url: b.content as string,
          mime_type: mimeFromDataUrl(
            b.content as string,
            MIME_FALLBACK_BY_BLOCK_TYPE[b.type as string] || "application/octet-stream"
          ),
          name: "",
        }))
        .filter((a) => a.data_url);
      if (rebuilt.length > 0) {
        (lastUserMsg as any).attachments = rebuilt;
        console.log("[chat/api] Rebuilt", rebuilt.length, "attachment(s) from saved blocks for rerun");
      }
    }

    const useTemp = temperature ?? settingsRow.temperature;

    // Parse tools_config from request or settings
    let toolsConfig = tools;
    if (!toolsConfig && settingsRow.tools_config) {
      try {
        toolsConfig = JSON.parse(settingsRow.tools_config as string);
      } catch {
        toolsConfig = undefined;
      }
    }

    // Parse safety settings
    let safetySettings: any[] = [];
    if (settingsRow.safety_settings) {
      try {
        safetySettings = JSON.parse(settingsRow.safety_settings as string);
      } catch {
        safetySettings = [];
      }
    }

    // Parse stop sequences (Safety Settings)
    let stopSequences: string[] = [];
    if (settingsRow.stop_sequences) {
      try {
        const parsed = JSON.parse(settingsRow.stop_sequences as string);
        if (Array.isArray(parsed)) {
          stopSequences = parsed.filter((s: any) => typeof s === "string" && s.length > 0);
        }
      } catch {
        stopSequences = [];
      }
    }
    console.log("[chat/api] stop_sequences:", JSON.stringify(stopSequences));

    // Coerce legacy empty-string DB values to sane numeric defaults
    const toInt = (v: any, def: number) => {
      const n = typeof v === "number" ? v : parseInt(v, 10);
      return Number.isFinite(n) && n >= 1 ? n : def;
    };
    const topPNum = parseFloat(settingsRow.top_p as any);

    // Prompt + output must both fit the (possibly capped) window. When a cap
    // is set, clamp the output reservation so at least half the window stays
    // available for the prompt — otherwise small caps + large output settings
    // produce 400s.
    let maxOutputTokens = Math.min(65536, toInt(settingsRow.max_output_tokens, 65536));
    if (contextCap > 0) {
      maxOutputTokens = Math.min(maxOutputTokens, Math.max(1024, Math.floor(contextCap / 2)));
    }

    const commonOptions = {
      top_p: Number.isFinite(topPNum) ? topPNum : 0.95,
      top_k: toInt(settingsRow.top_k, 64),
      max_output_tokens: maxOutputTokens,
      safety_settings: safetySettings,
      stop_sequences: stopSequences,
      tools_config: toolsConfig,
      // Issues 8/9: user-defined structured-output schema + function declarations (raw JSON strings)
      structured_output_schema: (body.structured_output_schema ?? settingsRow.structured_output_schema) || undefined,
      function_declarations: (body.function_declarations ?? settingsRow.function_declarations) || undefined,
      thinking_level: thinking_level || settingsRow.thinking_level,
      // Gemini 3+ per-content-item media resolution — caps media token cost
      // (applied per media part in buildGeminiAttachmentParts)
      media_resolution: settingsRow.media_resolution || "unspecified",
    };
    console.log("[chat/api] tools_config:", JSON.stringify(toolsConfig || {}), "hasSchema:", !!commonOptions.structured_output_schema, "hasFunctionDecls:", !!commonOptions.function_declarations);

    // Pre-store user message (or reuse existing for rerun)
    let userMsgId: string;
    let userPosition: number;

    if (skip_user_message_creation) {
      // Issue 6: in-place regeneration reuses the EXACT user message at the target position
      // (not merely the last user message), so later turns stay attached to their positions.
      if (regeneratePosition !== null) {
        const targetUserMsg = existingMsgs.find((m: any) => m.position === regeneratePosition && m.role === "user");
        if (targetUserMsg) {
          userMsgId = targetUserMsg.id;
          userPosition = targetUserMsg.position;
          console.log("[chat/api] Regenerate: reusing user message at position", userPosition, "id", userMsgId);
        } else {
          console.warn("[chat/api] Regenerate: no user message at position", regeneratePosition, "- creating fallback");
          userMsgId = uuidv4();
          userPosition = regeneratePosition;
          await execute(
            `INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES (?, ?, 'user', ?, ?)`,
            [userMsgId, conversation_id, userPosition, now]
          );
          await execute(
            `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'text', ?, 0, ?)`,
            [uuidv4(), userMsgId, message, now]
          );
        }
      } else {
        // Legacy rerun: find the last user message and reuse it
        const lastUserMsg = existingMsgs.filter((m: any) => m.role === "user").pop();
        if (lastUserMsg) {
          userMsgId = lastUserMsg.id;
          userPosition = lastUserMsg.position;
        } else {
          // User message was deleted by rerun endpoint; create a new one from the provided message content
          console.log("[chat/api] No user message found for rerun, creating new one from message content");
          userMsgId = uuidv4();
          userPosition = nextPosition;
          await execute(
            `INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES (?, ?, 'user', ?, ?)`,
            [userMsgId, conversation_id, userPosition, now]
          );
          const userBlockId = uuidv4();
          await execute(
            `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'text', ?, 0, ?)`,
            [userBlockId, userMsgId, message, now]
          );
        }
      }
    } else {
      userMsgId = uuidv4();
      userPosition = nextPosition;
      console.log("[chat/api] Creating user message:", userMsgId, "position:", userPosition);
      await execute(
        `INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES (?, ?, 'user', ?, ?)`,
        [userMsgId, conversation_id, userPosition, now]
      );
      const userBlockId = uuidv4();
      if (message) {
        await execute(
          `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'text', ?, 0, ?)`,
          [userBlockId, userMsgId, message, now]
        );
        console.log("[chat/api] User message text block created:", userBlockId);
      }
    }

    // Store attachment blocks with the user message (image blocks before text block)
    if (attachments?.length > 0) {
      console.log("[chat/api] Storing", attachments.length, "attachment blocks");
      const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB for images/audio
      const MAX_VIDEO_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50MB for video
      let attPosition = -1; // Negative positions to appear before text block (position 0)
      for (const att of attachments) {
        const mimeType = att.mime_type || att.mimeType || att.type || '';
        const dataUrl = att.data_url || att.dataUrl || '';
        console.log("[chat/api] Attachment:", { mimeType, dataUrlLen: dataUrl.length, name: att.name });
        // Check size limits: video=50MB, others=20MB
        const isVideo = mimeType.startsWith('video/');
        const maxSize = isVideo ? MAX_VIDEO_ATTACHMENT_SIZE : MAX_ATTACHMENT_SIZE;
        if (dataUrl.length > maxSize * 1.5) {
          console.warn("[chat/api] Rejecting oversized attachment:", att.name, "size:", dataUrl.length, "max:", maxSize);
          continue;
        }
        if (mimeType.startsWith('image/')) {
          await execute(
            `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'image', ?, ?, ?)`,
            [uuidv4(), userMsgId, dataUrl, attPosition--, now]
          );
          console.log("[chat/api] Image block stored at position:", attPosition + 1);
        } else if (mimeType.startsWith('video/')) {
          await execute(
            `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'video', ?, ?, ?)`,
            [uuidv4(), userMsgId, dataUrl, attPosition--, now]
          );
          console.log("[chat/api] Video block stored at position:", attPosition + 1);
        } else if (mimeType.startsWith('audio/')) {
          await execute(
            `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'audio', ?, ?, ?)`,
            [uuidv4(), userMsgId, dataUrl, attPosition--, now]
          );
          console.log("[chat/api] Audio block stored at position:", attPosition + 1);
        } else if (mimeType === 'application/pdf') {
          await execute(
            `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'pdf', ?, ?, ?)`,
            [uuidv4(), userMsgId, dataUrl, attPosition--, now]
          );
          console.log("[chat/api] PDF block stored at position:", attPosition + 1);
        } else if (mimeType.startsWith('text/')) {
          await execute(
            `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'file', ?, ?, ?)`,
            [uuidv4(), userMsgId, dataUrl, attPosition--, now]
          );
          console.log("[chat/api] Text file block stored at position:", attPosition + 1);
        } else {
          console.warn("[chat/api] Skipping unsupported attachment type:", mimeType);
        }
      }
    }

    // Update conversation title or timestamp
    if (existingMsgs.length === 0) {
      const title = (message || "Attachment").slice(0, 50);
      await execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", [title, now, conversation_id]);
    } else {
      await execute("UPDATE conversations SET updated_at = ? WHERE id = ?", [now, conversation_id]);
    }

    if (wantStream) {
      // ===== Streaming path =====
      let fullText = "";
      let fullThinking = "";
      const toolResults: { type: string; content: string }[] = [];
      let usageData: any = null;
      let stopSequenceHit: string | null = null;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const assistantMsgId = uuidv4();
          const assistantPosition = userPosition + 1;
          let assistantStored = false;

          // Persist the assistant message + its blocks (idempotent). Called on
          // normal completion and again from the catch path, so already-generated
          // partial content (the user was billed for those tokens) is never lost
          // when the stream errors out or the client disconnects mid-generation.
          // persistAssistantMessage itself is idempotent on messageId (see
          // src/lib/chat-persistence.ts), so the double call is safe.
          const storeAssistantMessage = async () => {
            if (assistantStored) return;
            assistantStored = await persistAssistantMessage(
              { queryOne, execute },
              {
                conversationId: conversation_id,
                messageId: assistantMsgId,
                position: assistantPosition,
                regeneratePosition: regeneratePosition,
                text: fullText,
                thinking: fullThinking,
                toolResults,
                now,
              }
            );
          };

          // Record usage_stats + per-message token counts (no-op when the API
          // reported no usage).
          const recordUsage = async () => {
            if (!usageData) return;
            const today = new Date().toISOString().split("T")[0];
            await execute(
              `INSERT INTO usage_stats (id, api_config_id, model, input_tokens, output_tokens, request_count, conversation_count, date, created_at)
               VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
              [uuidv4(), apiConfigId, useModel, usageData.total_input_tokens, usageData.total_output_tokens, conversationCountDelta, today, now]
            );
            // Persist the full per-turn breakdown so the UI can restore the exact
            // In/Out/Think numbers after reloads. Everything is attributed to the
            // assistant message (mirrors the done-event usage and the API's
            // totalTokenCount = input + output + thoughts); the user message only
            // keeps input_tokens as reference metadata (populateUsageFromMessages
            // does not surface user rows, which would double-count the header total).
            if ((usageData.total_tokens || 0) > 0) {
              await execute("UPDATE messages SET input_tokens = ? WHERE id = ?", [
                usageData.total_input_tokens, userMsgId,
              ]);
              await execute(
                "UPDATE messages SET token_count = ?, input_tokens = ?, output_tokens = ?, thought_tokens = ? WHERE id = ?",
                [
                  (usageData.total_output_tokens || 0) + (usageData.total_thought_tokens || 0),
                  usageData.total_input_tokens,
                  usageData.total_output_tokens,
                  usageData.total_thought_tokens,
                  assistantMsgId,
                ]
              );
            }
          };

          try {
            console.log("[chat/stream] Calling sendChatRequestStream, model:", useModel, "protocol:", settingsRow.api_protocol, "proxyUrl:", proxyUrl || "(none)");
            console.log("[chat/stream] API messages count:", apiMessages.length);
            await sendChatRequestStream(
              settingsRow.base_url as string,
              settingsRow.api_key as string,
              settingsRow.api_protocol as any,
              useModel as string,
              apiMessages,
              useTemp as number,
              (delta: StreamDelta) => {
                console.log("[chat/stream] Delta received:", delta.type, delta.text ? `(text: "${delta.text.slice(0, 50)}")` : "");
                let sseEvent = "";
                switch (delta.type) {
                  case "text": {
                    let chunk = delta.text || "";
                    // Stop sequence detection: as soon as the generated content contains any
                    // configured stop sequence, truncate before it, notify the client, and
                    // stop the upstream generation (return false).
                    if (stopSequences.length > 0) {
                      const probe = fullText + chunk;
                      const hit = stopSequences.find((s) => probe.includes(s));
                      if (hit) {
                        const idx = probe.indexOf(hit);
                        chunk = probe.slice(fullText.length, idx);
                        fullText = probe.slice(0, idx);
                        stopSequenceHit = hit;
                        console.log("[chat/stream] Stop sequence hit:", JSON.stringify(hit), "- stopping generation, kept", fullText.length, "chars");
                        if (chunk) {
                          controller.enqueue(encoder.encode(`event: delta\ndata: ${JSON.stringify({ type: "text", text: chunk })}\n\n`));
                        }
                        controller.enqueue(encoder.encode(`event: delta\ndata: ${JSON.stringify({ type: "stop_sequence", sequence: hit })}\n\n`));
                        return false;
                      }
                    }
                    fullText += chunk;
                    sseEvent = `event: delta\ndata: ${JSON.stringify({ type: "text", text: chunk })}\n\n`;
                    break;
                  }
                  case "thinking":
                    fullThinking += delta.text || "";
                    sseEvent = `event: delta\ndata: ${JSON.stringify({ type: "thinking", text: delta.text })}\n\n`;
                    break;
                  case "tool_result":
                    if (delta.toolResult) toolResults.push(delta.toolResult);
                    sseEvent = `event: delta\ndata: ${JSON.stringify({ type: "tool_result", tool_result: delta.toolResult })}\n\n`;
                    break;
                  case "usage":
                    usageData = delta.usage;
                    return; // Don't send usage SSE yet
                  case "done":
                    return; // Handle done below
                }
                if (sseEvent) {
                  controller.enqueue(encoder.encode(sseEvent));
                }
              },
              commonOptions,
              proxyUrl
            );

            console.log("[chat/stream] Stream completed. fullText length:", fullText.length, "fullThinking length:", fullThinking.length);
            if (fullText.length === 0 && fullThinking.length === 0) {
              console.warn("[chat/stream] WARNING: Stream completed but no text or thinking was generated!");
            }
            // Store assistant message in DB
            await storeAssistantMessage();

            // Record usage
            await recordUsage();

            // Send done event with full data
            const doneEvent = `event: done\ndata: ${JSON.stringify({
              type: "done",
              user_message: { id: userMsgId, content: message },
              assistant_message: { id: assistantMsgId, content: fullText },
              thinking: fullThinking || null,
              tool_results: toolResults.length > 0 ? toolResults : null,
              usage: usageData,
              context_trimmed: contextTrimmed || false,
              rag_memories_injected: ragInjectedCount,
              stop_sequence_hit: stopSequenceHit,
            })}\n\n`;
            controller.enqueue(encoder.encode(doneEvent));
            controller.close();
          } catch (err: any) {
            console.error("[chat/stream] Stream error:", err.message);
            console.error("[chat/stream] Stack:", err.stack);
            console.error("[chat/stream] fullText so far:", fullText.length, "chars");
            // Persist whatever was generated before the failure/abort so the
            // partial reply (and its billed tokens) survives the reload.
            if (hasPersistableContent(fullText, fullThinking)) {
              try {
                await storeAssistantMessage();
                await recordUsage();
                console.log("[chat/stream] Partial content persisted after stream error");
              } catch (storeErr: any) {
                console.error("[chat/stream] Failed to persist partial content:", storeErr.message);
              }
            }
            // Fix: send {type: "error", error: "..."} to match client's data.type === "error" check
            const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: err.message })}\n\n`;
            controller.enqueue(encoder.encode(errorEvent));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ===== Non-streaming path =====
    const result = await sendChatRequest(
      settingsRow.base_url as string,
      settingsRow.api_key as string,
      settingsRow.api_protocol as any,
      useModel as string,
      apiMessages,
      useTemp as number,
      commonOptions,
      proxyUrl
    );

    // Stop sequence check for non-streaming responses: truncate at the first occurrence
    let stopSequenceHit: string | null = null;
    if (stopSequences.length > 0 && result.text) {
      const hit = stopSequences.find((s) => result.text.includes(s));
      if (hit) {
        result.text = result.text.slice(0, result.text.indexOf(hit));
        stopSequenceHit = hit;
        console.log("[chat/api] Non-stream response contained stop sequence:", JSON.stringify(hit), "- truncated");
      }
    }

    // Store assistant message (idempotent + regenerate position collision
    // handling live in persistAssistantMessage, shared with the streaming path).
    const assistantMsgId = uuidv4();
    const assistantPosition = userPosition + 1;
    await persistAssistantMessage(
      { queryOne, execute },
      {
        conversationId: conversation_id,
        messageId: assistantMsgId,
        position: assistantPosition,
        regeneratePosition: regeneratePosition,
        text: result.text,
        thinking: result.thinking || "",
        toolResults: result.toolResults,
        now,
      }
    );

    // Record usage stats if available
    if (result.usage) {
      const usageId = uuidv4();
      const today = new Date().toISOString().split("T")[0];
      await execute(
        `INSERT INTO usage_stats (id, api_config_id, model, input_tokens, output_tokens, request_count, conversation_count, date, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          usageId,
          apiConfigId, // linked to the saved API config with the same base_url ("" if none)
          useModel,
          result.usage.total_input_tokens,
          result.usage.total_output_tokens,
          conversationCountDelta,
          today,
          now,
        ]
      );
      // Persist the full per-turn breakdown (see streaming path for attribution notes)
      if ((result.usage.total_tokens || 0) > 0) {
        await execute("UPDATE messages SET input_tokens = ? WHERE id = ?", [
          result.usage.total_input_tokens, userMsgId,
        ]);
        await execute(
          "UPDATE messages SET token_count = ?, input_tokens = ?, output_tokens = ?, thought_tokens = ? WHERE id = ?",
          [
            (result.usage.total_output_tokens || 0) + (result.usage.total_thought_tokens || 0),
            result.usage.total_input_tokens,
            result.usage.total_output_tokens,
            result.usage.total_thought_tokens,
            assistantMsgId,
          ]
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user_message: { id: userMsgId, content: message },
        assistant_message: { id: assistantMsgId, content: result.text },
        thinking: result.thinking || null,
        tool_results: result.toolResults.length > 0 ? result.toolResults : null,
        usage: result.usage || null,
        context_trimmed: contextTrimmed || false,
        rag_memories_injected: ragInjectedCount,
        stop_sequence_hit: stopSequenceHit,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
