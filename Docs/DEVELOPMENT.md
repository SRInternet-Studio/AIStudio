# 二次开发手册

## 架构总览

```
┌────────────┐   Zustand    ┌────────────┐   fetch/SSE   ┌──────────────┐
│  React UI  │ ◄──────────► │  chatStore │ ◄────────────► │ Next.js API  │
│ (App Router│              │ (src/store)│                │ 路由         │
│  页面)     │              └────────────┘                │ (src/app/api)│
└────────────┘                                            └──────┬───────┘
                                                                 │ libsql
                                                          ┌──────▼───────┐
                                                          │ SQLite (data/│
                                                          │ ai-studio.db)│
                                                          └──────────────┘
```

- **前端**：Next.js 14 App Router 页面是围绕共享 `AppShell` 组件的轻量
  封装；视图状态保存在 Zustand `chatStore` 中。
- **对话管线**：`POST /api/chat` 将请求代理到配置的接口，并以 SSE 分块
  （`data: {...}`）流式返回；`src/lib/api-client.ts` 同时适配 Gemini 与
  OpenAI 两种协议。
- **持久化**：`src/lib/db.ts` 打开位于 `data/ai-studio.db` 的本地 libsql
  数据库，自动创建 `data/` 目录与全部数据表。
- **长期记忆（RAG）**：当滑动窗口裁剪消息时，`src/lib/rag.ts` 将被裁消息
  懒索引到 `message_embeddings`，并在后续对话中按语义相似度检索回注提示词。
  嵌入可通过 OpenAI/Gemini 接口生成，也可完全在本机生成
  （`@huggingface/transformers` ONNX，无需任何嵌入渠道）。

## 模块地图

| 路径 | 职责 |
| --- | --- |
| `src/app` | 路由页面（`/`、`/library`、`/dashboard`、`/documentation`、`/prompts/*`）与 `api/` 接口 |
| `src/components/chat` | 对话区、消息气泡、输入框、消息操作 |
| `src/components/layout` | AppShell、MainLayout、Sidebar、RunSettingsPanel、PasswordGateProvider |
| `src/components/settings` | 设置窗口、API 配置对话框、工具选择器 |
| `src/components/dashboard` | 数据库统计、用量图表、数据浏览 |
| `src/components/documentation` | 应用内文档阅读器（本页面） |
| `src/lib` | `db.ts`（libsql）、`api-client.ts`（协议适配）、`context-manager.ts`、`rag.ts`（RAG 嵌入/检索）、`models.ts` |
| `src/store` | Zustand `chatStore` — UI 状态的唯一事实来源 |
| `src/types` | 共享 TypeScript 类型 |

## 后端接口文档

所有接口位于 `src/app/api` 下，均为 `force-dynamic`。

| 方法 | 路由 | 说明 |
| ------ | ----- | ----------- |
| GET | `/api/settings` | 读取应用设置。 |
| PUT | `/api/settings` | 更新设置字段（tools_config、schema、函数声明等）。 |
| GET | `/api/password` | 读取锁屏密码状态（`enabled` 与哈希）。密码存储在服务端，所有设备共享同一把锁；仅返回哈希，不暴露完整设置行。 |
| PUT | `/api/password` | 设置或清除锁屏密码（请求体 `{ hash }`，空哈希即清除）。持久化于 `settings.app_password_hash`。 |
| GET | `/api/conversations` | 列出全部会话（标题、时间戳）。 |
| POST | `/api/conversations` | 创建新会话。 |
| GET | `/api/conversations/:id` | 获取会话与消息；支持 `?limit=&before_position=` 分页。 |
| PUT | `/api/conversations/:id` | 重命名会话。 |
| DELETE | `/api/conversations/:id` | 删除会话、其消息及对应的 RAG 嵌入。 |
| POST | `/api/conversations/import` | 从导出的上下文 JSON 批量导入。 |
| POST | `/api/conversations/copy` | 复制会话。 |
| POST | `/api/conversations/branch` | 从指定位置分支会话。 |
| POST | `/api/messages/rerun` | 从指定位置重新生成，不影响后续对话。拒绝负数 `from_position`（400），防止误删整个对话。 |
| POST | `/api/chat` | 流式对话补全（SSE）。启用时执行滑动窗口裁剪与 RAG 记忆索引/检索。接受多模态附件（图片/视频/音频/PDF/文本）并持久化为块；允许纯附件消息。Gemini 协议将不超过 15MB 的媒体以 `inline_data` 内联发送，更大的文件通过 Gemini Files API 上传（以 `file_data` 引用）；OpenAI 协议仅发送图片。当请求未携带附件时（重跑/重新生成），会从被重新回答的用户消息已保存的媒体块重建附件。 |
| POST | `/api/tts` | Edge-TTS 语音合成。 |
| GET | `/api/models` | 列出可用模型。 |
| POST | `/api/models` | 注册自定义模型。 |
| GET | `/api/db-stats` | 数据库大小与表统计。 |
| GET | `/api/db-path` | 数据库文件路径（用于导出）。 |
| GET | `/api/db-content` | 数据库内容列表（仪表盘用）。 |
| GET | `/api/system-templates` | 系统指令模板。 |
| GET | `/api/api-configs` | 已保存的 API 配置。 |
| GET | `/api/usage-stats` | 按模型的用量统计。 |
| DELETE | `/api/clear-all` | 清空全部用户数据。 |
| GET | `/api/docs?doc=<name>&lang=<en\|zh>` | 读取项目文档 Markdown 文件。 |

## 前端状态（chatStore）

`src/store/chatStore.ts` 中的关键切片：

- `settings`、`setSettings` — 持久化的应用设置（同步写入数据库）。
- `conversations`、`currentConversation`、`messages` — 对话状态。
- `activeView` — `playground | history | dashboard | documentation`。
- `pendingRoute` / `isNavigatingRef` — store ↔ 路由双向同步的保护机制。
- `messageUsage` — 当前会话的单条消息 token 用量。
- TTS 状态 — 音色、音量、语速、音调、自动朗读开关。

路由页面刻意保持轻量：`AppShell` 读取 `activeView` 并渲染对应视图；
跨页面导航时由 store 保持视图状态。

## 添加新工具的步骤

1. 在 `src/types/index.ts` 中扩展 `ToolsConfig`。
2. 在 `buildToolConfig`（`src/lib/api-client.ts`）中为 Gemini 与 OpenAI
   两种适配器映射该开关。
3. 在 `TOOLS_LIST`（`src/components/layout/RunSettingsPanel.tsx`）中添加开关。
4. 在 `settings` 表默认值（`src/lib/db.ts`）中添加默认值。

## 测试与调试

- 控制台日志遵循 `[组件名]` 标签约定，如 `[AppShell]`、`[Sidebar]`、
  `[ChatArea]`、`[api/docs]`。
- 用 `npx tsc --noEmit` 与 `npm run build` 验证改动。
- 数据库是普通的 SQLite 文件（`data/ai-studio.db`）——可用任意 SQLite 工具
  查看；删除该文件即可重置应用。
