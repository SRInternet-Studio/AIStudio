# 模块职责与功能说明

本文档详细说明 AIStudio 各核心模块的职责、导出接口以及模块间的交互关系，帮助开发者快速定位代码与理解业务逻辑。

## 1. 核心库模块 (`src/lib/`)

### 1.1 `db.ts` - 数据库层
- **职责**: 管理本地 SQLite 数据库的连接、表结构初始化、Schema 迁移及通用查询操作。
- **关键导出**:
  - `getDb()`: 获取数据库客户端单例，自动执行建表与迁移。
  - `queryOne(sql, params)`: 查询单行记录。
  - `queryAll(sql, params)`: 查询多行记录。
  - `execute(sql, params)`: 执行写操作（INSERT/UPDATE/DELETE）。
- **数据表**: `settings`, `conversations`, `messages`, `blocks`, `system_templates`, `api_configs`, `usage_stats`, `custom_models`, `message_embeddings`。
- **交互**: 被所有 API 路由及 `auth.ts`, `rag.ts` 等模块依赖。

### 1.2 `api-client.ts` - API 客户端
- **职责**: 封装与 LLM 供应商（Gemini / OpenAI）的通信协议，支持流式/非流式请求、多模态附件上传、工具调用及 Token 统计。
- **关键导出**:
  - `sendChatRequest()`: 发送普通聊天请求。
  - `sendChatRequestStream()`: 发送流式聊天请求，通过回调处理 SSE 事件。
  - `buildToolConfig()`: 构建工具调用与结构化输出配置。
  - `countTokens()`: 调用 API 或本地估算 Token 数量。
  - `routeGeminiMedia()`: 决定媒体附件走 Files API 还是 inline_data。
- **交互**: 被 `/api/chat` 路由调用，依赖 `context-manager.ts` 进行 Token 估算。

### 1.3 `auth.ts` - 认证与授权
- **职责**: 实现服务端应用锁密码验证机制，通过 HMAC-SHA256 签名 httpOnly Cookie 保护数据库 API 路由。
- **关键导出**:
  - `requireUnlock(request)`: 路由守卫，未解锁时返回 401。
  - `isUnlockedRequest(request)`: 检查请求是否已解锁。
  - `issueUnlockCookie(response)`: 解锁成功后签发 Cookie。
  - `clearUnlockCookie(response)`: 清除解锁状态。
- **交互**: 被所有涉及数据库读写的 API 路由作为前置守卫调用。

### 1.4 `rag.ts` - RAG 长期记忆
- **职责**: 实现检索增强生成（RAG），支持 API 和本地 ONNX 两种嵌入源，提供文本分块、向量索引、余弦相似度检索及优雅降级。
- **关键导出**:
  - `resolveRagConfig()`: 从设置中解析 RAG 配置。
  - `embedTexts()`: 批量向量化文本。
  - `ensureIndexed()`: 懒索引消息到向量存储。
  - `retrieveMemoriesSafe()`: 安全检索相关记忆，失败时静默降级。
  - `deleteEmbeddingsForMessages()`: 清理过期向量。
- **交互**: 被 `/api/chat` 路由在上下文裁剪后调用，依赖 `db.ts` 存储向量。

### 1.4 `grounding.ts` - 联网引用（Grounding）
- **职责**: 把 Gemini `groundingMetadata` 转为 GFM 脚标，生成引用锚点。
- **关键导出**:
  - `insertGroundingFootnotes(text, metadata, namespace?)`: 在渲染时为被引用的片段插入脚标并追加来源列表。第三个参数是消息 id 命名空间。
  - `footnoteNamespace(messageId)` / `footnoteLabel(ns, n)`: 生成合法的 GFM 脚标标签。
- **锚点唯一性**: remark-gfm 由脚标标签推导 DOM id，而脚标编号是消息内序号，因此标签按消息 id 命名空间化，得到全局唯一的 `user-content-fn-<消息ID>-<编号>`。
- **向后兼容**: 不传 `namespace` 时标签保持纯数字。元数据以原始 JSON 存库、脚标渲染时生成，故存量消息无需迁移。

### 1.5 `context-manager.ts` - 上下文管理
- **职责**: CJK 感知的 Token 估算、滑动窗口裁剪、上下文预算拆分、自动朗读决策。
- **关键导出**:
  - `estimateTokens(text)`: CJK 感知 Token 估算（中文 0.75 token/字，拉丁 4 chars/token）。常数按实测分词器密度（1.39 字符/token）校准并保留安全余量。
  - `resolveContextBudget()`: 把窗口拆成 prompt / output / RAG 三份，三者之和永不超过窗口。
  - `buildApiMessagesWithSlidingWindow()`: 构建带滑动窗口的 API 消息列表。
  - `calculateCurrentContextTokens()`: 计算当前会话的上下文 Token 使用量。
  - `shouldAutoReadReply()`: 判断是否应触发自动朗读。
