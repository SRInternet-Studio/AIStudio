# Changelog

All notable changes to this project will be documented in this file.

本项目的所有重要变更都将记录在此文件中。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

该格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，本项目遵循 [语义化版本控制](https://semver.org/spec/v2.0.0.html)。

## [1.7.2] — 2026-08-16

### Security 安全

- **Dependabot dependency upgrades applied and verified**: `next`
  14.2.35 → 16.3.1 (fixes flagged framework CVEs), `drizzle-orm`
  0.38 → 0.45.2, plus `glob` / `postcss` / `eslint-config-next` bumps.
  Companion hardening landed with the PRs and was reviewed: model IDs are
  validated (`[A-Za-z0-9._-]+`) and URL-encoded before being interpolated
  into Gemini request URLs, and footnote link text now escapes backslashes
  before brackets. 应用并验证了 Dependabot 依赖升级（next 14→16 修复被
  标记的框架 CVE，drizzle-orm/glob/postcss 等同步升级）；随 PR 引入的加固
  代码已审查：模型 ID 在拼入 Gemini 请求 URL 前做字符集校验与 URL 编码，
  脚注链接文本先转义反斜杠再转义括号。

### Changed 变更（Next.js 16 迁移）

- **Next.js 14 → 16 migration completed**: dynamic route handlers and pages
  (`/api/conversations/[id]`, `/api/blocks/[id]`, `/prompts/[id]`) now await
  async `params`; `experimental.serverComponentsExternalPackages` moved to
  top-level `serverExternalPackages` (the old key is silently ignored by
  Next 15+ and would have broken TTS / local RAG native modules);
  `middleware.ts` remains functional (deprecated notice only). A dead
  `DELETE /api/blocks` handler that could never receive params was removed.
  完成 Next.js 14→16 迁移：动态路由改为异步 params；外部化原生模块的配置
  键迁移到顶层 `serverExternalPackages`（旧键被静默忽略会弄坏 TTS/本地 RAG
  原生模块）；middleware 仍可用（仅弃用提示）；移除了一个永远拿不到参数的
  死代码 DELETE 处理器。
- **ESLint 9 flat config**: Next 16 removed `next lint` and ships ESLint
  config via `eslint.config.mjs`. Dependabot had set ESLint to `^10.8.1`,
  which eslint-config-next's own plugins reject (peer range ends at 9) —
  pinned back to `^9.39.2`; `npm run lint` now runs `eslint .` directly.
  React-Compiler diagnostics from react-hooks v7 are kept at `warn` for the
  legacy codebase (0 errors, 29 warnings — same posture as before the
  upgrade). ESLint flat config 迁移；Dependabot 给出的 ESLint 10 与
  eslint-config-next 插件不兼容，已回退到 9；react-hooks v7 的编译器诊断
  对遗留代码保持警告级别（0 错误、29 警告，与升级前姿态一致）。

### Verification 验证

- 66/66 tests pass; `tsc --noEmit`, `eslint .` (0 errors), `next build`
  (Turbopack) all clean. 测试与静态检查全部通过。
- Browser regression after the upgrade: 9/9 — home render, conversation
  list, dynamic-route message loading, `/prompts/[id]` deep links,
  streaming chat, Dashboard (DB stats/content/usage), Documentation
  (English/中文), 249-model selector, zero console errors. Both protocol
  paths re-verified: Gemini-protocol relay and the OpenAI-compatible
  endpoint (streaming reply with thinking block), settings restored
  afterwards. 升级后浏览器回归 9/9 项通过；Gemini 与 OpenAI 两种协议链路
  均实测流式回复正常，测试后设置已复原。

## [1.7.1] — 2026-08-16

### Fixed 修复（2026-08-16 追加）

- **Confirmation dialog vanished instantly on touch devices (fixed via
  portal)**: tapping "Delete from here" with a finger showed the dialog for
  a split second. Real root cause: MessageActions sits inside a hover-reveal
  wrapper (`opacity-0 group-hover/msg:opacity-100`), and the dialog was
  rendered inside it — when the hover state cleared (which on touch screens
  happens right after the tap) the dialog inherited `opacity-0` and became
  invisible while staying mounted (tapping the message bubble brought the
  hover state back and the dialog "reappeared"). ConfirmDialog is now
  rendered through `createPortal` into `document.body` at `z-[180]` — above
  every app dialog and the notice toast, escaping all ancestor
  opacity/transform/overflow stacking contexts — and moves focus into the
  dialog on open. Additionally the menu's outside-tap listener pauses while
  the confirmation is open.

  **触摸设备上确认弹窗一闪即关（已用 portal 根治）**：手指点击
  "Delete from here" 后弹窗瞬间消失。真正根因：MessageActions 位于悬停
  显现容器（`opacity-0 group-hover/msg:opacity-100`）内，弹窗随之继承
  `opacity-0`——触摸设备上点击后悬停状态立即解除，弹窗保持挂载但不可见
  （重新点击消息气泡恢复悬停后弹窗又会"重新出现"）。现 ConfirmDialog 通过
  `createPortal` 渲染到 `document.body`，层级 `z-[180]` 高于所有应用内弹窗
  与提示浮窗，彻底脱离祖先 opacity/transform/overflow 层叠上下文，并在打开
  时自动获得焦点；菜单的外部点击监听在弹窗打开期间同时暂停。

### Changed 变更（2026-08-16 追加）

- **Native browser confirm() replaced by ConfirmDialog everywhere**:
  Dashboard → Database Content (delete conversation) and API Configs
  (delete config) now use the project's reusable confirmation dialog,
  matching the rest of the UI. 原生浏览器 confirm 全部替换为项目内
  ConfirmDialog：Dashboard 的数据库内容页删除会话与 API 配置页删除配置。

- **Model merge falls back field by field**: when the endpoint returns a
  model with missing/empty fields (displayName, description, category, no
  positive contextWindow) while the locally known list (e.g. the built-in
  fallback models) has a complete record, the local values now fill the
  gaps — the endpoint still wins wherever it provides data, and merged
  entries never show holes. 模型合并逐字段回退：接口返回的模型缺少字段
  （名称/描述/分类/上下文窗口）时，自动用本地已有记录的对应值补全；接口
  提供了值的字段仍以接口为准。

- **Richer runtime logs for troubleshooting**: the client logs model-list
  sync summaries (`endpoint returned X, local had Y, merged total Z`),
  fallback usage and non-streaming chat errors; the chat route logs its
  outer failure with stack trace. 增强运行日志：客户端输出模型同步摘要、
  回退使用与非流式聊天错误；chat 路由外层异常输出堆栈。

### Fixed 修复

- **Network failure swallowed the user bubble**: when the chat request died
  before reaching the server, the error path reloaded messages from the DB —
  which never contained the user message — silently deleting the user's input.
  The reload now checks whether the message was persisted and re-adds it
  (text or attachment-only) alongside the error bubble when it was not.

  **网络失败吞掉用户气泡**：请求未到达服务器即失败时，错误处理会从数据库
  重载消息——而用户消息从未入库——导致用户输入被悄悄删除。现在重载后会
  检测消息是否已持久化，未持久化时将用户气泡（纯文本或纯附件）补回并保留
  错误气泡。

- **Model refresh returned almost nothing**: the model filter required a
  `supportedGenerationMethods` field that many relays omit, silently dropping
  the relay's entire catalog (236 models). Models are now only excluded when
  they *explicitly* lack `generateContent`, and the client merge is
  append-only: new endpoint models are added, locally known models are never
  removed, and duplicate IDs take the endpoint's fresher definition. A failed
  refresh also keeps the current list instead of downgrading to the fallback.

  **刷新模型列表几乎为空**：模型过滤要求 `supportedGenerationMethods` 字段，
  而许多中转接口不返回该字段，导致整个模型目录（236 个模型）被静默丢弃。
  现在仅在模型*明确*缺少 `generateContent` 时才排除；客户端合并为追加式：
  接口新模型被追加、本地已有模型绝不删除、相同 ID 以接口返回的更新定义为准。
  刷新失败时也保留现有列表而非降级为备用列表。

- **"Clear all data" left the database file full size and gave no feedback**:
  deleted rows only freed SQLite pages internally, so the `.db` file kept its
  old size (24.4 MB stayed 24.4 MB after clearing), and the Confirm button
  appeared to do nothing while the request ran. The route now `VACUUM`s the
  database after clearing (verified 24.4 MB → 108 KB), resets every settings
  column — including `media_resolution` and `max_context_tokens` which earlier
  migrations had left stale — and reports a `vacuumed` flag. The lock-screen
  modal shows a spinner and "Clearing…" while working and surfaces failures
  instead of failing silently.

  **"清除所有数据"后数据库文件不缩小且无反馈**：删除行只释放了 SQLite 内部
  页面，`.db` 文件保持原大小（清除后 24.4 MB 仍为 24.4 MB），且请求执行期间
  Confirm 按钮看似毫无反应。现在清除后对数据库执行 `VACUUM`（实测 24.4 MB →
  108 KB），重置*所有*设置列（包括此前迁移遗漏的 `media_resolution` 和
  `max_context_tokens`），并返回 `vacuumed` 标志。锁屏弹窗在执行期间显示
  转圈动画与"Clearing…"，失败时显示错误信息。

### Added / Changed 新增 / 变更

- **Destructive actions now require a second confirmation**: deleting a
  conversation (sidebar popup and History page) and "Delete from here" both
  open an explicit confirmation dialog first, so a misclick can never wipe
  chat history.

  **破坏性操作现在需要二次确认**：删除会话（侧边栏弹出菜单与历史页）和
  "Delete from here" 都会先弹出明确的确认对话框，手误不会再丢失聊天记录。

- **Bigger message-editing textarea**: the edit field is now at least
  180 px tall on phones (140 px on desktop, up to 60% viewport height) and
  vertically resizable — long messages are no longer edited through a slit.

  **更大的消息编辑文本框**：编辑框在手机上至少 180px 高（桌面 140px，最高
  60% 视口高度）且可垂直拖动调整大小——长消息不再通过一条细缝编辑。

- **Typed notice toasts**: the floating notice now carries a type — green +
  checkmark for success (e.g. "Copied as markdown"), blue + info icon for
  informational notices, red + warning triangle only for real errors. Copying
  a message no longer looks like a failure.

  **按类型区分的提示浮窗**：浮窗现在带有类型——成功（如"Copied as markdown"）
  为绿色 + 对勾，信息提示为蓝色 + info 图标，仅真正的错误使用红色 + 感叹号。
  复制消息不再看起来像失败。

- **Context-trim notice de-noised**: the "Early messages were automatically
  trimmed" notice is informational (blue) instead of an error, and appears at
  most once per conversation per page session — previously every turn of an
  over-cap conversation re-showed the same red toast.

  **上下文裁剪提示降噪**："Early messages were automatically trimmed" 提示
  改为信息样式（蓝色），且每个会话每次页面会话最多出现一次——此前超出上下文
  上限的会话每一轮都会重复弹出同样的红色提示。

## [1.7.0] — 2026-08-10

### Added 新增

- **Google Search grounding footnotes**: answers grounded in Google Search
  results now show inline citation markers at the exact cited spans with a
  clickable source list at the end (title → original link). The full chain:
  `candidates[0].groundingMetadata` is captured from streaming and
  non-streaming Gemini responses, persisted as a new `grounding` block, and
  converted to GFM footnotes at render time via `groundingSupports` segment
  positions. Handles the tricky part discovered against live responses:
  segment indices are **UTF-8 byte offsets**, not JS string indices — they
  are converted before slicing, with a segment-text staleness guard so
  citations can never corrupt edited messages.

  **Google Search 搜索脚注引用**：基于 Google Search 结果的回答现在会在被
  引用片段处显示内联脚注标记，并在末尾提供可点击的来源列表（标题→原始链
  接）。完整链路：从流式/非流式 Gemini 响应捕获
  `candidates[0].groundingMetadata`，持久化为新的 `grounding` block，渲染时
  依据 `groundingSupports` 段落位置转换为 GFM 脚注。处理了实测发现的难点：
  段落索引是 **UTF-8 字节偏移**而非 JS 字符串索引——切片前先转换，并有段落
  文本失效校验，引用永远不会破坏已编辑的消息。

- **Markdown rendering in thinking bubbles**: thought summaries (bold,
  headings, lists, code, links) are now rendered as markdown through the
  same pipeline as normal text, in a muted color scheme — instead of raw
  `**`/`-` characters.

  **思考气泡支持 Markdown 渲染**：思考摘要（粗体、标题、列表、代码、链接）
  现通过与正文相同的渲染管线以柔和配色渲染，不再显示原始的 `**`/`-` 符号。

- **Paste-to-attach in the input box**: images (screenshots), PDF, audio,
  video and text files can now be pasted straight from the clipboard into
  the input box as attachments (Ctrl+V). Nameless clipboard files get a
  timestamped name with the correct extension; plain-text paste is
  unaffected. Type/size validation is shared with upload and drag-and-drop.

  **输入框粘贴附件**：图片（截图）、PDF、音频、视频、文本文件现可直接从剪
  贴板粘贴进输入框作为附件（Ctrl+V）。无名剪贴板文件自动获得带正确扩展名的
  时间戳文件名；纯文本粘贴不受影响。类型/大小校验与上传、拖拽共用同一套逻辑。

### Fixed 修复

- **Footnote markers opened a new tab instead of scrolling**: GFM footnote
  anchors (`#user-content-fn-n`) were rendered with `target="_blank"`,
  re-launching the app in a new tab. In-page anchors are now intercepted and
  smoothly scroll to the cited source within the page.

  **点击正文脚注会新开标签页而非滚动定位**：GFM 脚注锚点此前被加上
  `target="_blank"`，导致在新标签页重新打开应用。页内锚点现被拦截并在当前
  页面平滑滚动到对应来源。

- **Footnote source list is now collapsible and single-line**: citations are
  metadata, not body text — they render inside a collapsed-by-default
  「🌐 Sources 来源引用」 section, with each number and link kept on one line.

  **脚注来源列表可折叠且同行显示**：引用属于元信息而非正文——现渲染在默认
  折叠的「🌐 Sources 来源引用」区域内，序号与链接保持在同一行。

- **Edge-TTS read out markdown punctuation**: text sent to the TTS endpoint
  is now stripped of markdown syntax (heading/emphasis markers, links,
  footnote definitions, table pipes, code fences…) via the new
  `markdownToPlainText` helper, while ordinary punctuation（，。！？等）is
  preserved — the voice no longer reads "asterisk asterisk" or raw URLs.

  **Edge-TTS 会朗读 Markdown 标点**：发送给 TTS 端点的文本现经新增的
  `markdownToPlainText` 去除 Markdown 语法（标题/强调符号、链接、脚注定义、
  表格竖线、代码围栏……），同时保留一般标点（，。！？等）——语音不再读出
  “星号星号”或原始 URL。

- **Footnote navigation was one-way**: the ↩ backref could not scroll back
  to the body citation because the custom link renderer dropped the
  `user-content-fnref-n` id, and clicking a body marker while the source
  list was collapsed did nothing (hidden elements cannot scroll). Link
  attributes are now preserved, anchors open the collapsed 「🌐 Sources
  来源引用」 section before scrolling, and the sr-only footnote heading
  stays hidden.

  **脚注导航只有单向可用**：↩ 回链无法滚回正文引用处（自定义链接渲染丢
  失了 `user-content-fnref-n` id），且来源列表折叠时点击正文脚注无任何反应
  （隐藏元素无法滚动）。现保留链接属性，锚点滚动前先自动展开折叠的「🌐
  Sources 来源引用」区域，脚注标题保持屏幕阅读器可见但视觉隐藏。

## [1.6.1] — 2026-08-09

### Fixed 修复

- **CJK token estimate was ~2.5x too low, so long Chinese conversations were
  never trimmed**: the sliding-window estimator assumed a flat 3
  chars/token, but Gemini-family tokenizers encode CJK at roughly 1 token
  per character (measured 1.39 chars/token on real history). A 670-turn
  Chinese conversation was estimated at ~190K tokens while actually billing
  **~412K input tokens per message** — always under the 800K window, so no
  trimming ever engaged. The estimate is now CJK-aware (~1 token per CJK
  character, ~4 Latin chars per token), slightly conservative on purpose so
  requests never overflow the model's real context window. Also applied to
  the `countTokens` local fallback used when an endpoint does not implement
  that API.

  **中文 token 估算低估约 2.5 倍，长中文会话从不裁剪**：滑动窗口估算器原按
  固定 3 字符/token 计算，而 Gemini 系分词器对中日韩文字约 1 字/token（实测
  1.39 字符/token）。一个 670 轮的中文会话被估算为 ~19 万 token，实际每条
  消息计费 **~41.2 万输入 token**——始终低于 80 万窗口，裁剪从未触发。估算
  现为 CJK 感知（CJK 字符按 ~1 token/字、拉丁字符按 ~4 字符/token），并
  故意略保守以免请求超出模型真实上下文窗口。`countTokens` 端点不支持时的
  本地回退估算同步修正。

### Added 新增

- **Max context tokens setting** (Run Settings panel): caps how much
  conversation history is sent with each message — Model default (full
  window) / 16K / 32K / 64K / 128K / 256K / 512K. When the cap is exceeded,
  older turns are trimmed by the sliding window and recalled on demand via
  RAG memory; output reservation is also clamped so prompt + output always
  fit the capped window. Stored in the new `settings.max_context_tokens`
  column (auto-migrated, default 0 = model default). Live-verified on the
  670-turn conversation that previously billed ~412K input tokens per
  message: with the 32K cap the same conversation now consumes **25,902
  input tokens** per message (~94% reduction).

  **最大上下文 tokens 设置**（运行设置面板）：限制每条消息发送的历史上下文
  量——Model default（完整窗口）/ 16K / 32K / 64K / 128K / 256K / 512K。超出
  上限时较早的对话轮次由滑动窗口裁剪，并通过 RAG 记忆按需检索回忆；输出
  预留同步钳制，确保提示词+输出始终装得进受限窗口。存储于新增的
  `settings.max_context_tokens` 列（自动迁移，默认 0 = 模型默认）。实测：
  此前每条消息计费 ~41.2 万输入 token 的 670 轮会话，设置 32K 上限后同会话
  每条消息仅消耗 **25,902 输入 token**（降幅约 94%）。

## [1.6.0] — 2026-08-09

### Fixed 修复

- **Media attachments consumed ~400x too many tokens**: attachments were sent
  as base64 `inline_data`, which relays and some endpoints bill as *text*
  tokens (~4–5 chars/token) — even a 150KB photo blew up to ~400k tokens
  instead of Gemini's correct media billing (image tiles at 258 tokens each,
  video 263 tokens/s, audio 32 tokens/s, PDF 258 tokens/page). Now **every
  non-text attachment of any size goes through the Gemini Files API** and is
  referenced via `file_data`, so it is always billed as media:
  - Text files stay inline (billed correctly as text anywhere); images /
    video / audio / PDF are uploaded regardless of size
  - Uploads try the resumable protocol first, then a single-request
    **multipart fallback** (`?uploadType=multipart`) which many third-party
    gateways implement instead
  - Endpoints that implement neither are **negative-cached** (they answered
    with HTML, not JSON) so later requests skip straight to the inline
    fallback instead of repeating two wasted round-trips per attachment
  - Files API uploads are **cached by SHA-256 of the file bytes**, so
    rerun/regenerate of the same message never re-uploads identical content
    (replaces the unreliable length+prefix cache key)
  - Last-resort inline fallback when the Files API is truly unavailable
  - Live-verified against `gemini-3.1-flash-lite`: a 1280×960 JPEG consumed
    **1,071 input tokens** (4×768px tiles × 258 + prompt ≈ exactly the media
    formula) instead of ~400k

  **媒体附件 token 消耗高出约 400 倍**：此前附件以 base64 `inline_data`
  发送，部分中继端点按*文本*计费（约 4–5 字符/token）——即使一张 150KB 的
  照片也会膨胀到约 40 万 token，而 Gemini 正确的媒体计费为图片瓦片 258
  token/瓦片、视频 263 token/秒、音频 32 token/秒、PDF 258 token/页。现在
  **除文本文件外，所有媒体无论大小一律走 Gemini Files API** 并以
  `file_data` 引用，确保始终按媒体计费：
  - 文本文件保持内联（任何端点都按文本正确计费）；图片/视频/音频/PDF
    无论大小均上传
  - 上传先尝试 resumable 协议，失败再尝试单次 **multipart 上传**
    （`?uploadType=multipart`），许多第三方网关只实现后者
  - 两种协议都不支持的端点会被**负面缓存**（其返回 HTML 而非 JSON），
    后续请求直接内联回退，不再每个附件重复两次无效往返
  - Files API 上传按文件字节的 **SHA-256 缓存**，rerun/regenerate 同一消息
    不再重复上传相同内容（替换了原先不可靠的“长度+前缀”缓存键）
  - Files API 确实不可用时才最终回退内联
  - 实测（`gemini-3.1-flash-lite`）：一张 1280×960 JPEG 仅消耗 **1,071
    输入 token**（4 个 768px 瓦片 × 258 + 提示词，与媒体计费公式完全吻合），
    而非约 40 万

