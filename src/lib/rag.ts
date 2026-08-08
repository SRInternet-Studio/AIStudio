import { queryAll, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import path from "path";
import https from "https";
import { ProxyAgent, fetch as undiciFetch, setGlobalDispatcher, getGlobalDispatcher } from "undici";
import { estimateTokens } from "@/lib/context-manager";

/**
 * RAG (Retrieval-Augmented Generation) — long-term memory for conversations.
 *
 * Works TOGETHER with the sliding window (context-manager.ts), never replaces it:
 *  1. The sliding window still trims the API request to fit the model's context window.
 *  2. When trimming happens, the messages that fell out of the window are embedded and
 *     stored in the `message_embeddings` table (lazily, once per content version).
 *  3. The newest user message is embedded and used as a query; the most similar stored
 *     chunks are injected back into the request as a retrieved-memory block, so the
 *     model can still "remember" early history that no longer fits in the window.
 *
 * Embedding providers:
 *  - "api":   calls the embeddings endpoint of the user-configured API
 *             (OpenAI-compatible: POST /v1/embeddings, Gemini: :batchEmbedContents),
 *             reusing the existing Base URL / API key / proxy settings.
 *  - "local": on-device embeddings via @huggingface/transformers (ONNX Runtime),
 *             no API calls needed; the model is downloaded once on first use.
 */

// ============ Configuration ============

export interface RagConfig {
  enabled: boolean;
  provider: "api" | "local";
  /** Resolved embedding model id — never empty. */
  embeddingModel: string;
  topK: number;
}

export interface RagEndpoint {
  baseUrl: string;
  apiKey: string;
  protocol: "openai" | "gemini";
  proxyUrl?: string;
}

export const RAG_DEFAULT_MODELS = {
  api: {
    openai: "text-embedding-3-small",
    gemini: "text-embedding-004",
  },
  local: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
};

// Chunking / indexing tuning
const CHUNK_SIZE = 1000; // chars per chunk (~330 tokens at 3 chars/token)
const CHUNK_OVERLAP = 100; // overlap between consecutive chunks
const MAX_INDEX_CHUNKS_PER_PASS = 500; // bound per-request indexing latency
const MIN_SIMILARITY = 0.15; // cosine floor for a chunk to count as relevant
const EMBED_BATCH_SIZE = 50; // texts per embedding API call (Gemini allows 100)

/**
 * Resolve the effective RAG configuration from the raw settings row.
 */
export function resolveRagConfig(settingsRow: any): RagConfig {
  const provider: "api" | "local" = settingsRow?.rag_provider === "local" ? "local" : "api";
  const protocol: "openai" | "gemini" = settingsRow?.api_protocol === "gemini" ? "gemini" : "openai";
  const configured = typeof settingsRow?.rag_embedding_model === "string"
    ? settingsRow.rag_embedding_model.trim()
    : "";
  const embeddingModel =
    configured ||
    (provider === "local" ? RAG_DEFAULT_MODELS.local : RAG_DEFAULT_MODELS.api[protocol]);
  const topKRaw = parseInt(settingsRow?.rag_top_k, 10);
  const topK = Number.isFinite(topKRaw) && topKRaw >= 1 ? Math.min(20, topKRaw) : 5;
  // Default ON unless explicitly disabled
  const enabled = Number(settingsRow?.rag_enabled ?? 1) === 1;
  return { enabled, provider, embeddingModel, topK };
}

// ============ Embedding Providers ============

function fetchWithProxy(url: string, init: RequestInit & { dispatcher?: any }, proxyUrl?: string) {
  if (proxyUrl) {
    return undiciFetch(url, { ...init, dispatcher: new ProxyAgent(proxyUrl) } as any);
  }
  return fetch(url, init);
}

function normalizeOpenAIBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "").replace(/\/v1\/?$/, "");
}

