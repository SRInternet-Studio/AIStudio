import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, queryAll, execute } from "@/lib/db";
import { sendChatRequest } from "@/lib/api-client";
import { buildApiMessages } from "@/lib/context-manager";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "@/types";

export async function POST(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const {
      conversation_id,
      message,
      model,
      temperature,
      system_instructions,
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

    const now = new Date().toISOString();

    const existingMsgs = await queryAll(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY position ASC",
      [conversation_id]
    );

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

    allMessages.push({ role: "user", content: message });

    const apiMessages = buildApiMessages(
      allMessages,
      system_instructions || settingsRow.system_instructions || undefined
    );

    const convRow = await queryOne("SELECT * FROM conversations WHERE id = ?", [conversation_id]);
    const useModel = model || convRow?.model || settingsRow.selected_model;
    const useTemp = temperature ?? settingsRow.temperature;

    const responseText = await sendChatRequest(
      settingsRow.base_url as string,
      settingsRow.api_key as string,
      settingsRow.api_protocol as any,
      useModel as string,
      apiMessages,
      useTemp as number,
      {
        top_p: settingsRow.top_p ?? 0.95,
        top_k: settingsRow.top_k ?? 64,
        max_output_tokens: settingsRow.max_output_tokens ?? 65536,
        safety_settings: JSON.parse(settingsRow.safety_settings as string || "[]"),
      }
    );

    const userMsgId = uuidv4();
    const userPosition = existingMsgs.length + 1;
    await execute(
      `INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES (?, ?, 'user', ?, ?)`,
      [userMsgId, conversation_id, userPosition, now]
    );

    const userBlockId = uuidv4();
    await execute(
      `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'text', ?, 0, ?)`,
      [userBlockId, userMsgId, message, now]
    );

    const assistantMsgId = uuidv4();
    const assistantPosition = userPosition + 1;
    await execute(
      `INSERT INTO messages (id, conversation_id, role, position, created_at) VALUES (?, ?, 'assistant', ?, ?)`,
      [assistantMsgId, conversation_id, assistantPosition, now]
    );

    const assistantBlockId = uuidv4();
    await execute(
      `INSERT INTO blocks (id, message_id, type, content, position, created_at) VALUES (?, ?, 'text', ?, 0, ?)`,
      [assistantBlockId, assistantMsgId, responseText, now]
    );

    if (existingMsgs.length === 0) {
      const title = message.slice(0, 50);
      await execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", [title, now, conversation_id]);
    } else {
      await execute("UPDATE conversations SET updated_at = ? WHERE id = ?", [now, conversation_id]);
    }

    return NextResponse.json({
      success: true,
      data: {
        user_message: { id: userMsgId, content: message },
        assistant_message: { id: assistantMsgId, content: responseText },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