- **Gemini 3 thinking bubble stayed empty**: Gemini 3 models encrypt the raw
  reasoning trace — the response only carries an opaque `thoughtSignature`
  with no readable text, so the thinking bubble rendered empty even though
  thought tokens were billed. The fix requests a displayable summary via
  `thinkingConfig.includeThoughts = true` (Gemini 3+). Note: the
  `thinkingSummaries` field belongs to the Interactions API / top-level
  `GenerationConfig` and is **silently ignored inside `thinkingConfig`** —
  verified against the live endpoint before adopting `includeThoughts`.
  Thought summary parts (`thought=true` + text) are now captured by the
  existing stream parser and persisted as `thinking` blocks.

  **Gemini 3 思考气泡为空**：Gemini 3 模型对原始推理过程加密——响应只携带
  不透明的 `thoughtSignature` 而无可读文本，导致即便产生了思考 token，思考气泡
  仍渲染为空。修复方式是为 Gemini 3+ 请求可显示的摘要
  （`thinkingConfig.includeThoughts = true`）。注意：`thinkingSummaries` 字段
  属于 Interactions API / 顶层 `GenerationConfig`，放在 `thinkingConfig` 内会
  **被静默忽略**——已在实际端点上验证后才改用 `includeThoughts`。思考摘要
  part（`thought=true` + 文本）现由既有流式解析器捕获并持久化为 `thinking`
  block。

