import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, queryAll, execute } from "@/lib/db";
import { sendChatRequest, sendChatRequestStream, type StreamDelta } from "@/lib/api-client";
import { buildApiMessages, buildApiMessagesWithSlidingWindow } from "@/lib/context-manager";
import { getModelContextWindow, isGoogleModel, GOOGLE_DEFAULT_CONTEXT_WINDOW } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
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
    } = body;

    if (!conversation_id || !message) {
      return NextResponse.json(
        { success: false, error: "conversation_id and message are required" },
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

    const existingMsgs = await queryAll(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY position ASC",
      [conversation_id]
    );
    console.log("[chat/api] Existing messages in DB:", existingMsgs.length);

    const allMessages: ChatMessage[] = [];
    for (const msg of existingMsgs) {
      const blocks = await queryAll(
        "SELECT * FROM blocks WHERE message_id = ? AND is_deleted = 0 ORDER BY position ASC",
        [msg.id]
      );

      const textContent = blocks
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.content)
        .join("\n");

      if (textContent) {
        allMessages.push({ role: msg.role as any, content: textContent });
      }
    }
    console.log("[chat/api] Reconstructed messages from DB:", allMessages.length, allMessages.map(m => ({ role: m.role, contentLen: m.content.length })));

    allMessages.push({ role: "user", content: message });
    console.log("[chat/api] allMessages after adding current:", allMessages.length);

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

    // Use sliding window to fit within context limit
    const sysInstructions = system_instructions || settingsRow.system_instructions || undefined;
    const { messages: apiMessages, trimmed: contextTrimmed, originalCount: originalMsgCount } = buildApiMessagesWithSlidingWindow(
      allMessages,
      sysInstructions,
      modelContextWindow
    );

    if (contextTrimmed) {
      console.log(`[chat/api] Context trimmed: ${originalMsgCount} -> ${apiMessages.filter(m => m.role !== "system").length} messages (limit: ${modelContextWindow} tokens)`);
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

    const commonOptions = {
      top_p: settingsRow.top_p ?? 0.95,
      top_k: settingsRow.top_k ?? 64,
      max_output_tokens: settingsRow.max_output_tokens ?? 65536,
      safety_settings: safetySettings,
      tools_config: toolsConfig,
      thinking_level: thinking_level || settingsRow.thinking_level,
    };

    // Pre-store user message (or reuse existing for rerun)
    let userMsgId: string;
    let userPosition: number;

    if (skip_user_message_creation) {
      // For rerun: find the last user message and reuse it
      const lastUserMsg = existingMsgs.filter((m: any) => m.role === "user").pop();
      if (lastUserMsg) {
        userMsgId = lastUserMsg.id;
        userPosition = lastUserMsg.position;
      } else {
        // User message was deleted by rerun endpoint; create a new one from the provided message content
        console.log("[chat/api] No user message found for rerun, creating new one from message content");
        userMsgId = uuidv4();
        userPosition = existingMsgs.length + 1;
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
    } else {
      userMsgId = uuidv4();
      userPosition = existingMsgs.length + 1;
      console.log("[chat/api] Creating user message:", userMsgId, "position:", userPosition);
      await execute(
        `INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES (?, ?, 'user', ?, ?)`,
        [userMsgId, conversation_id, userPosition, now]
      );
      const userBlockId = uuidv4();
      await execute(
        `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'text', ?, 0, ?)`,
        [userBlockId, userMsgId, message, now]
      );
      console.log("[chat/api] User message text block created:", userBlockId);
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
        }
      }
    }

    // Update conversation title or timestamp
    if (existingMsgs.length === 0) {
      const title = message.slice(0, 50);
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

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
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
                  case "text":
                    fullText += delta.text || "";
                    sseEvent = `event: delta\ndata: ${JSON.stringify({ type: "text", text: delta.text })}\n\n`;
                    break;
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
            const assistantMsgId = uuidv4();
            const assistantPosition = userPosition + 1;
            await execute(
              `INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES (?, ?, 'assistant', ?, ?)`,
              [assistantMsgId, conversation_id, assistantPosition, now]
            );

            let blockPosition = 0;
            if (fullThinking) {
              await execute(
                `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'thinking', ?, ?, ?)`,
                [uuidv4(), assistantMsgId, fullThinking, blockPosition++, now]
              );
            }
            await execute(
              `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'text', ?, ?, ?)`,
              [uuidv4(), assistantMsgId, fullText, blockPosition++, now]
            );
            for (const tr of toolResults) {
              await execute(
                `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'tool_result', ?, ?, ?)`,
                [uuidv4(), assistantMsgId, JSON.stringify(tr), blockPosition++, now]
              );
            }

            // Record usage
            if (usageData) {
              const today = new Date().toISOString().split("T")[0];
              await execute(
                `INSERT INTO usage_stats (id, api_config_id, model, input_tokens, output_tokens, request_count, conversation_count, date, created_at)
                 VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)`,
                [uuidv4(), "", useModel, usageData.total_input_tokens, usageData.total_output_tokens, today, now]
              );
            }

            // Send done event with full data
            const doneEvent = `event: done\ndata: ${JSON.stringify({
              type: "done",
              user_message: { id: userMsgId, content: message },
              assistant_message: { id: assistantMsgId, content: fullText },
              thinking: fullThinking || null,
              tool_results: toolResults.length > 0 ? toolResults : null,
              usage: usageData,
              context_trimmed: contextTrimmed || false,
            })}\n\n`;
            controller.enqueue(encoder.encode(doneEvent));
            controller.close();
          } catch (err: any) {
            console.error("[chat/stream] Stream error:", err.message);
            console.error("[chat/stream] Stack:", err.stack);
            console.error("[chat/stream] fullText so far:", fullText.length, "chars");
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

    // Store assistant message
    const assistantMsgId = uuidv4();
    const assistantPosition = userPosition + 1;
    await execute(
      `INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES (?, ?, 'assistant', ?, ?)`,
      [assistantMsgId, conversation_id, assistantPosition, now]
    );

    let blockPosition = 0;
    if (result.thinking) {
      await execute(
        `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'thinking', ?, ?, ?)`,
        [uuidv4(), assistantMsgId, result.thinking, blockPosition++, now]
      );
    }
    await execute(
      `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'text', ?, ?, ?)`,
      [uuidv4(), assistantMsgId, result.text, blockPosition++, now]
    );
    for (const tr of result.toolResults) {
      await execute(
        `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'tool_result', ?, ?, ?)`,
        [uuidv4(), assistantMsgId, JSON.stringify(tr), blockPosition++, now]
      );
    }

    // Record usage stats if available
    if (result.usage) {
      const usageId = uuidv4();
      const today = new Date().toISOString().split("T")[0];
      await execute(
        `INSERT INTO usage_stats (id, api_config_id, model, input_tokens, output_tokens, request_count, conversation_count, date, created_at)
         VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)`,
        [
          usageId,
          "", // api_config_id - could be linked later
          useModel,
          result.usage.total_input_tokens,
          result.usage.total_output_tokens,
          today,
          now,
        ]
      );
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
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
