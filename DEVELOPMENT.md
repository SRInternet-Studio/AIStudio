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
  Gemini and OpenAI protocols.
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
| `src/lib` | `db.ts` (libsql), `api-client.ts` (protocol adapters), `context-manager.ts`, `rag.ts` (RAG embedding/retrieval), `models.ts` |
| `src/store` | Zustand `chatStore` — single source of truth for UI state |
| `src/types` | Shared TypeScript types |

## Backend API Reference

All routes live under `src/app/api` and are `force-dynamic`.

| Method | Route | Description |
| ------ | ----- | ----------- |
| GET | `/api/settings` | Load app settings. |
| PUT | `/api/settings` | Update settings fields (tools_config, schema, function declarations, ...). |
| GET | `/api/conversations` | List all conversations (title, timestamps). |
| POST | `/api/conversations` | Create a new conversation. |
| GET | `/api/conversations/:id` | Fetch conversation + messages; supports `?limit=&before_position=` pagination. |
| PUT | `/api/conversations/:id` | Rename conversation. |
| DELETE | `/api/conversations/:id` | Delete conversation, its messages and associated RAG embeddings. |
| POST | `/api/conversations/import` | Bulk-import from an exported context JSON. |
| POST | `/api/conversations/copy` | Duplicate a conversation. |
| POST | `/api/conversations/branch` | Branch a conversation from a given position. |
| POST | `/api/messages/rerun` | Regenerate from a position without affecting later turns. |
| POST | `/api/chat` | Streaming chat completion (SSE). Applies sliding-window trimming plus RAG memory indexing/retrieval when enabled. |
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

- Console logs follow the `[ComponentName]` tag convention, e.g. `[AppShell]`,
  `[Sidebar]`, `[ChatArea]`, `[api/docs]`.
- Verify changes with `npx tsc --noEmit` and `npm run build`.
- The DB is a plain SQLite file (`data/ai-studio.db`) — inspect it with any
  SQLite tool; deleting it resets the app.