### Added 新增

- **Media resolution setting** (Run Settings panel): caps how many tokens
  media consumes, with options Unspecified / Low / Medium / High / Ultra
  high. On Gemini 3+ models it is applied per content item
  (`MEDIA_RESOLUTION_*` on each media part); older models ignore it safely.
  Recommended: images **High**, PDF **Medium**, video **Low/Medium**. Stored
  in the new `settings.media_resolution` column (auto-migrated).

  **媒体分辨率设置**（运行设置面板）：控制媒体消耗的 token 上限，选项为
  Unspecified / Low / Medium / High / Ultra high。Gemini 3+ 模型会以
  per-content-item 方式应用到每个媒体 part；旧模型安全忽略。推荐：图片
  High、PDF Medium、视频 Low/Medium。存储于新增的 `settings.media_resolution`
  列（自动迁移）。

- **Independent block deletion**: hovering any content block (text, image,
  video, audio, PDF) now reveals a per-block delete button. Deleting a media
  block soft-deletes it via `DELETE /api/blocks/:id` — it disappears from the
  UI, is excluded from every future context build (including rerun attachment
  rebuilds), and its RAG embeddings are removed. Previously media and text in
  a message bubble could only be deleted together.

  **内容块独立删除**：悬停任意内容块（文字、图片、视频、音频、PDF）即可看到
  独立的删除按钮。删除媒体块会通过 `DELETE /api/blocks/:id` 软删除——界面
  即时移除、后续所有上下文构建（含 rerun 附件重建）均不再包含该块，其 RAG
  嵌入同步清理。此前消息气泡中的媒体与文字只能一起删除。

