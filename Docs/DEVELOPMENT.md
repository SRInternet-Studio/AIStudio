# Development Guide

## Architecture Overview

```
┌────────────┐   Zustand    ┌────────────┐   fetch/SSE   ┌──────────────┐
│  React UI  │ ◄──────────► │  chatStore │ ◄────────────► │ Next.js API  │
│ (App Router│              │ (src/store)│                │ routes       │
│  pages)    │              └────────────┘                │ (src/app/api)│
└────────────┘                                            └──────┬───────┘
                                                                 │ libsql
                                                          ┌──────▼───────┐
                                                          │ SQLite (data/│
                                                          │ ai-studio.db)│
                                                          └──────────────┘
```

- **Frontend**: Next.js 14 App Router pages are thin wrappers around the
  shared `AppShell` component; view state lives in the Zustand `chatStore`.
- **Chat pipeline**: `POST /api/chat` proxies to the configured endpoint and
  streams SSE chunks (`data: {...}`) back; `src/lib/api-client.ts` adapts both
  Gemini and OpenAI protocols. Prompt context is bounded by a sliding window
  (CJK-aware token estimate in `src/lib/context-manager.ts`); the optional
  `settings.max_context_tokens` cap (0 = model default) engages the window +
  RAG retrieval earlier to bound per-message input-token cost.
- **Persistence**: `src/lib/db.ts` opens a local libsql database at
  `data/ai-studio.db`, auto-creating the `data/` directory and all tables.
- **Long-term memory (RAG)**: when the sliding window trims messages,
  `src/lib/rag.ts` lazily embeds them into `message_embeddings` and retrieves
  relevant chunks back into the prompt on later turns. Embeddings can be
  generated via an OpenAI/Gemini endpoint or fully on-device
  (`@huggingface/transformers` ONNX, no embedding channel required).

## Module Map

| Path | Responsibility |
| --- | --- |
| `src/app` | Route pages (`/`, `/library`, `/dashboard`, `/documentation`, `/prompts/*`) and `api/` endpoints |
| `src/components/chat` | Chat area, message bubbles, input box, message actions |
| `src/components/layout` | AppShell, MainLayout, Sidebar, RunSettingsPanel, PasswordGateProvider |
| `src/components/settings` | Settings window, API config dialog, tool selector |
| `src/components/dashboard` | DB stats, usage charts, data browser |
| `src/components/documentation` | In-app documentation reader (this page) |
| `src/lib` | `db.ts` (libsql + migrations), `auth.ts` (unlock-session guard), `chat-persistence.ts` (idempotent assistant-message persistence), `api-client.ts` (protocol adapters), `context-manager.ts`, `rag.ts` (RAG embedding/retrieval), `models.ts` |
| `src/middleware.ts` | Redirects locked visitors back to the lock screen (cookie-presence check only; the authoritative check is `requireUnlock()` in each API route) |
| `src/store` | Zustand `chatStore` — single source of truth for UI state |
| `src/types` | Shared TypeScript types |

## Backend API Reference

All routes live under `src/app/api` and are `force-dynamic`.

**Authentication (v1.5.1+)**: every database-backed route starts with
`requireUnlock()` (`src/lib/auth.ts`) and returns **401** until the browser
holds a valid `ai_studio_unlock` session cookie (issued by
`POST /api/password` after the password hash matches). No data leaves the
server before unlock. Exempt routes: `/api/password` (the gate itself),
`/api/clear-all` (lock-screen recovery flow), `/api/docs` and `/api/tts`
(no database access). When adding a new database-backed route, add the guard:

```ts
const locked = await requireUnlock(request);
if (locked) return locked;
```

