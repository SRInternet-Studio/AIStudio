# 二次开发指南

> 本文档为 [`DEVELOPMENT.md`](../DEVELOPMENT.md)（英文）的中文版本，内容保持同步。

## 架构概览

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

- **前端**：Next.js 14 App Router 的各路由页面只是共享 `AppShell` 组件的
  薄封装；视图状态保存在 Zustand `chatStore` 中。
- **聊天管线**：`POST /api/chat` 将请求代理到配置的接口，并以 SSE 分块
  （`data: {...}`）流式返回；`src/lib/api-client.ts` 同时适配 Gemini 与
  OpenAI 两种协议。提示词上下文由滑动窗口约束（CJK 感知的 token 估算见
  `src/lib/context-manager.ts`）；可选的 `settings.max_context_tokens`
  上限（0 = 模型默认值）会让窗口裁剪 + RAG 检索更早介入，从而限制单条消息
  的输入 token 开销。Google Search 接地引用
  （`candidates[0].groundingMetadata`）在流式与非流式响应中均会被捕获并
  持久化为 `grounding` 块；`src/lib/grounding.ts` 在渲染时将其转换为 GFM
  脚注（segment 索引是 UTF-8 **字节**偏移——切片前会先转换）。
- **持久化**：`src/lib/db.ts` 在 `data/ai-studio.db` 打开本地 libsql
  数据库，自动创建 `data/` 目录与所有数据表。
- **长期记忆（RAG）**：当滑动窗口裁剪掉早期消息时，`src/lib/rag.ts` 会
  将其惰性嵌入到 `message_embeddings`，并在后续轮次把相关片段检索回提示
  词。嵌入可以走 OpenAI/Gemini 接口，也可以完全在本地生成
  （`@huggingface/transformers` ONNX，无需嵌入通道）。

## 模块地图

| 路径 | 职责 |
| --- | --- |
| `src/app` | 路由页面（`/`、`/library`、`/dashboard`、`/documentation`、`/prompts/*`）与 `api/` 端点 |
| `src/components/chat` | 聊天区、消息气泡、输入框、消息操作 |
| `src/components/layout` | AppShell、MainLayout、Sidebar、RunSettingsPanel、PasswordGateProvider |
| `src/components/settings` | 设置窗口、API 配置对话框、工具选择器 |
| `src/components/dashboard` | 数据库统计、用量图表、数据浏览器 |
| `src/components/documentation` | 应用内文档阅读器（即本页面） |
| `src/lib` | `db.ts`（libsql + 迁移）、`auth.ts`（解锁会话守卫）、`chat-persistence.ts`（幂等的助手消息持久化）、`api-client.ts`（协议适配器）、`context-manager.ts`、`rag.ts`（RAG 嵌入/检索）、`models.ts` |
| `src/middleware.ts` | 将未解锁的访问者重定向回锁屏（只检查 cookie 是否存在；权威校验是各 API 路由中的 `requireUnlock()`） |
| `src/store` | Zustand `chatStore` —— UI 状态的唯一数据源 |
| `src/types` | 共享 TypeScript 类型 |

## 后端 API 参考

所有路由位于 `src/app/api` 下，均为 `force-dynamic`。

**鉴权（v1.5.1+）**：每个访问数据库的路由都以 `requireUnlock()`
（`src/lib/auth.ts`）开头，在浏览器持有有效的 `ai_studio_unlock` 会话
cookie（密码哈希校验通过后由 `POST /api/password` 签发）之前返回
**401**。解锁前没有任何数据离开服务器。豁免路由：`/api/password`
（锁本身）、`/api/clear-all`（锁屏恢复流程）、`/api/docs` 与 `/api/tts`
（不访问数据库）。新增访问数据库的路由时，请加上守卫：

```ts
const locked = await requireUnlock(request);
if (locked) return locked;
```