- **Focused tests for media routing** (`tests/gemini-media-routing.test.ts`):
  inline-vs-Files-API routing boundaries and the media_resolution enum gating
  (Gemini 3+ only). 媒体路由聚焦测试：内联/Files API 路由边界与
  media_resolution 枚举门控（仅 Gemini 3+）。

### Changed 变更

- `buildGeminiAttachmentParts()` now takes the target model and the selected
  media resolution level; pure routing helpers `routeGeminiMedia()` and
  `geminiMediaResolutionField()` are exported for testability.
  `buildGeminiAttachmentParts()` 新增模型与媒体分辨率参数；纯函数
  `routeGeminiMedia()` 与 `geminiMediaResolutionField()` 已导出以便测试。

## [1.5.1] — 2026-08-08

### Security 安全

- **Lock screen could be bypassed by opening pages/APIs directly**: the
  password gate was purely client-side — it only covered the UI. Navigating
  straight to `/library` or `/dashboard` rendered the pages, and every
  database-backed API route (including `/api/db-content`, which exposes the
  full database) answered without any authentication, leaking every
  conversation. All verification is now server-side:
  - A correct password earns an httpOnly session cookie
    (`ai_studio_unlock`, HMAC-signed with a per-database secret stored in
    `settings.auth_secret`); the cookie dies with the browser session.
  - Every database-backed API route now calls `requireUnlock()` and returns
    **401** until the cookie is present and valid — no data leaves the
    server before unlock. Exempt: `/api/password` (the gate itself),
    `/api/clear-all` (the lock-screen recovery flow), `/api/docs` and
    `/api/tts` (no database access).
  - A new middleware redirects locked visitors away from `/library`,
    `/dashboard`, `/documentation` and `/prompts/*` back to the lock screen
    (defense in depth; the API 401 guard is the authoritative check).
  - Password verification moved fully to `POST /api/password`; the client no
    longer compares hashes locally. `DELETE /api/password` locks again, and a
    hard page refresh revokes the unlock cookie so the app re-locks as
    before. Once unlocked, switching pages does not ask for the password
    again until refresh or browser exit

  **锁屏密码可被直接绕过**：密码验证此前只存在于前端 UI 层。直接访问
  `/library` 或 `/dashboard` 即可打开页面，且所有数据库 API 路由（包括能
  导出整库的 `/api/db-content`）完全无鉴权，所有对话记录直接暴露。现在
  全部验证在服务端完成：
  - 密码正确后签发 httpOnly 会话 cookie（`ai_studio_unlock`，使用数据库内
    `settings.auth_secret` 密钥做 HMAC 签名），浏览器会话结束即失效
  - 所有数据库 API 路由统一调用 `requireUnlock()` 守卫，解锁前一律返回
    **401**，任何数据都不会在解锁前离开服务端。豁免：`/api/password`
    （门本身）、`/api/clear-all`（锁屏上的恢复流程）、`/api/docs` 与
    `/api/tts`（不访问数据库）
  - 新增 middleware 把锁定状态下的 `/library`、`/dashboard`、
    `/documentation`、`/prompts/*` 页面访问重定向回锁屏（纵深防御，权威
    校验仍是 API 层 401 守卫）
  - 密码比对完全移至 `POST /api/password` 服务端完成，前端不再本地比较
    哈希；`DELETE /api/password` 重新上锁，硬刷新页面会撤销解锁 cookie、
    恢复刷新即锁定的原有行为。解锁成功后切换页面不会重复要求输入密码，
    直到刷新页面或关闭浏览器