async function embedViaApi(
  texts: string[],
  endpoint: RagEndpoint,
  model: string
): Promise<number[][]> {
  const results: number[][] = [];

  for (let start = 0; start < texts.length; start += EMBED_BATCH_SIZE) {
    const batch = texts.slice(start, start + EMBED_BATCH_SIZE);

    if (endpoint.protocol === "gemini") {
      // Gemini embeddings: POST /v1beta/models/{model}:batchEmbedContents
      const base = (endpoint.baseUrl || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
      const url = `${base}/v1beta/models/${model}:batchEmbedContents`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (endpoint.apiKey) headers["x-goog-api-key"] = endpoint.apiKey;
      const body = JSON.stringify({
        requests: batch.map((text) => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        })),
      });
      const res = await fetchWithProxy(url, { method: "POST", headers, body }, endpoint.proxyUrl);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`RAG embeddings API error (${res.status}): ${errText.slice(0, 300)}`);
      }
      const data: any = await res.json();
      const embeddings = data.embeddings || [];
      if (embeddings.length !== batch.length) {
        throw new Error(`RAG embeddings API returned ${embeddings.length} vectors for ${batch.length} texts`);
      }
      for (const e of embeddings) results.push(e.values);
    } else {
      // OpenAI-compatible: POST /v1/embeddings
      const url = `${normalizeOpenAIBaseUrl(endpoint.baseUrl)}/v1/embeddings`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (endpoint.apiKey) headers["Authorization"] = `Bearer ${endpoint.apiKey}`;
      const body = JSON.stringify({ model, input: batch });
      const res = await fetchWithProxy(url, { method: "POST", headers, body }, endpoint.proxyUrl);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`RAG embeddings API error (${res.status}): ${errText.slice(0, 300)}`);
      }
      const data: any = await res.json();
      const items = (data.data || []).sort((a: any, b: any) => a.index - b.index);
      if (items.length !== batch.length) {
        throw new Error(`RAG embeddings API returned ${items.length} vectors for ${batch.length} texts`);
      }
      for (const item of items) results.push(item.embedding);
    }
  }

  return results;
}

// Lazy singleton for the local ONNX pipeline (model load is expensive).
let localPipeline: any = null;
let localPipelineModel: string | null = null;

/**
 * Route all network traffic through the proxy for the duration of the local
 * model download. transformers.js uses BOTH global fetch and Node's https
 * module depending on the code path, so both must be patched:
 *  - undici's global dispatcher covers global fetch (including references
 *    captured at module load time)
 *  - https.get/https.request are redirected to proxied undici fetch
 * Returns a restore function that MUST be called afterwards — it reinstates
 * the previous global dispatcher, otherwise every later fetch in this
 * process would keep going through the (possibly dead) proxy.
 */
async function enableDownloadProxy(proxyUrl: string): Promise<() => void> {
  const dispatcher = new ProxyAgent(proxyUrl);
  const originalFetch = globalThis.fetch;
  const originalDispatcher = getGlobalDispatcher();
  const originalHttpsGet = https.get;
  const originalHttpsRequest = https.request;

  setGlobalDispatcher(dispatcher);
  globalThis.fetch = ((input: any, init?: any) =>
    originalFetch(input, { ...init, dispatcher })) as any;

  const redirect = (original: any) =>
    function patched(this: any, opts: any, cb?: any) {
      try {
        const u =
          typeof opts === "string"
            ? new URL(opts)
            : opts instanceof URL
              ? opts
              : new URL(`${opts.protocol || "https:"}//${opts.host}${opts.path || ""}`);
        const init: any = {
          method: (opts && typeof opts === "object" && opts.method) || "GET",
          headers: (opts && typeof opts === "object" && opts.headers) || {},
          dispatcher,
        };
        if (typeof cb === "function") {
          undiciFetch(u, init)
            .then((res) => cb(res))
            .catch((err) => cb(err));
          return undefined as any;
        }
        return undiciFetch(u, init);
      } catch {
        return original.apply(this, arguments as any);
      }
    };
  (https as any).get = redirect(originalHttpsGet);
  (https as any).request = redirect(originalHttpsRequest);

  return () => {
    globalThis.fetch = originalFetch;
    setGlobalDispatcher(originalDispatcher);
    (https as any).get = originalHttpsGet;
    (https as any).request = originalHttpsRequest;
  };
}

async function embedLocal(texts: string[], model: string, proxyUrl?: string): Promise<number[][]> {
  // Dynamic import: keeps the heavy dependency out of client bundles and lets
  // Next.js load it from node_modules (marked external in next.config.js).
  const transformers = await import("@huggingface/transformers");
  const { pipeline, env } = transformers as any;

  // Predictable model cache inside the app's data directory.
  env.cacheDir = path.join(process.cwd(), "data", "rag-models");
  env.allowLocalModels = false;

  // The first use downloads the ONNX model from HuggingFace — route it through
  // the user-configured proxy (same one used for API calls).
  const restoreProxy = proxyUrl ? await enableDownloadProxy(proxyUrl) : null;
  try {
    if (!localPipeline || localPipelineModel !== model) {
      console.log(`[rag] Loading local embedding model: ${model} (first use downloads it once)`);
      localPipeline = await pipeline("feature-extraction", model);
      localPipelineModel = model;
    }

    const results: number[][] = [];
    for (const text of texts) {
      const output = await localPipeline(text, { pooling: "mean", normalize: true });
      results.push(Array.from(output.data as Float32Array));
    }
    return results;
  } finally {
    if (restoreProxy) restoreProxy();
  }
}