| 方法 | 路由 | 说明 |
| ------ | ----- | ----------- |
| GET | `/api/settings` | 读取应用设置。 |
| PUT | `/api/settings` | 更新设置字段（tools_config、schema、函数声明等）。 |
| GET | `/api/password` | 读取应用锁密码状态（`enabled` + 哈希）。放在服务端以便所有设备共享同一把锁；只暴露哈希，绝不暴露完整设置行。 |
| PUT | `/api/password` | 设置或清除应用锁密码（`{ hash }`；空哈希表示禁用）。存于 `settings.app_password_hash`。 |
| POST | `/api/password` | 解锁：在服务端校验提交的哈希，并签发 httpOnly 的 `ai_studio_unlock` 会话 cookie（对 `settings.auth_secret` 中每库独立密钥的 HMAC）。哈希错误 → 401。 |
| DELETE | `/api/password` | 上锁：吊销解锁会话 cookie。 |
| GET | `/api/conversations` | 列出所有会话（标题、时间戳）。 |
| POST | `/api/conversations` | 创建新会话。 |
| GET | `/api/conversations/:id` | 获取会话 + 消息；支持 `?limit=&before_position=` 分页。 |
| PUT | `/api/conversations/:id` | 重命名会话。 |
| DELETE | `/api/conversations/:id` | 删除会话、其消息及关联的 RAG 嵌入。 |
| POST | `/api/conversations/import` | 从导出的上下文 JSON 批量导入。 |
| POST | `/api/conversations/copy` | 复制会话。 |
| POST | `/api/conversations/branch` | 从指定位置分支出新会话。 |
| POST | `/api/messages/rerun` | 从指定位置重新生成且不影响之后的轮次。拒绝负数 `from_position`（400），防止整段会话被截断。 |
| POST | `/api/chat` | 流式聊天补全（SSE）。应用滑动窗口裁剪，启用时还会进行 RAG 记忆索引/检索。接受多模态附件（图片/视频/音频/PDF/文本）并持久化为块；允许纯附件消息。Gemini 协议会将媒体走媒体计费通道（像素块/秒数/页数）而非 base64 文本：文本文件保持内联，**任意大小的其他任何媒体类型**都通过 Gemini Files API 上传（以 `file_data` 引用——优先可续传协议、multipart 兜底，SHA-256 缓存避免 rerun/重新生成时重复上传，网关两者都不支持时按端点做负缓存）。只有 Files API 真正不可用时才降级为内联。Gemini 3+ 模型会按媒体块应用用户选择的 `media_resolution` 级别。OpenAI 协议仅发送图片。请求不携带附件时（rerun/重新生成），会从被重新回答的用户消息已存的媒体块重建附件。 |
| DELETE | `/api/blocks/:id` | 软删除消息的单个内容块（文本或媒体）。该块会被排除在之后所有上下文构建之外（包括 rerun 附件重建），其 RAG 嵌入也会被删除。 |
| POST | `/api/tts` | Edge-TTS 语音合成。 |
| GET | `/api/models` | 列出可用模型。Gemini 协议端点会在 `<base>/v1beta/models` 查询；不返回 `supportedGenerationMethods` 字段的模型仍会保留（中转接口常省略该字段）——只有明确不支持 `generateContent` 的模型才被过滤。自定义模型会被合并进来，ID 冲突时以接口定义为准。 |
| POST | `/api/models` | 注册自定义模型。 |
| GET | `/api/db-stats` | 数据库大小与各表行数。 |
| GET | `/api/db-path` | 解析后的数据库路径（用于导出）。 |
| GET | `/api/db-content` | 仪表盘用的数据库内容列表。 |
| GET | `/api/system-templates` | 系统指令模板。 |
| GET | `/api/api-configs` | 已保存的 API 配置。 |
| GET | `/api/usage-stats` | 按模型统计的用量。 |
| POST | `/api/clear-all` | 清空所有用户数据，将每个设置列重置为默认值，然后对数据库执行 `VACUUM` 使文件真正收缩（尽力而为；响应携带 `vacuumed` 标志）。 |
| GET | `/api/docs?doc=<name>&lang=<en\|zh>` | 读取项目文档 markdown 文件。 |

