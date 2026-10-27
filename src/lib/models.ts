import type { ModelInfo } from "@/types";

/** Default context window for Google models (800K tokens) */
export const GOOGLE_DEFAULT_CONTEXT_WINDOW = 800_000;

/**
 * Check if a model ID belongs to a Google model (gemini-* or gemma-*).
 */
export function isGoogleModel(modelId: string): boolean {
  return modelId.startsWith("gemini-") || modelId.startsWith("gemma-");
}

/**
 * Get the context window for a model. If the model has an explicit value, use it.
 * For Google models without an explicit value, default to 800K.
 * Otherwise, fall back to 128K.
 */
export function getModelContextWindow(model: ModelInfo): number {
  if (model.contextWindow && model.contextWindow > 0) return model.contextWindow;
  if (isGoogleModel(model.id)) return GOOGLE_DEFAULT_CONTEXT_WINDOW;
  return 128_000;
}

/**
 * Resolve the context window (tokens) used when building a chat request for a
 * model id. Priority, highest first:
 *  1. `customContextWindow` — the user's persisted per-model override
 *     (custom_models.context_window);
 *  2. FALLBACK_MODELS — the curated local entry for this id (relays never
 *     report context_window, so this keeps e.g. Gemini at 800K instead of 128K);
 *  3. Google default (800K) for gemini-/gemma- ids;
 *  4. 128K last-resort default.
 */
export function resolveModelContextWindow(
  modelId: string,
  customContextWindow?: number | null
): number {
  const custom = Number(customContextWindow);
  if (Number.isFinite(custom) && custom > 0) return custom;
  const fallback = FALLBACK_MODELS.find((m) => m.id === modelId);
  if (fallback?.contextWindow && fallback.contextWindow > 0) return fallback.contextWindow;
  if (isGoogleModel(modelId)) return GOOGLE_DEFAULT_CONTEXT_WINDOW;
  return 128_000;
}

/**
 * Append-only sync of the endpoint's model list into the locally known list.
 * New models are ADDED, locally known models are never dropped, and on a
 * duplicate ID the endpoint's definition wins (it is fresher) — but only
 * field by field: when the endpoint omits a value (empty displayName /
 * description / category, missing or non-positive contextWindow) the locally
 * known record (e.g. FALLBACK_MODELS) supplies it, so merged entries never
 * show holes. Pure function (exported for unit tests).
 */
export function mergeModelLists(existing: ModelInfo[], incoming: ModelInfo[]): ModelInfo[] {
  const byId = new Map<string, ModelInfo>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) {
    const prev = byId.get(m.id);
    if (prev) {
      // Endpoint wins per field, falling back to the local record's value
      // whenever the endpoint left the field empty/missing.
      byId.set(m.id, {
        ...prev,
        ...m,
        displayName: m.displayName || prev.displayName,
        description: m.description || prev.description,
        category: m.category || prev.category,
        contextWindow: m.contextWindow && m.contextWindow > 0 ? m.contextWindow : prev.contextWindow,
      });
    } else {
      byId.set(m.id, m);
    }
  }
  return Array.from(byId.values());
}

/**
 * Replace the locally known model list with an endpoint-driven "whitelist".
 *
 * When the provider responds, its returned model list IS the valid set: any
 * locally known static model (Gemini / Claude / GPT fallbacks) that the
 * endpoint does NOT serve must not appear in the model selector.
 *
 * Custom models are merged into the endpoint list by /api/models from the
 * custom_models table, so they are present in `endpointModels` while they still
 * exist — and therefore preserved here automatically. A custom model that was
 * just DELETED is no longer in `endpointModels`, so it is correctly dropped
 * instead of being resurrected from a stale `knownModels` cache.
 *
 * Order of the result:
 *  1. endpointModels (the whitelist) — what the provider actually supports;
 *  2. locally known models that are also on the whitelist, deduped (used to
 *     backfill richer local metadata an endpoint may leave thin).
 *
 * When the endpoint yields nothing, the list degrades to all known local models
 * so a provider outage never strands the selector on an empty drop-down.
 */