### Added 新增

- **Focused test suite for the chat core pipeline** (`npm test`, zero new
  dependencies — Node's built-in test runner with native TypeScript type
  stripping, plus a small `@/*` alias resolver in `tests/register.mjs`):
  - `tests/assistant-persistence.test.ts` — idempotent assistant-message
    persistence (same `messageId` never stored twice) and regenerate
    position-collision shifting
  - `tests/context-window.test.ts` — `MAX(position)+1` position allocation
    (the old `length+1` collision bug) and sliding-window selection
    invariants (system first, newest always survives, oversize skipped)
  - `tests/stream-error-save.test.ts` — partial content generated before a
    stream error is saved exactly once; empty streams leave no message
  - `tests/rag-fallback.test.ts` — RAG config resolution and
    `retrieveMemoriesSafe()` degradation (missing Base URL / unreachable
    endpoint never throws, degrades to plain sliding window)

  **聊天核心管线聚焦测试**（`npm test`，零新增依赖——Node 内置测试运行器
  原生执行 TypeScript，配合 `tests/register.mjs` 中的 `@/*` 别名解析器）：
  覆盖 assistant 消息幂等持久化、position 分配与滑动窗口不变量、流错误时
  的部分内容保存、RAG 失败时的降级处理四个已有修复逻辑

### Changed 变更