- **交互**: 被 `api-client.ts` 和 `/api/chat` 路由依赖。

### 1.6 其他 Lib 模块
| 模块 | 职责 |
| :--- | :--- |
| `models.ts` | 模型白名单、自定义模型合并、默认模型配置 |
| `media-compress.ts` | 客户端图片有损压缩（Canvas API） |
| `tts-text.ts` | TTS 文本预处理（代码块过滤、Markdown 清洗） |
| `grounding.ts` | Google Search Grounding 引用解析与脚注生成 |
| `chat-persistence.ts` | 聊天记录持久化操作封装 |
| `context-io.ts` | 上下文导入/导出（JSON 格式） |
| `utils.ts` | 通用工具函数（cn class merge 等） |
| `version.ts` | 版本号常量 |
| `auth-constants.ts` | Cookie 名称等认证常量 |

## 2. 状态管理 (`src/store/`)

### `chatStore.ts` - 全局状态 Store
- **职责**: 使用 Zustand 管理应用全部状态，包括会话列表、消息、设置、UI 开关、流式状态、TTS、仪表盘等。
- **设计模式**: "God Store" 单 Store 模式，约 40+ state 字段及对应 setter actions。
- **关键 State**:
  - `conversations`, `currentConversation`: 会话管理
  - `messages`: 当前消息列表
  - `settings`: 用户设置（API、模型、安全、RAG 等）
  - `isChatActive`, `isSettingsOpen`: UI 状态
  - `apiConfigs`, `usageStats`: 仪表盘数据
- **交互**: 被所有 React 组件通过 hooks 消费。

## 3. 类型定义 (`src/types/`)

### `index.ts` - 全局类型
- **职责**: 定义所有 TypeScript 接口与类型别名。
- **关键类型**: `ChatMessage`, `Message`, `Block`, `Conversation`, `Settings`, `ToolsConfig`, `SafetySetting`, `GeminiTool`, `InteractionResponse`, `GroundingMetadata` 等。
- **交互**: 被全项目引用。

## 4. 组件层 (`src/components/`)

| 子目录 | 职责 | 关键组件 |
| :--- | :--- | :--- |
| `chat/` | 聊天核心交互 | `InputBox`, `MessageList`, `ContentBlock`, `ThinkingBlock`, `ImageBlock` |
| `layout/` | 页面布局与导航 | `MainLayout`, `Sidebar`, `RunSettingsPanel`, `PasswordGate` |
| `settings/` | 设置面板 | `SettingsDialog`, `ModelSelector`, `SafetySettings` |
| `dashboard/` | 仪表盘视图 | `DashboardPage`, `UsageChart`, `ApiConfigManager` |
| `documentation/` | 文档浏览 | `DocumentationPage`, `DocViewer` |
| `ui/` | 基础 UI 原子 | Button, Dialog, Select, Slider, Tooltip (Radix UI 封装) |

## 5. API 路由层 (`src/app/api/`)

| 路由 | 方法 | 职责 |
| :--- | :--- | :--- |
| `/api/chat` | POST | 核心聊天接口，组装上下文、调用 LLM、流式返回 |
| `/api/conversations` | GET/POST | 会话列表查询与创建 |
| `/api/conversations/[id]` | GET/PUT/DELETE | 单个会话 CRUD |
| `/api/messages` | GET/POST | 消息查询与创建 |
| `/api/messages/rerun` | POST | 重新生成回复 |
| `/api/blocks` | GET/POST | 消息块 CRUD |
| `/api/settings` | GET/PUT | 用户设置读写 |
| `/api/models` | GET | 可用模型列表 |
| `/api/password` | POST | 密码验证与解锁 |
| `/api/tts` | POST | TTS 语音合成 |
| `/api/system-templates` | GET/POST/PUT/DELETE | 系统提示词模板管理 |
| `/api/api-configs` | GET/POST/PUT/DELETE | 多 API 配置管理 |
| `/api/usage-stats` | GET | 使用统计查询 |
| `/api/db-content` | GET | 数据库内容导出（需解锁） |
| `/api/db-stats` | GET | 数据库状态信息 |
| `/api/clear-all` | POST | 清除所有数据（需确认） |
| `/api/docs` | GET | 文档内容查询 |

---

> 最后更新时间：2026-09-09