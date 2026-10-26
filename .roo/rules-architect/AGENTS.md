# Project Architecture Rules (Non-Obvious Only)

- AIStudio is a stateless proxy; cumulative token usage comes from each API response's `usageMetadata`, not from local counters. Per-message usage is stored only for UI/history reference.
- Context management is two-layered: `context-manager.ts` applies a sliding window to fit the model, while `rag.ts` embeds trimmed history and injects retrieved chunks back into the request. Neither layer replaces the other.
- Model list resolution is endpoint-whitelist driven: `/api/models` returns the valid set, and locally known models backfill missing metadata. Category grouping is intentionally preserved from local fallbacks rather than trusting the provider's coarse prefix guess.
- Provider abstraction supports OpenAI-compatible and Gemini protocols. Base URL normalization and embeddings endpoints differ by protocol and are implemented separately in `src/lib/api-client.ts` and `src/lib/rag.ts`.
- Native/binary dependencies (`msedge-tts`, `@huggingface/transformers`, `onnxruntime-node`, `sharp`) are kept external via `serverExternalPackages` because bundling breaks their native addon loading at runtime.