- **Database migrations are now visible and idempotent**: `src/lib/db.ts`
  checks each column with `PRAGMA table_info` before running its `ALTER`
  (table-driven `COLUMN_MIGRATIONS` list), so only missing columns are
  changed. A failing migration no longer gets swallowed — it logs a
  `[db] MIGRATION FAILED` block with the failing step, SQL, purpose, cause
  and where to look, then rethrows so startup fails loudly

  **数据库迁移现在可见且幂等**：`src/lib/db.ts` 在执行每条 `ALTER` 前先用
  `PRAGMA table_info` 检查列是否已存在（表驱动的 `COLUMN_MIGRATIONS`
  列表），只执行必要的变更。迁移失败不再被静默吞掉——会输出
  `[db] MIGRATION FAILED` 定位日志（失败步骤、SQL、目的、原因、排查入口）
  并重新抛出，让启动直接失败以暴露问题

## [1.5.0] — 2026-08-08

### Fixed 修复

- **Lock password was per-browser instead of per-deployment**: the app-lock
  password hash was stored in browser `localStorage`, which is scoped to one
  browser on one origin. Set the password while debugging on the server's
  `localhost` and any other device (e.g. reaching the same deployment through
  an intranet tunnel) saw no password at all. The hash now lives in the
  server database (`settings.app_password_hash`, managed by the new
  `GET/PUT /api/password` endpoint), so every device reaching this deployment
  shares the same lock. On first load, a password previously stored in
  `localStorage` is migrated to the server automatically, so existing
  passwords keep working; "Clear Password & Delete All History" resets the
  server-side hash as well

  **锁屏密码只对单个浏览器生效**：锁屏密码哈希此前存储在浏览器
  `localStorage` 中，而 localStorage 按浏览器、按源隔离。在服务器 localhost
  调试时设置的密码，换一台设备（如通过内网穿透 IP 访问同一部署）就完全
  看不到密码锁。哈希现在持久化在服务端数据库（`settings.app_password_hash`，
  由新增的 `GET/PUT /api/password` 接口管理），所有访问该部署的设备共享
  同一把锁。首次加载时会自动把旧的 localStorage 密码迁移到服务端，
  已设置的密码继续有效；“清除密码并删除所有历史”也会同步重置服务端哈希

- **Deleting an API error message wiped the entire conversation**: when a
  chat request failed, the synthetic error message was created client-side
  with `position: -1` (it never exists in the database). Deleting it called
  the truncate endpoint with `from_position = -2`, whose
  `DELETE ... WHERE position > -2` matched every real message and silently
  removed the whole conversation, leaving an empty 0-message shell. Deleting
  normal messages (position ≥ 1) was unaffected. Synthetic error messages
  are now removed locally without calling the truncate API, and the
  `/api/messages/rerun` endpoint rejects negative `from_position` (400) as a
  server-side guard, so no client path can trigger a full-conversation
  truncation again

  **删除接口报错消息会清空整个对话**：AI 请求失败时，前端生成的合成报错
  消息携带 `position: -1`（它从未写入数据库）。删除它会以
  `from_position = -2` 调用截断接口，`DELETE ... WHERE position > -2` 命中
  所有真实消息，整个对话被静默删光，只剩一条 0 message 的空壳会话。
  正常消息（position ≥ 1）的删除不受影响。现在合成的报错消息仅在客户端
  本地移除、不再调用截断接口；同时 `/api/messages/rerun` 在服务端拒绝
  负数 `from_position`（400）作为守卫，任何客户端路径都无法再触发全对话
  截断

- **Every chat request failed with a 400 over malformed safety settings**:
  the request builder mapped each setting with `category: s.type`, but legacy
  database rows store the old shape `{ category: "HARM_CATEGORY_*", threshold }`,
  so `category` came out `undefined` and was dropped from the JSON payload.
  Even new-format rows sent lowercase enum values (`"harassment"`, `"off"`),
  which the Gemini API rejects — it strictly requires SCREAMING_SNAKE enums
  (`HARM_CATEGORY_HARASSMENT`, `OFF`). Both shapes are now normalized at
  request time into the canonical format (`category` + uppercase enums, for
  streaming and non-streaming alike), and `/api/settings` normalizes legacy
  rows on read and write, so the safety dialog displays them correctly too

  **每次聊天请求都因 safety settings 格式错误返回 400**：请求构造器以
  `category: s.type` 映射每条设置，但旧版数据库行存储的是旧格式
  `{ category: "HARM_CATEGORY_*", threshold }`，`s.type` 为 `undefined`，
  序列化后 `category` 字段直接从请求体中丢失；即便是新格式行，发出的也是
  小写枚举值（`"harassment"`、`"off"`），而 Gemini API 严格要求大写枚举
  （`HARM_CATEGORY_HARASSMENT`、`OFF`）。现在流式与非流式路径在构造请求时
  都会把两种旧格式统一规范化为标准格式（`category` + 大写枚举）；
  `/api/settings` 在读写时也会规范化旧数据行，安全设置对话框能正确显示

- **Images were never sent to OpenAI-compatible endpoints**: the OpenAI
  request builder emitted every message as a plain string content, silently
  dropping image attachments, so vision models always answered "no image
  provided". User messages with image attachments are now built as the
  multimodal content-part array (`image_url` parts carrying the base64 data
  URL, followed by the text part), for both streaming and non-streaming
  requests; the Gemini protocol (inline_data) is unchanged

  **OpenAI 协议下 AI 看不到图片**：OpenAI 请求构造器把每条消息都序列化为
  纯字符串 content，图片附件被静默丢弃，导致视觉模型总是回答"您没有提供
  图片"。现在携带图片附件的用户消息会构造为多模态 content 数组
  （`image_url` 部分携带 base64 data URL，后接文本部分），流式与非流式
  请求均生效；Gemini 协议（inline_data）不受影响

- **Image/video bubbles only appeared after the AI finished replying**: the
  optimistic user message shown at send time contained only the text block —
  attachment blocks were added by the final reload after generation, so the
  message visibly re-arranged itself. Attachment blocks are now part of the
  optimistic message (same negative-position convention as the database) and
  render immediately. Additionally, image blocks previously rendered as a
  truncated `data:image/...` text link — they now show a real thumbnail with
  click-to-enlarge preview, and video blocks render an inline playable
  player; sending attachments without any text is now possible too

  **图片/视频气泡在 AI 回复完成后才出现**：发送时立即展示的乐观用户消息
  只包含文本块，附件块要等生成结束后的重新加载才出现，导致消息在界面上
  "事后变形"。现在乐观消息直接携带附件块（与数据库一致的负位置约定），
  发送后立即渲染。另外，图片块此前只显示为截断的 `data:image/...` 文字
  链接，现在改为真实缩略图并支持点击放大预览；视频块渲染为可播放的
  内联播放器；仅附件不带文字的消息也能正常发送了