/**
 * Embed a list of texts with the configured provider. Throws on failure —
 * callers must degrade gracefully (RAG is optional, chat must keep working).
 */
export async function embedTexts(
  texts: string[],
  config: RagConfig,
  endpoint?: RagEndpoint
): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (config.provider === "local") {
    return embedLocal(texts, config.embeddingModel, endpoint?.proxyUrl);
  }
  if (!endpoint?.baseUrl) {
    throw new Error("RAG 'api' provider requires a configured Base URL");
  }
  return embedViaApi(texts, endpoint, config.embeddingModel);
}

// ============ Chunking & Hashing ============

export function chunkText(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length <= CHUNK_SIZE) return [t];
  const chunks: string[] = [];
  let start = 0;
  while (start < t.length) {
    chunks.push(t.slice(start, start + CHUNK_SIZE));
    if (start + CHUNK_SIZE >= t.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// ============ Vector Math ============

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ============ Indexing ============

export interface IndexableMessage {
  id: string;
  role: string;
  position: number;
  content: string;
}

/**
 * Ensure the given messages are embedded in the vector store for this
 * conversation. Lazy & idempotent: messages whose content hash is already
 * indexed are skipped; edited messages are re-indexed. Returns the number of
 * newly indexed messages.
 */
export async function ensureIndexed(
  conversationId: string,
  messages: IndexableMessage[],
  config: RagConfig,
  endpoint?: RagEndpoint
): Promise<number> {
  if (messages.length === 0) return 0;

  const placeholders = messages.map(() => "?").join(",");
  const existing = await queryAll(
    `SELECT message_id, content_hash FROM message_embeddings
     WHERE conversation_id = ? AND model = ? AND message_id IN (${placeholders})`,
    [conversationId, config.embeddingModel, ...messages.map((m) => m.id)]
  );
  const indexedHashes = new Map<string, Set<string>>();
  for (const row of existing) {
    const id = row.message_id as string;
    if (!indexedHashes.has(id)) indexedHashes.set(id, new Set());
    indexedHashes.get(id)!.add(row.content_hash as string);
  }

  // Pick messages that need (re)indexing, capped per pass to bound latency.
  const toIndex: { msg: IndexableMessage; chunks: string[]; hash: string }[] = [];
  let chunkCount = 0;
  for (const msg of messages) {
    const hash = sha256(msg.content);
    if (indexedHashes.get(msg.id)?.has(hash)) continue;
    const chunks = chunkText(msg.content);
    if (chunks.length === 0) continue;
    if (chunkCount + chunks.length > MAX_INDEX_CHUNKS_PER_PASS && toIndex.length > 0) break;
    toIndex.push({ msg, chunks, hash });
    chunkCount += chunks.length;
  }
  if (toIndex.length === 0) return 0;

  // Embed: query vector first is NOT included here — indexing only.
  const allChunks: string[] = [];
  for (const entry of toIndex) allChunks.push(...entry.chunks);
  const vectors = await embedTexts(allChunks, config, endpoint);

  const now = new Date().toISOString();
  let vecCursor = 0;
  for (const { msg, chunks, hash } of toIndex) {
    // Drop stale rows for this message+model (content edited or re-indexed).
    await execute(
      "DELETE FROM message_embeddings WHERE message_id = ? AND model = ?",
      [msg.id, config.embeddingModel]
    );
    for (let ci = 0; ci < chunks.length; ci++) {
      const vec = vectors[vecCursor++];
      await execute(
        `INSERT INTO message_embeddings
         (id, message_id, conversation_id, model, chunk_index, content_hash, content, role, position, vector, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), msg.id, conversationId, config.embeddingModel, ci, hash, chunks[ci], msg.role, msg.position, JSON.stringify(vec), now]
      );
    }
  }

  console.log(`[rag] Indexed ${toIndex.length} message(s) / ${chunkCount} chunk(s) for conversation ${conversationId} (model: ${config.embeddingModel})`);
  return toIndex.length;
}

// ============ Retrieval ============

export interface RetrievedMemories {
  /** Formatted block ready to be injected into the request; empty when nothing relevant. */
  text: string;
  /** Number of memory chunks included. */
  count: number;
  /** Number of chunks newly indexed during this pass (for logging/UI). */
  indexed: number;
}

/**
 * Index the excluded (out-of-window) messages, then retrieve the most relevant
 * stored chunks for the current query, formatted within the given token budget.
 * `excludeMessageIds` are messages already present in the API request.
 */
export async function retrieveMemories(
  conversationId: string,
  query: string,
  excludedMessages: IndexableMessage[],
  excludeMessageIds: Set<string>,
  config: RagConfig,
  tokenBudget: number,
  endpoint?: RagEndpoint
): Promise<RetrievedMemories> {
  // 1. Lazily index what the sliding window dropped.
  let indexed = 0;
  if (excludedMessages.length > 0) {
    indexed = await ensureIndexed(conversationId, excludedMessages, config, endpoint);
  }

  // 2. Embed the query.
  const [queryVector] = await embedTexts([query], config, endpoint);
  if (!queryVector) return { text: "", count: 0, indexed };

  // 3. Load this conversation's vectors for the current embedding model.
  const rows = await queryAll(
    "SELECT * FROM message_embeddings WHERE conversation_id = ? AND model = ?",
    [conversationId, config.embeddingModel]
  );
  if (rows.length === 0) return { text: "", count: 0, indexed };

  // 4. Score, filter, keep the best chunk per message for diversity.
  const scored = rows
    .filter((r: any) => !excludeMessageIds.has(r.message_id))
    .map((r: any) => ({ row: r, score: cosineSimilarity(queryVector, JSON.parse(r.vector)) }))
    .filter((s) => s.score >= MIN_SIMILARITY)
    .sort((a, b) => b.score - a.score);

  const bestPerMessage = new Map<string, { row: any; score: number }>();
  for (const s of scored) {
    const mid = s.row.message_id as string;
    if (!bestPerMessage.has(mid)) bestPerMessage.set(mid, s);
    if (bestPerMessage.size >= config.topK * 3) break;
  }

  // 5. Fill the token budget.
  const header =
    "[Retrieved conversation memory / 检索到的历史对话记忆]\n" +
    "Earlier turns trimmed out of the context window, stored in the database and retrieved by " +
    "semantic similarity to the current question — use as reference when relevant.\n" +
    "以下是被滑动窗口移出窗口、由 RAG 按语义相似度检索到的较早对话，相关时请作为参考：\n";
  let budget = tokenBudget - estimateTokens(header);
  const picked: { row: any; score: number }[] = [];
  for (const s of Array.from(bestPerMessage.values()).sort((a, b) => b.score - a.score)) {
    const line = `[${picked.length + 1}] ${s.row.role} (position ${s.row.position}): ${s.row.content}`;
    const cost = estimateTokens(line);
    if (picked.length >= config.topK) break;
    if (cost > budget) continue;
    budget -= cost;
    picked.push(s);
  }
  if (picked.length === 0) return { text: "", count: 0, indexed };

  // 6. Chronological order reads more naturally than similarity order.
  picked.sort((a, b) => Number(a.row.position) - Number(b.row.position));
  const lines = picked.map(
    (s, i) => `[${i + 1}] ${s.row.role} (position ${s.row.position}): ${s.row.content}`
  );

  console.log(
    `[rag] Retrieved ${picked.length} memory chunk(s) for conversation ${conversationId} ` +
    `(scores: ${picked.map((s) => s.score.toFixed(3)).join(", ")})`
  );

  return { text: header + lines.join("\n\n"), count: picked.length, indexed };
}

/**
 * Degradation wrapper around retrieveMemories. RAG is an optional enhancement:
 * ANY failure (network down, embedding endpoint unsupported or erroring,
 * missing Base URL, local model load failure) must fall back to plain
 * sliding-window behavior instead of breaking the chat request. This wrapper
 * never throws — on failure it logs a warning and returns empty memories.
 */
export async function retrieveMemoriesSafe(
  conversationId: string,
  query: string,
  excludedMessages: IndexableMessage[],
  excludeMessageIds: Set<string>,
  config: RagConfig,
  tokenBudget: number,
  endpoint?: RagEndpoint
): Promise<RetrievedMemories> {
  try {
    return await retrieveMemories(
      conversationId,
      query,
      excludedMessages,
      excludeMessageIds,
      config,
      tokenBudget,
      endpoint
    );
  } catch (err: any) {
    console.warn("[rag] RAG unavailable, continuing without it:", err?.message || err);
    return { text: "", count: 0, indexed: 0 };
  }
}

// ============ Cleanup Hooks ============

/** Remove vectors when messages are deleted/edited (re-indexed lazily if needed). */
export async function deleteEmbeddingsForMessages(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  const placeholders = messageIds.map(() => "?").join(",");
  await execute(`DELETE FROM message_embeddings WHERE message_id IN (${placeholders})`, messageIds);
}

export async function deleteEmbeddingsForConversation(conversationId: string): Promise<void> {
  await execute("DELETE FROM message_embeddings WHERE conversation_id = ?", [conversationId]);
}

export async function deleteAllEmbeddings(): Promise<void> {
  await execute("DELETE FROM message_embeddings");
}
