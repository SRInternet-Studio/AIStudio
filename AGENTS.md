# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack
- Next.js 16.3.1 (App Router), React 18, TypeScript, Tailwind, Radix UI, Zustand.
- SQLite via `better-sqlite3` + `@libsql/client` + drizzle-orm.
- Node built-in test runner (`node:test`) with `tests/register.mjs` for TS + `@/` alias.

## Commands
- `npm test` runs `node --import ./tests/register.mjs --test "tests/*.test.ts"`.
  - Single test: `node --import ./tests/register.mjs --test tests/<file>.test.ts`.
  - `tests/register.mjs` maps `@/` -> `src/`; running `node --test` without `--import` fails on TS path aliases.
- `npm run lint` = `eslint .` (Next 16 removed `next lint`); ESLint 9 flat config.
- `npm run build` = `next build`.

## Critical runtime constraints
- **Auth**: `src/middleware.ts` only redirects unauthenticated page requests. Every DB-backed API route **must** call `requireUnlock(request)` at the top; middleware alone does not verify the unlock cookie.
- **DB migrations**: `src/lib/db.ts` runs forward-only schema migrations via `COLUMN_MIGRATIONS` + `PRAGMA table_info`. Failures throw and surface as 500. No external migration tool.
- **Message ordering**: new message positions MUST come from `MAX(position)` (`nextMessagePosition` in `src/lib/chat-persistence.ts`). Using row count after deletes reuses positions and corrupts order.
- **Large media**: client + server cap base64 attachment payload at 70 MB chars. `next.config.js` sets `experimental.proxyClientMaxBodySize: "100mb"` so requests reach `/api/chat`; the route itself enforces the 70 MB guard.
- **serverExternalPackages** (native/binary deps excluded from bundle): `msedge-tts`, `@huggingface/transformers`, `onnxruntime-node`, `sharp`, `ws`, `bufferutil`, `utf-8-validate`. Omitting them causes runtime failures (e.g. `bufferUtil.mask is not a function`).

## Project-specific conventions
- **Path alias**: `@/*` -> `./src/*` (tsconfig). Tests rely on `tests/register.mjs` to resolve this under Node.
- **Token estimation**: `estimateTokens()` in `src/lib/context-manager.ts` is CJK-aware and **excludes media blocks** from text estimation. Do not replace it with naive `length / 4`.
- **Model context resolution**: `resolveModelContextWindow()` priority = user override -> `FALLBACK_MODELS` -> Google default 800K -> 128K fallback (`src/lib/models.ts`).
- **Secrets**: API keys are encrypted with AES-256-GCM (`src/lib/secrets.ts`), envelope `AESGCM:<iv>:<tag>:<data>`. `encryptSecret`/`decryptSecret` are idempotent; legacy plaintext passes through unchanged.
- **Stream-error recovery**: `/api/chat` persists partial assistant output via idempotent `persistAssistantMessage`. Empty output is intentionally not saved.
- **RAG + sliding window**: `src/lib/rag.ts` complements `src/lib/context-manager.ts`. Trimmed history is embedded and injected back as retrieved memory; RAG never replaces the sliding window.