- **Rerun / regenerate of a message with attachments lost the attachments**:
  the rerun flow calls `/api/chat` without an `attachments` field, and the
  chat route only reconstructed text blocks from the database, so the model
  answered blind ("I can't see any image"). When a request carries no new
  attachments, the route now rebuilds them from the saved media blocks
  (image/video/audio/pdf/file) of the user message being re-answered, for
  both streaming and non-streaming paths and both protocols. Attachment-only
  user messages (no text) are now also included in the context so they can
  be re-run correctly, and this also fixes a duplicate `[Audio: ...]`
  placeholder bubble created by a legacy workaround in the input box

  **重跑（Rerun）带附件的消息时附件丢失**：重跑流程调用 `/api/chat` 时
  不携带 `attachments` 字段，而聊天路由只从数据库重建文本块，导致模型
  "看不见"图片。现在当请求没有携带新附件时，路由会从被重新回答的用户
  消息已保存的媒体块（image/video/audio/pdf/file）重建附件，流式与非流式
  路径、两种协议均生效。纯附件（无文字）的用户消息现在也会进入上下文，
  因此同样可以正确重跑；同时移除了输入框中遗留的 `[Audio: ...]` 占位
  消息逻辑，该逻辑此前会造成重复的用户气泡

- **Only images were ever sent to the model; video/audio/PDF were dropped**:
  the Gemini request builder attached only `image/*` files as `inline_data`,
  and the database never persisted audio blocks (recordings were only kept
  as the removed placeholder message). Following the Gemini API Files
  documentation, the Gemini path now supports the full media matrix:
  image, video, audio, PDF and text files. Media at or below 15MB is sent
  inline (`inline_data`); larger files (e.g. videos up to the 50MB upload
  limit) are uploaded through the Gemini Files API (resumable upload,
  polled until ACTIVE, cached for reuse on rerun) and referenced via
  `file_data`. The upload menu additionally accepts PDF and text files,
  audio/PDF/text blocks are persisted, and the chat renders audio as a
  playable player and PDF/text files as downloadable chips. OpenAI
  protocol keeps image-only support (its chat-completions API has no
  generic inline media part)

  **只有图片会发给模型，视频/音频/PDF 被丢弃**：Gemini 请求构造器此前
  只把 `image/*` 附件以 `inline_data` 发送，数据库也从未保存音频块
  （录音只以已移除的占位消息形式存在）。依照 Gemini API Files 官方文档，
  Gemini 路径现在支持完整媒体矩阵：图片、视频、音频、PDF 和文本文件。
  15MB 及以下的媒体以内联方式（`inline_data`）发送；更大的文件（如不超过
  50MB 上传上限的视频）通过 Gemini Files API 上传（断点续传协议、轮询
  直至 ACTIVE、缓存以便重跑复用），以 `file_data` 引用。上传菜单新增支持
  PDF 与文本文件，音频/PDF/文本块会持久化到数据库，聊天界面将音频渲染为
  可播放播放器、PDF/文本文件渲染为可下载卡片。OpenAI 协议保持仅图片
  （其 chat-completions API 没有通用的内联媒体部分）

### Added 新增

- **Live waveform while recording audio**: the microphone button previously
  gave feedback only through an icon change. Recording now shows a floating
  panel to the left of the mic button with a pulsing red indicator, a live
  frequency-bar waveform drawn from the microphone stream (Web Audio
  `AnalyserNode` + canvas), and an elapsed-time counter. If audio analysis
  is unavailable the recording itself still works unchanged

  **录音时显示实时波形浮窗**：麦克风按钮此前只有图标变化作为反馈。现在
  录音期间会在按钮左侧显示浮窗，包含红色闪烁指示点、基于麦克风音频流
  （Web Audio `AnalyserNode` + canvas）实时绘制的频谱波形条，以及录音
  时长计时。若音频分析不可用，录音功能本身不受影响

- **Version number shown in the Settings popover**: the Settings popover now
  displays the current app version at its very bottom, read directly from
  `package.json`. Clicking it opens the corresponding release tag of this
  repository on GitHub in a new tab

  **设置浮窗底部显示版本号**：设置浮窗最下方现在显示当前应用版本号
  （直接读取自 `package.json`），点击可在新标签页打开仓库中该版本
  对应的 release tag

## [1.2.0-patch1] — 2026-08-07

### Fixed 修复

- **Gemini 3 thinking configuration**: Gemini 3 series models (e.g.
  `gemini-3-pro-preview`, `gemini-3.5-flash-lite`) reject the
  2.5-style `thinkingConfig.thinkingBudget` with a 400
  INVALID_ARGUMENT. The Gemini adapter now dispatches on the model's
  major version: Gemini 3+ receives `thinkingConfig.thinkingLevel`
  (LOW / HIGH) while the 2.5 series keeps the token budget

  **Gemini 3 思考配置**：Gemini 3 系列模型（如 `gemini-3-pro-preview`、`gemini-3.5-flash-lite`）会拒绝 2.5 风格的 `thinkingConfig.thinkingBudget` 并返回 400 INVALID_ARGUMENT。Gemini 适配器现在按模型主版本号分发：Gemini 3+ 发送 `thinkingConfig.thinkingLevel`（LOW / HIGH），2.5 系列仍使用 token 预算

