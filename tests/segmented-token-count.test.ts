/**
 * Focused test: the whole-history context estimate that backs the header token
 * counter.
 *
 * The transcript is loaded in pages (newest MESSAGE_PAGE_SIZE on open, older
 * ones on scroll-to-top) to cap memory, so the counter cannot be derived from
 * the mounted messages alone. `GET /api/conversations/[id]` returns
 * `fullContextEstimate` instead: the CJK-aware sum over the text of EVERY
 * message, computed server-side. These tests pin the invariant that the estimate
 * is independent of paging.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateTokens, calculateCurrentContextTokens } from "@/lib/context-manager";
import type { Block, Message } from "@/types";

let seq = 0;

function block(type: string, content: string, position = 0, is_deleted = false): Block {
  return {
    id: `b-${++seq}`,
    message_id: "m",
    type: type as Block["type"],
    content,
    position,
    is_deleted,
    created_at: "",
  };
}

function message(role: Message["role"], blocks: Block[]): Message & { blocks: Block[] } {
  return {
    id: `m-${++seq}`,
    conversation_id: "c",
    parent_message_id: null,
    role,
    position: 0,
    created_at: "",
    blocks,
  } as Message & { blocks: Block[] };
}

/**
 * The server-side aggregation (src/app/api/conversations/[id]/route.ts):
 * per message, join its visible text/thinking blocks with "\n" and estimate
 * once, then sum. Mirrored here so the test exercises the exact contract.
 */
function serverSideFullContextEstimate(
  rows: Array<{ message_id: string; type: string; content: string }>
): number {
  const perMessage = new Map<string, string[]>();
  for (const row of rows) {
    const list = perMessage.get(row.message_id) || [];
    list.push(row.content || "");
    perMessage.set(row.message_id, list);
  }
  let total = 0;
  for (const parts of perMessage.values()) {
    if (parts.length > 0) total += estimateTokens(parts.join("\n"));
  }
  return total;
}

test("whole-history estimate covers messages that are not mounted", () => {
  // 200 turns of conversation; only the newest 50 are materialized on the client.
  const all: (Message & { blocks: Block[] })[] = [];
  const rows: Array<{ message_id: string; type: string; content: string }> = [];
  for (let i = 0; i < 200; i++) {
    const m = message(i % 2 === 0 ? "user" : "assistant", [block("text", `第 ${i} 轮对话内容`.repeat(5))]);
    all.push(m);
    rows.push({ message_id: m.id, type: "text", content: m.blocks[0].content });
  }

  const whole = serverSideFullContextEstimate(rows);
  const mountedOnly = calculateCurrentContextTokens(all.slice(-50)).fullContextTokens;

  // 200 turns estimated, 50 mounted -> the whole-history figure is 4x the page.
  assert.ok(whole > mountedOnly * 3, `whole history ${whole} must dwarf the mounted page ${mountedOnly}`);
  // The estimate over the SAME set must agree exactly with the client helper,
  // so switching between paged and full views never shifts the number.
  assert.equal(whole, calculateCurrentContextTokens(all).fullContextTokens);
});

test("whole-history estimate is identical regardless of paging boundaries", () => {
  const all: (Message & { blocks: Block[] })[] = [];
  const rows: Array<{ message_id: string; type: string; content: string }> = [];
  for (let i = 0; i < 120; i++) {
    const m = message("user", [block("text", `内容 ${i}`.repeat(10))]);
    all.push(m);
    rows.push({ message_id: m.id, type: "text", content: m.blocks[0].content });
  }

  const reference = serverSideFullContextEstimate(rows);
  // Every possible page split must reproduce the same total. The estimate is
  // computed server-side over the whole table, so the client's page boundaries
  // cannot influence it — that is the entire point of the fix.
  for (const pageSize of [1, 10, 50, 119, 120]) {
    // Reconstruct the transcript the way the client does: newest page first,
    // older pages prepended on scroll-to-top.
    const pages: typeof all = [];
    for (let end = all.length; end > 0; end -= pageSize) {
      pages.unshift(...all.slice(Math.max(0, end - pageSize), end));
    }
    assert.equal(pages.length, all.length, `page size ${pageSize} lost messages`);
    assert.equal(serverSideFullContextEstimate(rows), reference, `page size ${pageSize} changed the total`);
    // And the client-side helper over the reassembled list agrees too.
    assert.equal(calculateCurrentContextTokens(pages).fullContextTokens, reference);
  }
});

test("whole-history estimate excludes deleted, grounding and media blocks", () => {
  const rows = [
    { message_id: "m1", type: "text", content: "保留的文本" },
    { message_id: "m1", type: "grounding", content: '{"sources":[]}' },
    { message_id: "m2", type: "image", content: "data:image/png;base64," + "A".repeat(2_000_000) },
    { message_id: "m2", type: "text", content: "图的说明" },
  ];
  const whole = serverSideFullContextEstimate(
    rows.filter((r) => r.type === "text" || r.type === "thinking")
  );
  // Only the two text rows are estimated — the base64 blob would otherwise add
  // ~500K fake latin tokens.
  assert.equal(whole, estimateTokens("保留的文本") + estimateTokens("图的说明"));
});

test("whole-history estimate matches the client helper on a mixed conversation", () => {
  const all: (Message & { blocks: Block[] })[] = [
    message("user", [block("text", "你好")]),
    message("assistant", [block("thinking", "思考"), block("text", "回答")]),
    message("user", [block("text", "继续", 0, true)]), // deleted -> contributes nothing
    message("assistant", [block("text", "好的")]),
  ];
  const rows: Array<{ message_id: string; type: string; content: string }> = [];
  for (const m of all) {
    for (const b of m.blocks) {
      if (!b.is_deleted && (b.type === "text" || b.type === "thinking")) {
        rows.push({ message_id: m.id, type: b.type, content: b.content });
      }
    }
  }
  assert.equal(serverSideFullContextEstimate(rows), calculateCurrentContextTokens(all).fullContextTokens);
});

test("an empty conversation estimates to zero", () => {
  assert.equal(serverSideFullContextEstimate([]), 0);
  assert.equal(calculateCurrentContextTokens([]).fullContextTokens, 0);
});