| Method | Route | Description |
| ------ | ----- | ----------- |
| GET | `/api/settings` | Load app settings. |
| PUT | `/api/settings` | Update settings fields (tools_config, schema, function declarations, ...). |
| GET | `/api/password` | Read the app-lock password state (`enabled` + hash). Server-side so every device shares the same lock; exposes only the hash, never the full settings row. |
| PUT | `/api/password` | Set or clear the app-lock password (`{ hash }`; empty hash disables). Stored in `settings.app_password_hash`. |
| POST | `/api/password` | Unlock: verifies the submitted hash server-side and issues the httpOnly `ai_studio_unlock` session cookie (HMAC of a per-database secret in `settings.auth_secret`). Wrong hash → 401. |
| DELETE | `/api/password` | Lock: revokes the unlock session cookie. |
| GET | `/api/conversations` | List all conversations (title, timestamps). |
| POST | `/api/conversations` | Create a new conversation. |
| GET | `/api/conversations/:id` | Fetch conversation + messages; supports `?limit=&before_position=` pagination. |
| PUT | `/api/conversations/:id` | Rename conversation. |
| DELETE | `/api/conversations/:id` | Delete conversation, its messages and associated RAG embeddings. |
| POST | `/api/conversations/import` | Bulk-import from an exported context JSON. |
| POST | `/api/conversations/copy` | Duplicate a conversation. |
| POST | `/api/conversations/branch` | Branch a conversation from a given position. |
| POST | `/api/messages/rerun` | Regenerate from a position without affecting later turns. Rejects negative `from_position` (400) to protect against full-conversation truncation. |
| POST | `/api/chat` | Streaming chat completion (SSE). Applies sliding-window trimming plus RAG memory indexing/retrieval when enabled. Accepts multimodal attachments (image/video/audio/PDF/text) and persists them as blocks; attachment-only messages are allowed. Gemini protocol routes media so Gemini bills it as media (pixel tiles / seconds / pages) instead of base64 text: text files stay inline, **every other media type of any size** is uploaded via the Gemini Files API (`file_data` reference — resumable protocol first, multipart fallback, SHA-256-cached to avoid re-uploads on rerun/regenerate, negative-cached per endpoint when the gateway implements neither). Only when the Files API is truly unavailable does the request degrade to inline. On Gemini 3+ models the user-selected `media_resolution` level is applied per media part. OpenAI protocol sends images only. When the request carries no attachments (rerun/regenerate), they are rebuilt from the stored media blocks of the user message being re-answered. |
| DELETE | `/api/blocks/:id` | Soft-delete a single content block (text or media) of a message. The block is excluded from all future context builds (including rerun attachment rebuilds) and its RAG embeddings are removed. |
| POST | `/api/tts` | Edge-TTS synthesis. |
| GET | `/api/models` | List available models. |
| POST | `/api/models` | Register a custom model. |
| GET | `/api/db-stats` | Database size and table counts. |
| GET | `/api/db-path` | Resolved database path for export. |
| GET | `/api/db-content` | Database content listing for the dashboard. |
| GET | `/api/system-templates` | System instruction templates. |
| GET | `/api/api-configs` | Saved API configurations. |
| GET | `/api/usage-stats` | Per-model usage statistics. |
| DELETE | `/api/clear-all` | Wipe all user data. |
| GET | `/api/docs?doc=<name>&lang=<en\|zh>` | Read a project documentation markdown file. |

## Database Migrations

`getDb()` (`src/lib/db.ts`) creates missing tables and then runs the
table-driven `COLUMN_MIGRATIONS` list. Current status (all idempotent):

| Table | Columns added over time |
| --- | --- |
| `settings` | `proxy_url`, `structured_output_schema`, `function_declarations`, `stop_sequences`, `rag_enabled`, `rag_provider`, `rag_embedding_model`, `rag_top_k`, `app_password_hash`, `auth_secret`, `media_resolution`, `max_context_tokens` |
| `messages` | `token_count`, `input_tokens`, `output_tokens`, `thought_tokens` |

Each migration first checks `PRAGMA table_info(<table>)` and only runs its
`ALTER` when the column is missing — nothing is re-applied on restart.

**Troubleshooting entry point**: a failing migration is NOT swallowed. The
server logs a `[db] MIGRATION FAILED` block containing the failing step,
the SQL, its purpose, the underlying cause and where to look, then rethrows
so startup fails loudly. Start from `runMigrations()` / `columnExists()` in
`src/lib/db.ts` when reading such a log.

## Frontend State (chatStore)

Key slices in `src/store/chatStore.ts`:

- `settings`, `setSettings` — persisted app settings (mirrored to DB).
- `conversations`, `currentConversation`, `messages` — chat state.
- `activeView` — `playground | history | dashboard | documentation`.
- `pendingRoute` / `isNavigatingRef` — guards for store ↔ route synchronization.
- `messageUsage` — per-message token usage for the current conversation.
- TTS state — voice, volume, rate, pitch, auto-read toggle.

Route pages are intentionally thin: `AppShell` reads `activeView` and renders
the matching view; the store keeps view state when navigating between pages.

## Adding a New Tool

1. Extend `ToolsConfig` in `src/types/index.ts`.
2. Map the flag to the provider payload in `buildToolConfig`
   (`src/lib/api-client.ts`) for both Gemini and OpenAI adapters.
3. Add a toggle in `TOOLS_LIST` (`src/components/layout/RunSettingsPanel.tsx`).
4. Default value goes into the `settings` table defaults (`src/lib/db.ts`).

## Testing & Debugging

- `npm test` runs the focused test suite with Node's built-in test runner
  (native TypeScript type stripping, no extra dependencies).
  `tests/register.mjs` resolves the `@/*` alias; DB-dependent tests use a
  throwaway libsql file in the OS temp directory — the real
  `data/ai-studio.db` is never touched. Suites: assistant-message
  idempotent persistence, position/windowing invariants (incl. CJK-aware
  token estimation), partial-content
  save on stream errors, RAG failure degradation, Gemini media routing
  (inline vs Files API), media_resolution enum gating and Gemini thinking
  config.
- Console logs follow the `[ComponentName]` tag convention, e.g. `[AppShell]`,
  `[Sidebar]`, `[ChatArea]`, `[api/docs]`.
- Verify changes with `npm test`, `npx tsc --noEmit`, `npm run lint` and
  `npm run build`.
- The DB is a plain SQLite file (`data/ai-studio.db`) — inspect it with any
  SQLite tool; deleting it resets the app (including the lock password and
  the `auth_secret` used to sign unlock sessions).