export function applyEndpointWhitelist(knownModels: ModelInfo[], endpointModels: ModelInfo[]): ModelInfo[] {
  if (!Array.isArray(endpointModels) || endpointModels.length === 0) {
    return knownModels.length > 0 ? [...knownModels] : [...FALLBACK_MODELS];
  }
  const whitelist = new Set(endpointModels.map((m) => m.id));
  const knownById = new Map(knownModels.map((m) => [m.id, m]));
  const seen = new Set<string>();
  const result: ModelInfo[] = [];

  for (const m of endpointModels) {
    if (!seen.has(m.id)) {
      // Field-level merge: when the endpoint leaves a field thin/empty, backfill
      // it from the locally known record (same per-field fallback as
      // mergeModelLists) so e.g. OpenAI providers that omit displayName /
      // description / category still expose the richer static metadata.
      // Whitelist semantics are unchanged — only endpoint-served ids survive.
      const local = knownById.get(m.id);
      result.push(
        local
          ? {
              ...local,
              ...m,
              displayName: m.displayName || local.displayName,
              description: m.description || local.description,
              // Local grouping is authoritative: an endpoint's category is only a
              // coarse id-prefix guess ("Gemini"/"All"), so use it as a fallback
              // rather than letting it override the curated FALLBACK group
              // (Featured / Gemma / Images / Custom).
              category: local.category || m.category,
              contextWindow: m.contextWindow && m.contextWindow > 0 ? m.contextWindow : local.contextWindow,
            }
          : m
      );
      seen.add(m.id);
    }
  }
  // Known models on the whitelist enrich any thin endpoint entries; a static
  // model the endpoint does NOT support is never re-added here.
  for (const m of knownModels) {
    if (whitelist.has(m.id) && !seen.has(m.id)) {
      result.push(m);
      seen.add(m.id);
    }
  }
  // Custom models that still exist are already part of `endpointModels` (they
  // are merged in by /api/models from the custom_models table). Re-adding them
  // from `knownModels` here would resurrect a just-deleted custom model, so we
  // deliberately do NOT do that.
  return result;
}

/**
 * Normalize a provider Base URL into the OpenAI-compatible `GET /v1/models`
 * endpoint. Handles both a bare host (https://api.example.com ->
 * .../v1/models) and one that already targets v1 (https://api.example.com/v1
 * -> .../v1/models). Empty input stays empty (the caller should gate on it).
 */
export function normalizeOpenAIBaseUrl(baseUrl: string): string {
  const base = (baseUrl || "").replace(/\/+$/, "");
  if (!base) return "";
  return base.endsWith("/v1") ? `${base}/models` : `${base}/v1/models`;
}

/**
 * Parse the body of an OpenAI-compatible `GET /v1/models` response into the
 * internal ModelInfo[] shape. Accepts both the standard `{ data: [...] }`
 * envelope and a bare array (some relays return a bare list). Entries without
 * an `id` are dropped. `owned_by` is surfaced as the category; missing fields
 * fall back to defaults so downstream rendering never shows holes.
 *
 * Note: `object` / `created` are not part of ModelInfo so they are not
 * mapped into the returned records. Rich provider fields are honored when
 * present (display_name, description, opencode.limit.context) and fall back
 * to a sane default otherwise, so model listings never render as holes.
 */
export function parseOpenAIModelsResponse(json: unknown): ModelInfo[] {
  const data = Array.isArray(json) ? json : (json as any)?.data;
  if (!Array.isArray(data)) return [];
  const models: ModelInfo[] = [];
  for (const m of data) {
    if (!m || !m.id) continue;
    models.push({
      id: m.id,
      displayName: m.display_name || m.id,
      description: m.description || "",
      category: m.owned_by || "OpenAI",
      contextWindow: (m.opencode?.limit?.context as number) || 128_000,
    });
  }
  return models;
}

/**
 * Static fallback model list used when the dynamic API fetch fails.
 */
