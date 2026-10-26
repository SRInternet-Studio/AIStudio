# Project Coding Rules (Non-Obvious Only)

- DB schema changes are forward-only via `COLUMN_MIGRATIONS` in `src/lib/db.ts`; do not add external migration tools or expect rollback support.
- New message positions MUST use `nextMessagePosition()` (`src/lib/chat-persistence.ts`) based on `MAX(position)`. Row-count-based position assignment corrupts ordering after deletes.
- `persistAssistantMessage()` is idempotent by `messageId`. The stream-error catch path and normal completion path both call it; a second call with the same ID is a no-op.
- `src/lib/chat-persistence.ts` exports a `DbAdapter` interface so focused tests can run without Next.js or `better-sqlite3`. Do not inline raw DB calls in that module.
- `next.config.js` `serverExternalPackages` must keep `msedge-tts`, `@huggingface/transformers`, `onnxruntime-node`, `sharp`, `ws`, `bufferutil`, `utf-8-validate` external or native addon runtime breaks.
- Use `cn()` from `src/lib/utils.ts` for className merging (clsx + tailwind-merge). Avoid raw `clsx` or `twMerge` calls in components.
- `@/*` path alias requires `tests/register.mjs` for `node --test`. Running `node --test tests/foo.test.ts` without `--import ./tests/register.mjs` fails to resolve `@/` imports.
- `estimateTokens()` in `src/lib/context-manager.ts` is CJK-aware and excludes media blocks. Do not replace with naive `length / 4` estimation.