## 数据库迁移

`getDb()`（`src/lib/db.ts`）先创建缺失的表，然后运行表驱动的
`COLUMN_MIGRATIONS` 列表。当前状态（全部幂等）：

| 表 | 历次新增的列 |
| --- | --- |
| `settings` | `proxy_url`、`structured_output_schema`、`function_declarations`、`stop_sequences`、`rag_enabled`、`rag_provider`、`rag_embedding_model`、`rag_top_k`、`app_password_hash`、`auth_secret`、`media_resolution`、`max_context_tokens` |
| `messages` | `token_count`、`input_tokens`、`output_tokens`、`thought_tokens` |

每条迁移先检查 `PRAGMA table_info(<table>)`，仅当列缺失时才执行
`ALTER` —— 重启不会重复应用。

**排障入口**：迁移失败不会被吞掉。服务器会输出 `[db] MIGRATION FAILED`
日志块，包含失败步骤、SQL、其目的、底层原因与排查方向，然后重新抛出异常
使启动大声失败。遇到此类日志时，从 `src/lib/db.ts` 的
`runMigrations()` / `columnExists()` 读起。

## 前端状态（chatStore）

`src/store/chatStore.ts` 中的关键切片：

- `settings`、`setSettings` —— 持久化的应用设置（与数据库镜像同步）。
- `conversations`、`currentConversation`、`messages` —— 聊天状态。
- `activeView` —— `playground | history | dashboard | documentation`。
- `pendingRoute` / `isNavigatingRef` —— store ↔ 路由同步的守卫。
- `messageUsage` —— 当前会话中每条消息的 token 用量。
- TTS 状态 —— 音色、音量、语速、音调、自动朗读开关。

路由页面刻意保持轻薄：`AppShell` 读取 `activeView` 渲染对应视图；
页面间导航时由 store 保持视图状态。

## 新增一个工具

1. 在 `src/types/index.ts` 扩展 `ToolsConfig`。
2. 在 `buildToolConfig`（`src/lib/api-client.ts`）中为 Gemini 与 OpenAI
   两个适配器把开关映射到供应商请求体。
3. 在 `TOOLS_LIST`（`src/components/layout/RunSettingsPanel.tsx`）添加开关。
4. 默认值写入 `settings` 表默认值（`src/lib/db.ts`）。

## 测试与调试

- `npm test` 使用 Node 内置测试运行器执行聚焦测试套件（原生 TypeScript
  类型剥离，无额外依赖）。`tests/register.mjs` 解析 `@/*` 别名；依赖
  数据库的测试使用系统临时目录里的一次性 libsql 文件——绝不触碰真实的
  `data/ai-studio.db`。套件覆盖：助手消息幂等持久化、位置/窗口不变量
  （含 CJK 感知 token 估算）、流式错误时的部分内容保存、RAG 失败降级、
  Gemini 媒体路由（内联 vs Files API）、media_resolution 枚举门控、
  Gemini 思考配置与脚注引用插入（含 UTF-8 字节偏移 segment）、模型列表
  合并（追加式 + 字段级回退）与 TTS 纯文本化。
- 控制台日志遵循 `[组件名]` 标签约定，如 `[AppShell]`、`[Sidebar]`、
  `[ChatArea]`、`[api/docs]`。
- 变更请用 `npm test`、`npx tsc --noEmit`、`npm run lint` 与
  `npm run build` 验证。
- 数据库就是一个普通 SQLite 文件（`data/ai-studio.db`）——可用任何
  SQLite 工具查看；删除它即重置应用（包括锁屏密码与用于签名解锁会话的
  `auth_secret`）。
