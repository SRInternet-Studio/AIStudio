# 技术架构与设计理解

本文档深入解析 AIStudio 的技术架构、核心设计模式、数据流以及安全机制，帮助开发者从宏观到微观全面理解系统运作原理。

## 1. 系统架构概览

AIStudio 采用 Next.js 16 App Router 架构，前后端代码统一于 `src/` 目录下。整体架构分为以下几个核心层：

- **表现层 (UI Layer)**: 基于 React 18 和 Tailwind CSS 构建的组件树，位于 `src/components/`。
- **状态管理层 (State Layer)**: 基于 Zustand 的全局状态管理，位于 `src/store/`。
- **业务逻辑层 (Logic Layer)**: 包含 RAG、上下文管理、认证等核心逻辑，位于 `src/lib/`。
- **接口层 (API Layer)**: Next.js Route Handlers，位于 `src/app/api/`。
- **数据层 (Data Layer)**: 基于 SQLite 和 Drizzle ORM 的本地持久化方案。

## 2. 核心设计模式

### 2.1 协议无关模式 (多模型 API 兼容)
在 `src/lib/api-client.ts` 中，系统通过协议抽象层（`protocol === "openai"` 或默认 Gemini）将内部统一的消息格式转换为不同供应商所需的请求体格式。
- `toOpenAIFormat()`: 将内部消息转换为 OpenAI 兼容格式，支持工具调用 (`tools`) 和结构化输出 (`response_format`)。
- 原生 Gemini 格式转换: 处理 `SafetySetting`、`ToolsConfig` 等特有参数。

### 2.2 状态管理模式 (Zustand Store)
使用 Zustand 进行轻量级状态管理（如 `src/store/chatStore.ts`），避免了传统 Redux 的样板代码。Store 负责管理聊天记录、当前会话状态、UI 交互状态等，并通过 selectors 优化组件重渲染。

### 2.3 策略模式 (RAG 检索与降级)
在 `src/lib/rag.ts` 中实现了 RAG 策略，支持通过 API Embeddings 或本地 ONNX 模型进行向量化，并包含完整的降级机制 (`rag-fallback`) 以确保在嵌入模型不可用时系统的稳定性。

## 3. 核心数据流

### 3.1 聊天对话流
1. 用户在 `InputBox` 输入消息，触发 `chatStore` 更新。
2. 前端调用 `/api/chat` 路由。
3. API 路由读取数据库中的历史记录与设置（通过 `db.ts`）。
4. 调用 `context-manager.ts` 计算 Token 数量并进行滑动窗口裁剪，防止超出模型上下文限制。
5. `api-client.ts` 组装请求，通过 `undici` 发起带 `ProxyAgent` 的网络请求。
6. 后端以 SSE (Server-Sent Events) 形式流式返回数据，前端逐字渲染。

### 3.2 上下文与 Token 管理
`src/lib/context-manager.ts` 实现了 CJK 感知的 Token 估算，并在滑动窗口机制中自动裁剪旧历史消息，确保发送给大模型的 Prompt 始终在安全阈值内。

**窗口边界精度**：估算常数按实测分词器密度校准（中文 0.75 token/字）。滑动窗口依据本地估算裁剪，常数偏高会直接吃掉用户可用预算，因此校准误差需控制在 ±15% 内。

**显式预算拆分**：`resolveContextBudget()` 把窗口拆成三份，三者之和永不超过窗口：

| 份额 | 取值 | 说明 |
| :--- | :--- | :--- |
| `promptTokens` | 剩余部分 | 历史消息 + 系统提示可占用的上限 |
| `outputTokens` | `min(max_output_tokens, 窗口 × 12.5%)` | 提供商把 prompt 与 completion 计入同一窗口 |
| `ragTokens` | `min(窗口 × 10%, 8192)` | RAG 召回内容注入系统提示，同样占窗口 |

**整史 Token 计数**：前端按页增量加载消息（默认 50 条）以控制内存，顶栏计数器因此不能只统计已挂载消息。`GET /api/conversations/[id]` 在分页时额外返回 `fullContextEstimate`——对**全部**消息的文本块按「消息内 join 后估算一次」求和，排除媒体与 grounding 块。客户端以该值为基线，与已挂载页面取较大值。

### 3.3 流式结束交接
流式气泡是 `isStreaming` 标志的纯渲染产物：流结束即卸载，而落库与回载都是异步的，期间最新回复在 UI 中不存在。`buildOptimisticAssistantMessage()` 在清除流式状态前把累积缓冲提升为一条普通消息，`applyDbMessages()` 在持久行（同文本）落地后按内容去重替换，保证回复连续可见且不重复。

### 3.4 联网引用锚点
`groundingMetadata` 以原始 JSON 存入 `grounding` 块，脚标在**渲染时**由 `insertGroundingFootnotes()` 生成，因此文本块内容不被修改，存量引用也无需数据迁移。

remark-gfm 由脚标标签推导 DOM id，而脚标编号是消息内序号，故标签按消息 id 命名空间化：

| 元素 | id / href |
| :--- | :--- |
| 正文脚标链接 | `user-content-fnref-<消息ID>-<编号>` |
| 来源列表项 | `user-content-fn-<消息ID>-<编号>` |
| ↩ 回链 | 指向本条消息的 fnref id |

`footnoteNamespace()` 会清洗消息 id 中不能出现在 GFM 标签里的字符（空白、方括号等）；标签畸形会导致 remark-gfm 丢弃整条引用。乐观消息与流式气泡使用合成 id 或尚无引用块，均不影响唯一性。

## 4. 安全与鉴权机制

- **API 密钥管理**: 通过 `src/lib/auth.ts` 处理用户凭证，支持 Bearer Token 和 `x-goog-api-key` 等头部注入。
- **输入校验**: 在 `api-client.ts` 中使用 `sanitizeModelId()` 对 URL 路径中的模型 ID 进行清洗，防止路径遍历攻击。
- **环境变量隔离**: 敏感配置严格存放于 `.env.local`，不提交至版本控制。

## 5. 错误处理与日志

系统在各个层级添加了 `console.log` 用于调试（如 `[api-client] OpenAI URL:`）。在生产环境中，建议接入统一的日志收集平台。针对网络异常，`stream-error-save` 测试用例确保了流式中断时聊天记录的完整性保存。

---

> 最后更新时间：2026-10-26