# Changelog

All notable changes to this project will be documented in this file.

本项目的所有重要变更都将记录在此文件中。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

该格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，本项目遵循 [语义化版本控制](https://semver.org/spec/v2.0.0.html)。

## [1.2.0] — 2026-08-07

### Added 新增

- **RAG (Retrieval-Augmented Generation) long-term memory**: when the
  sliding window trims older messages out of the context window, the
  trimmed messages are embedded into vectors and stored in a new
  `message_embeddings` table (lazily, idempotently by content hash, and
  cleaned up automatically when messages/conversations are deleted,
  edited or cleared). The current user message is then used as a
  semantic query — the most relevant trimmed history is retrieved by
  cosine similarity and injected into the system prompt inside a
  reserved token budget (10% of the window, capped at 32k), so the model
  can still "remember" early conversation history that no longer fits
  the window. RAG works alongside the sliding window (never replaces it)
  and degrades gracefully: any embedding/retrieval failure falls back to
  plain sliding-window behavior without breaking the chat. Two embedding
  providers: **API** (reuses the configured Base URL / API key / proxy,
  OpenAI-compatible `/v1/embeddings` or Gemini `:batchEmbedContents`,
  default `text-embedding-3-small` / `text-embedding-004`) and **Local**
  (on-device ONNX embeddings via `@huggingface/transformers`, default
  multilingual MiniLM, model cached in `data/rag-models`, downloads
  honor the configured proxy). The Local provider needs **no embedding
  channel at all** — recommended for relay/gateway endpoints that do not
  offer embedding models. Settings panel gains an RAG section (enable
  switch, provider, embedding model, Top-K 1–20); the Database Status
  dashboard reports the new table and the updated "Sliding Window + RAG"
  behavior

  **RAG（检索增强生成）长期记忆**：当滑动窗口将较早消息裁剪出上下文窗口时，被裁剪的消息会被嵌入为向量并存入新表 `message_embeddings`（懒索引、按内容哈希幂等，删除/编辑/清空消息或会话时自动清理向量）。随后以当前用户消息作为语义查询，按余弦相似度检索最相关的被裁剪历史，在预留的 token 预算（窗口的 10%，上限 32k）内注入 system 提示，使模型仍能"记住"早已放不进窗口的早期对话。RAG 与滑动窗口协同工作（而非替代），并优雅降级：任何嵌入/检索失败都会回退为纯滑动窗口行为，不影响聊天。两种嵌入提供方：**API**（复用已配置的 Base URL / API key / 代理，OpenAI 兼容 `/v1/embeddings` 或 Gemini `:batchEmbedContents`，默认 `text-embedding-3-small` / `text-embedding-004`）与 **Local**（基于 `@huggingface/transformers` 的本地 ONNX 嵌入，默认多语言 MiniLM，模型缓存在 `data/rag-models`，下载走已配置代理）。Local 提供方**完全不依赖嵌入渠道**——推荐不提供嵌入模型的中转站/网关用户使用。设置面板新增 RAG 区域（开关、提供方、嵌入模型、Top-K 1–20）；数据库状态面板展示新表并更新为 "Sliding Window + RAG" 说明

### Changed 变更

- **Welcome page feature cards**: the six placeholder cards under
  "Explore AI models" now describe this project's real features
  (local-first storage, bring your own endpoint, long-term memory RAG,
  full tool suite, Edge-TTS voice, password protection) instead of the
  Google AI Studio marketing copy

  **欢迎页功能卡片**："Explore AI models" 下方的六张占位卡片改为展示本项目的真实功能特色（本地优先存储、自带接口、RAG 长期记忆、完整工具套件、Edge-TTS 语音、密码保护），不再沿用 Google AI Studio 的宣传文案

### Fixed 修复

- **Local RAG proxy handling**: the temporary global-dispatcher override
  used to route the one-time ONNX model download through the configured
  proxy is now fully restored afterwards. Previously the override could
  leak for the rest of the server process lifetime, causing later chat
  requests to keep going through a proxy that was no longer running

  **本地 RAG 代理处理**：用于将一次性 ONNX 模型下载路由到已配置代理的全局 dispatcher 临时覆盖，现在会在完成后完整恢复。此前该覆盖可能在服务器进程的剩余生命周期内泄漏，导致后续聊天请求持续经过已停止运行的代理

- **UI freeze when deleting a message in very large conversations**: deleting
  a message no longer re-downloads the entire transcript (the reload
  bypassed lazy paging and refetched every block — 10 MB+ for imported
  contexts); the truncation is now applied to local state directly. In
  addition, markdown rendering of text blocks is memoized, so unchanged
  messages are no longer re-parsed on every state change (deletion,
  streaming chunk, reload)

  **超大上下文会话中删除消息导致界面卡顿**：删除消息不再重新拉取整个会话记录（原重载绕过了懒加载分页，会重新获取全部 block——导入的上下文可达 10 MB 以上），截断结果现在直接应用到本地状态。此外，文本块的 markdown 渲染已做记忆化，未变更的消息不再随每次状态变化（删除、流式分块、重载）重新解析

## [1.1.0] — 2026-08-07

### Added 新增

- **Stop sequences** in Advanced Settings: add up to 5 stop words (Enter to
  add, removable tags). Sent natively to both protocols — `stopSequences`
  (Gemini API) and `stop` (OpenAI-compatible API). As a safety net the server
  also scans the stream: generation is truncated at the first hit, the
  upstream stream is aborted, and the UI shows a notification that the
  generated content violated the Safety Settings

  高级设置中新增**停止词（Stop sequences）**：最多可添加 5 个停止词（回车添加、标签可删除）。参数按两种协议原生发送——Gemini API 的 `stopSequences` 与 OpenAI 兼容 API 的 `stop`。服务端同时作为安全网对流式输出进行扫描：命中时立即截断内容、中止上游流，并在界面提示生成内容违反了 Safety Settings

### Fixed 修复

- **Top-K** and **Output length** always display numeric values: Top-K
  defaults to 64 (minimum 1), Output length defaults to 65536 with range
  1 – 65536; empty-string values stored in the database are sanitized on
  read and write

  **Top-K** 与 **Output length** 始终显示数值：Top-K 默认 64（最小 1），Output length 默认 65536，范围 1 – 65536；数据库中存储的空字符串在读取与写入时均被消毒为有效数值

- **Safety settings** dialog: the four harm-category options are clickable
  immediately when opened — no need to press "Reset defaults" first

  **安全设置**对话框：打开时四个危害类别选项即可直接点击，无需先按 "Reset defaults"

- Input box file list is now a **single horizontally scrollable row** instead
  of growing taller with each attached file

  输入框文件列表改为**单行横向滚动**，不再随附加文件增多而越堆越高

- Global error toast (e.g. the stop-sequence warning) now renders on top with
  a visible background: Tailwind custom colors are defined via `color-mix`,
  so opacity modifiers such as `bg-destructive/95` are generated correctly
  (previously the toast was fully transparent and looked "covered" by page
  content); its stacking order is raised to z-index 150, above all dialogs
  and overlays

  全局错误浮窗（如停止词提示）现在以可见背景置顶显示：Tailwind 自定义颜色改用 `color-mix` 定义，使 `bg-destructive/95` 等透明度修饰类能正确生成（此前浮窗完全透明，看起来像被页面内容"覆盖"）；层级提升至 z-index 150，高于所有对话框与遮罩层

- **Rerun now regenerates in place**: rerunning an earlier user message
  replaces only its own assistant reply (text and thinking) — later turns
  are kept, and the new reply is inserted right after that user message
  instead of being appended at the end of the conversation. The endpoint
  first checks whether the reply still exists (skipping deletion when the
  user already removed it manually); message positions are allocated from
  `MAX(position)` instead of the row count, and a collision guard shifts
  later messages down when the target slot is still occupied, so legacy
  conversations with duplicated positions are repaired on regeneration

  **Rerun 现在原地重新生成**：对较早的用户消息执行 Rerun 时，只替换该消息自己的助手回复（正文与思考过程），后续轮次全部保留，新回复插入在该用户消息之后，而不再追加到对话末尾。接口会先检查回复是否仍然存在（用户已手动删除时跳过删除操作）；消息位置改为按 `MAX(position)` 分配而非按行数分配，且插入前增加碰撞保护——目标位置仍被占用时将后续消息顺延，历史数据中位置重复的会话在重新生成时即被修复

- **Context import no longer silently drops images and documents**: imported
  chunks of type `inlineImage` (base64-embedded pictures) and
  `driveDocument` were previously ignored, so imported conversations lost
  their inline images. They are now stored as image blocks (inline images as
  `data:` URLs)

  **上下文导入不再静默丢弃图片与文档**：此前导入时 `inlineImage`（base64 内联图片）与 `driveDocument` 类型的块会被直接忽略，导致导入的会话丢失内联图片；现在它们会作为图片块保存（内联图片以 `data:` URL 形式存储）

- **Dashboard database size is now live**: `/api/db-stats` is marked
  `force-dynamic`, so the Database Status page reports the current on-disk
  size instead of stale values baked into the build at prerender time; the
  reported size now comes from the database file itself. Both dashboard tabs
  show consistent numbers

  **Dashboard 数据库大小现在实时准确**：`/api/db-stats` 标记为 `force-dynamic`，Database Status 页面显示当前磁盘上的真实大小，而不再是构建时预渲染固化的陈旧数值；大小直接取自数据库主文件。两个标签页的数值现已一致

- **Sliding-window context trimming is now correct**: a single oversized
  message in the middle of the history no longer discards every earlier turn
  (it is skipped instead), and the newest message is always kept even if it
  alone exceeds the context window; the system instruction is placed first
  in the trimmed request instead of last

  **滑动窗口上下文裁剪逻辑修正**：历史中单条超大消息不再导致更早的所有轮次被全部丢弃（改为跳过该条继续选取），且最新消息即使单独超出上下文窗口也必定保留；裁剪后系统指令位于请求最前而非末尾

- Dashboard "Sliding Window" panel wording corrected: removed misleading
  claims about RAG retrieval and a fixed "1M tokens" figure — trimmed
  messages are only excluded from API requests, never deleted, and are not
  automatically re-retrieved

  Dashboard "Sliding Window" 面板文案修正：删除了关于 RAG 检索与固定 "1M tokens" 的误导性表述——被裁剪的消息仅从 API 请求中排除，永不删除，也不会被自动重新检索

## [1.0.0] — 2026-08-06

Initial public release. An open-source, self-hosted recreation of the Google
AI Studio playground, for learning and research purposes only.

首次公开发布。这是一个开源的自托管版本，用于学习和研究目的，重现了 Google AI Studio 的交互式开发环境。

### Added 新增

#### Core Playground 核心操练场

- Streaming (SSE) and non-streaming chat completions via any **Gemini** or
  **OpenAI-compatible** endpoint

  通过任意 **Gemini** 或 **OpenAI 兼容端点** 实现流式（SSE）和非流式聊天完成 


- Custom **Base URL / API key**, switchable protocol, optional **HTTP proxy**

  自定义 **基础URL/API密钥**，可切换协议，支持可选的 **HTTP代理** 

- Model selector with live model listing and **custom model registration**
  (custom context window, category, description)

  模型选择器，实时显示模型列表，并支持 **自定义模型注册**（自定义上下文窗口、类别、描述） 

- **Regenerate** a response from any point without affecting later turns

  可从任意位置**重新生成**响应，且不影响后续对话轮次 


- Conversation **branching / duplication**, context JSON **import & export**

  对话 **分支/复制**，上下文JSON **导入与导出** 

- Lazy-loaded history with automatic pagination on scroll-to-top

  延迟加载历史记录，滚动至顶部时自动分页

#### Tools 工具

- Structured outputs with a **JSON Schema editor**

  带有**JSON Schema 编辑器**的结构化输出  

- Function calling with a **declarations editor**

  带有**声明编辑器**的函数调用  

- Code execution

  代码执行

- Grounding with Google Search / Google Maps

  通过 Google 搜索 / Google 地图进行信息定位

- URL context

  URL 内容嵌入上下文

#### Configuration & Personalization 配置与个性化

- Run settings panel: system instructions, temperature, top-p / top-k,
  max output tokens, thinking level, safety thresholds per harm category

  运行设置面板：系统指令、温度、top-p / top-k、最大输出令牌数、思考级别、各危害类别安全阈值  

- **System instruction templates** (save / apply / manage)

  **系统指令模板**（保存 / 应用 / 管理）  

- Theme support: **dark / light / system** (flicker-free, applied before hydration)

  主题支持：**深色 / 浅色 / 系统模式**（无闪烁，水合前应用）  

- **Password protection** with lock screen (optional, stored locally)

  带锁屏功能的**密码保护**（可选，本地存储）

- Per-message and per-conversation **token usage** statistics

  每条消息和每场对话的**令牌使用统计**

#### Data & Voice 数据与语音

- **Local-first storage**: embedded SQLite (libsql) database — conversations,
  messages, settings and usage all persisted on disk, no cloud dependency

  **本地优先存储**：嵌入式 SQLite（libsql）数据库——对话、消息、设置和使用情况均保存在磁盘上，无云依赖  

- Dashboard with database size, table stats and usage charts

  带有数据库大小、表统计和使用图表的仪表盘  

- **Edge-TTS** speech synthesis: multiple voices, adjustable volume / rate /
  pitch, per-message playback and **auto-read** mode for AI responses

  **Edge-TTS** 语音合成：多种语音、可调节音量/语速/音调、按消息播放以及AI回复的**自动朗读**模式

- Fully **responsive** layout — desktop sidebar and mobile drawer

  完全**响应式**布局——桌面侧边栏和移动端抽屉式导航

#### Project Infrastructure 项目基础设施

- Bilingual documentation: English in the project root, Chinese in `Docs/`,
  with in-app reader (Manage → Documentation) and an EN / 中文 switch

  双语文档：项目根目录为英文，`Docs/` 目录为中文，支持应用内阅读器（管理 → 文档）以及中英文切换功能  

- Disclaimer clarifying the project's relationship with Google AI Studio

  免责声明，说明本项目与 Google AI Studio 的关系

- Development guide with architecture overview and full backend API reference

  开发指南，包含架构概览和完整的后端 API 参考文档

- Security policy with responsible disclosure guidelines

  安全政策，含责任披露指引

[1.1.0]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.1.0
[1.0.0]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.0.0