export const FALLBACK_MODELS: ModelInfo[] = [
  {
    id: "gemini-4-argon",
    displayName: "Gemini 4 Argon",
    description: "Our most capable model, built to solve the hardest problems with depth and precision across real-world software engineering and knowledge work.",
    isNew: true,
    isPaid: true,
    category: "Featured",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.8-flash",
    displayName: "Gemini 3.8 Flash",
    description: "Our most intelligent Flash model, engineered for long-horizon software engineering, autonomous agents, and complex enterprise workflows.",
    isNew: true,
    category: "Featured",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.7-flash",
    displayName: "Gemini 3.7 Flash",
    description: "Our latest and most capable Flash model, built for complex coding, agentic workflows, and reliable multi-step execution.",
    isNew: true,
    category: "Featured",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.6-flash",
    displayName: "Gemini 3.6 Flash",
    description: "Our previous-generation Flash model, balancing speed and multimodal capabilities across general agentic and everyday tasks.",
    isNew: true,
    category: "Featured",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.5-flash-lite",
    displayName: "Gemini 3.5 Flash Lite",
    description: "Our fastest, most cost-effective 3.5 model for high-throughput execution.",
    isNew: true,
    category: "Featured",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.5-flash",
    displayName: "Gemini 3.5 Flash",
    description: "Our most intelligent model for sustained frontier performance in agentic and coding tasks.",
    category: "Featured",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro Preview",
    description: "Our latest SOTA reasoning model with unprecedented depth and nuance, and powerful multimodal understanding and coding capabilities.",
    category: "Featured",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.5-live-translate-preview",
    displayName: "Gemini 3.5 Live Translate Preview",
    description: "A real-time speech-to-speech translation model delivering low latency translation for 70+ languages.",
    isNew: true,
    category: "Featured",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.1-flash-lite",
    displayName: "Gemini 3.1 Flash Lite",
    description: "Our most cost-efficient model, optimized for high-volume agentic tasks, translation, and simple data processing.",
    category: "Featured",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3-flash-preview",
    displayName: "Gemini 3 Flash Preview",
    description: "Our most intelligent model built for speed, combining frontier intelligence with superior search and grounding.",
    category: "Featured",
    contextWindow: 800_000,
  },
  {
    id: "nano-banana-2.1",
    displayName: "Nano Banana 2.1",
    description: "High-quality image generation and editing with enhanced factuality, visual fidelity, and multi-turn consistency at Flash scale.",
    isNew: true,
    isPaid: true,
    category: "Images",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.1-flash-lite-image",
    displayName: "Nano Banana 2 Lite",
    description: "Our smallest and most cost effective image generation and editing model, built for at scale usage.",
    isNew: true,
    category: "Images",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.1-flash-image",
    displayName: "Nano Banana 2",
    description: "Pro-level visual intelligence with Flash-speed efficiency and reality-grounded generation capabilities.",
    isPaid: true,
    category: "Images",
    contextWindow: 800_000,
  },
  {
    id: "gemini-omni-1.1-flash",
    displayName: "Gemini Omni 1.1 Flash",
    description: "Production-ready generative video with keyframe control and scene extension: bring text, image, and video references to life, extending scenes up to 30 seconds with outputs up to 4K.",
    isPaid: true,
    category: "Gemini",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.8-flash-tts",
    displayName: "Gemini 3.8 Flash TTS",
    description: "Flagship TTS model for Voice Design and dual-speaker screenplay control: prompt vocal personas, direct line-by-line delivery, and add vocal bursts.",
    isNew: true,
    category: "Gemini",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.8-flash-lite-tts",
    displayName: "Gemini 3.8 Flash Lite TTS",
    description: "High-speed and cost-efficient model for rapid dubbing, media localization, and high-throughput voice agents.",
    category: "Gemini",
    contextWindow: 800_000,
  },
  {
    id: "gemini-3.1-flash-tts-preview",
    displayName: "Gemini 3.1 Flash TTS Preview",
    description: "Powerful, low-latency speech generation with natural outputs, steerable prompts, and expressive audio tags for precise narration control.",
    category: "Gemini",
    contextWindow: 800_000,
  },
  {
    id: "gemini-2.5-pro-preview-tts",
    displayName: "Gemini 2.5 Pro Preview TTS",
    description: "Text-to-speech audio model optimized for powerful, low-latency speech generation with natural outputs and easy-to-steer prompts.",
    category: "Gemini",
    contextWindow: 800_000,
  },
  {
    id: "gemini-2.5-flash-preview-tts",
    displayName: "Gemini 2.5 Flash Preview TTS",
    description: "Text-to-speech audio model optimized for price-performant, low-latency, controllable speech generation.",
    category: "Gemini",
    contextWindow: 800_000,
  },
  {
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    description: "Fast and versatile model with thinking capabilities for a wide range of tasks.",
    category: "Gemini",
    contextWindow: 800_000,
  },
  {
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    description: "Our most capable thinking model with advanced reasoning and multimodal understanding.",
    isPaid: true,
    category: "Gemini",
    contextWindow: 800_000,
  },
  {
    id: "gemma-4-26b-a4b-it",
    displayName: "Gemma 4 26B A4B IT",
    description: "Open model with strong efficiency for on-device and edge deployment.",
    isNew: true,
    category: "Gemma",
    contextWindow: 800_000,
  },
  {
    id: "gemma-4-31b-it",
    displayName: "Gemma 4 31B IT",
    description: "Google DeepMind's flagship open-weight dense model, purpose-built for maximum quality in data center environments with a 256K context window and advanced long-context architecture.",
    isPaid: true,
    category: "Gemma",
    contextWindow: 256_000,
  },
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    description: "OpenAI's most advanced multimodal model.",
    category: "All",
    contextWindow: 128_000,
  },
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    description: "A smaller, faster, and more cost-effective version of GPT-4o.",
    category: "All",
    contextWindow: 128_000,
  },
  {
    id: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    description: "High-intelligence model with improved performance.",
    category: "All",
    contextWindow: 128_000,
  },
  {
    id: "gpt-3.5-turbo",
    displayName: "GPT-3.5 Turbo",
    description: "Fast and cost-effective model for simple tasks.",
    category: "All",
    contextWindow: 16_385,
  },
  {
    id: "claude-3.5-sonnet",
    displayName: "Claude 3.5 Sonnet",
    description: "Anthropic's most intelligent model for complex tasks.",
    category: "All",
    contextWindow: 200_000,
  },
  {
    id: "claude-3-opus",
    displayName: "Claude 3 Opus",
    description: "Anthropic's most powerful model for demanding tasks.",
    category: "All",
    contextWindow: 200_000,
  },
];

/**
 * Backward-compatible alias — other code may still import AVAILABLE_MODELS.
 * This now points to the fallback list; the dynamic list comes from the API.
 */
export const AVAILABLE_MODELS: ModelInfo[] = FALLBACK_MODELS;

export const MODEL_CATEGORIES = ["Starred", "All", "Featured", "Gemini", "Live", "Images", "Video", "Audio", "Music", "Agents", "Gemma", "Custom"];