- **Token counter always reads "not available"**: per-message token usage
  was only kept in client-side session state, so it vanished on page
  reload, conversation switching or the popover's "Try refreshing"
  (which clears the state and rebuilds it from the database, where
  `token_count` was never written). The chat endpoint now persists the
  reported usage into `messages.token_count` (user message = input
  tokens, assistant message = output + thinking tokens), so the header
  counter survives reloads for every conversation, streaming and
  non-streaming alike

  **Token 计数始终显示"不可用"**：单条消息的 token 用量此前只保存在客户端会话状态中，页面刷新、切换会话或点击弹窗里的 "Try refreshing"（该操作会清空状态并从数据库重建，而数据库从未写入 `token_count`）后就会丢失。聊天接口现在会把上报的用量持久化到 `messages.token_count`（用户消息 = 输入 token，助手消息 = 输出 + 思考 token），流式与非流式路径均生效，刷新页面后头部计数器依然准确

- **Token breakdown lost after refresh**: only a single aggregate
  `token_count` was persisted per message, so clicking "Try refreshing"
  (or reloading the page) collapsed the per-message stats — `In` dropped
  to 0, the `Think` line vanished and its tokens were folded into `Out`.
  The `messages` table now carries `input_tokens` / `output_tokens` /
  `thought_tokens`, and every chat turn (streaming, non-streaming and
  the mid-stream failure path) persists the full per-turn breakdown on
  the assistant message, attributed exactly like the live done-event
  usage (`total = input + output + thoughts`). Rebuilding usage from the
  database now restores the identical In/Out/Think/Total figures with no
  double counting in the header total. Conversation copy/branch carry
  the new columns over, and editing a message invalidates them together
  with `token_count`. Conversations generated before this patch only
  stored the aggregate and keep the old coarse display (the split data
  was never recorded, so it cannot be recovered).

  **刷新后 token 明细丢失**：此前每条消息只落库一个聚合值 `token_count`，
  点击 "Try refreshing"（或刷新页面）从数据库重建后，单条消息的 `In` 变 0、
  `Think` 行消失且其 token 被并入 `Out`。`messages` 表新增
  `input_tokens` / `output_tokens` / `thought_tokens` 三列，每轮对话（流式、
  非流式与中途中断路径）都会把完整拆分写入助手消息，归属口径与生成时
  done 事件的 usage 完全一致（total = 输入 + 输出 + 思考），重建后恢复与
  生成完毕时完全相同的 In/Out/Think/Total，且头部总量不重复计数。会话
  复制/分支同步携带新列，编辑消息时与 `token_count` 一并作废。本补丁之前
  生成的会话只有聚合值，仍按旧的粗粒度显示（当时未记录拆分，无法恢复）。

- **Data-persistence audit fixes** (data that was generated but never
  written to the database):
  - Copying / branching a conversation now carries `token_count` over to
    the duplicated messages (previously reset to 0)
  - `usage_stats.api_config_id` is now linked to the saved API config
    with the same Base URL, and that config's `last_used_at` is
    refreshed on every request — the Dashboard's "Last used" label and
    the per-config usage filter now work as intended
  - `usage_stats.conversation_count` is recorded for each conversation's
    first request, so the Usage dashboard's "Conversations" card shows a
    real number instead of a permanent 0
  - Streaming: when a generation fails mid-stream or the client
    disconnects, the already-generated partial reply (thinking + text +
    tool results) and its usage are persisted instead of being lost
  - Deleting a block or deleting a conversation via the Database Status
    page now also purges the affected RAG vectors (previously stale
    embeddings could still be retrieved)
  - Editing a message resets its stored `token_count` (the old figure
    described the pre-edit content)
  - "Clear all data" now resets every settings column, including the
    newer Top-P / Top-K / Output length / stop sequences / structured
    output / function declarations / RAG fields

  **数据持久化审计修复**（已产生但从未写入数据库的数据）：
  - 复制 / 分支会话现在会保留被复制消息的 `token_count`（此前被重置为 0）
  - `usage_stats.api_config_id` 现在会关联到相同 Base URL 的已保存 API 配置，且每次请求都会刷新该配置的 `last_used_at`——仪表盘 "Last used" 显示与按配置筛选用量统计真正生效
  - 会话首次请求会记录 `usage_stats.conversation_count`，用量仪表盘的 "Conversations" 卡片不再恒为 0
  - 流式生成：生成中途失败或客户端断开时，已生成的部分回复（思考 + 正文 + 工具结果）及其用量会被持久化，不再丢失
  - 删除单个 block、以及通过数据库状态页删除会话时，会同步清理对应的 RAG 向量（此前陈旧向量仍可能被检索到）
  - 编辑消息后重置其 `token_count`（旧数值对应的是编辑前的内容）
  - "清空所有数据" 现在会重置全部设置列，包括较新的 Top-P / Top-K / Output length / stop sequences / 结构化输出 / 函数声明 / RAG 字段

### Notes 说明

- **Gemini 3 thinking text is not displayed by API design**: the Gemini
  3 series returns thoughts only as an encrypted, opaque
  `thoughtSignature` — no readable thought text is exposed (verified
  live: even with `includeThoughts: true` the stream carries only the
  signature, while `thoughtsTokenCount` confirms thinking occurred).
  Thought tokens are therefore counted (`Think` line) but no thinking
  block can be rendered for Gemini 3 models; Gemini 2.5 thinking text
  is unaffected.

  **Gemini 3 不显示思考文本是官方接口设计**：Gemini 3 系列只以加密的
  `thoughtSignature` 返回思考过程，不对外提供可读文本（已实测：即使携带
  `includeThoughts: true`，流里也只有签名，而 `thoughtsTokenCount` 证明
  思考确实发生）。因此思考 token 正常计数（`Think` 项），但 Gemini 3
  模型无法渲染思考内容块；Gemini 2.5 的思考文本不受影响。

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

[1.7.2]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.7.2
[1.7.1]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.7.1
[1.7.0]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.7.0
[1.6.1]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.6.1
[1.6.0]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.6.0
[1.5.1]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.5.1
[1.5.0]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.5.0
[1.2.0-patch1]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.2.0-patch1
[1.2.0]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.2.0
[1.1.0]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.1.0
[1.0.0]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.0.0
