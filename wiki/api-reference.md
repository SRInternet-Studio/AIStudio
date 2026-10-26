# API 文档与接口规范

本文档详细说明 AIStudio 所有后端 API 端点的请求/响应格式、认证要求及错误处理机制。

## 通用说明

### 基础信息
- **Base URL**: `/api` (Next.js Route Handlers)
- **数据格式**: JSON (`Content-Type: application/json`)
- **认证方式**: httpOnly Cookie（应用锁密码验证）

### 认证机制
除 `/api/password` 外，所有涉及数据库读写的 API 路由均需通过 `requireUnlock()` 守卫验证：
- 未设置密码时：所有请求自动放行
- 已设置密码时：需携带有效的解锁 Cookie（HMAC-SHA256 签名）
- 未认证请求返回 `401 Unauthorized`

### 错误响应格式
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

---

## 核心接口

### POST /api/chat
**核心聊天接口**，组装上下文、调用 LLM、流式返回结果。

**请求体**:
```json
{
  "conversationId": "uuid",
  "message": "用户消息内容",
  "attachments": [
    {
      "data_url": "data:image/png;base64,...",
      "mime_type": "image/png",
      "name": "image.png"
    }
  ]
}
```

**响应**: Server-Sent Events (SSE) 流
- `data: {"type":"text","text":"..."}` - 文本输出
- `data: {"type":"thinking","text":"..."}` - 思考过程
- `data: {"type":"tool_result","toolResult":{...}}` - 工具调用结果
- `data: {"type":"grounding","grounding":{...}}` - Grounding 引用
- `data: {"type":"usage","usage":{...}}` - Token 使用统计
- `data: {"type":"done"}` - 流结束标记

**关键逻辑**:
1. 读取会话历史与设置（通过 `db.ts`）
2. 计算 Token 并执行滑动窗口裁剪（`context-manager.ts`）
3. RAG 检索相关记忆（`rag.ts`）
4. 构建请求并调用 LLM（`api-client.ts`）
5. 流式返回结果，同时持久化到数据库

---

### GET/POST /api/conversations
**会话列表查询与创建**

**GET 响应**:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "会话标题",
      "model": "gemini-2.5-pro",
      "created_at": "2026-09-09T10:00:00Z",
      "updated_at": "2026-09-09T10:30:00Z"
    }
  ]
}
```

**POST 请求体**:
```json
{
  "title": "新会话",
  "model": "gemini-2.5-pro"
}
```

---

### GET/PUT/DELETE /api/conversations/[id]
**单个会话 CRUD**

- **GET**: 获取会话详情及消息列表
- **PUT**: 更新会话标题/模型
- **DELETE**: 删除会话及其所有消息

---

### GET/POST /api/messages
**消息查询与创建**

**GET 参数**: `?conversationId=uuid`

**POST 请求体**:
```json
{
  "conversationId": "uuid",
  "role": "user",
  "content": "消息内容",
  "blocks": [...]
}
```

---

### POST /api/messages/rerun
**重新生成回复**

**请求体**:
```json
{
  "conversationId": "uuid",
  "messageId": "要重新生成的消息ID"
}
```

---

### GET/PUT /api/settings
**用户设置读写**

**GET 响应** / **PUT 请求体**:
```json
{
  "base_url": "https://generativelanguage.googleapis.com",
  "api_key": "",
  "api_protocol": "gemini",
  "selected_model": "gemini-2.5-pro",
  "system_instructions": "",
  "temperature": 1,
  "top_p": 0.95,
  "top_k": 64,
  "max_output_tokens": 65536,
  "thinking_level": "minimal",
  "tools_config": {...},
  "safety_settings": [...],
  "proxy_url": "",
  "rag_enabled": 1,
  "rag_provider": "api",
  "rag_embedding_model": "",
  "rag_top_k": 5,
  "app_password_hash": "",
  "compress_media": 0,
  "media_resolution": "unspecified",
  "max_context_tokens": 0
}
```

---

### GET /api/models
**可用模型列表**

**响应**:
```json
{
  "models": [
    {
      "id": "gemini-2.5-pro",
      "display_name": "Gemini 2.5 Pro",
      "category": "Google",
      "context_window": 1000000
    }
  ]
}
```

---

### POST /api/password
**密码验证与解锁**

**请求体**:
```json
{
  "password": "用户输入的密码"
}
```

**成功响应**: 设置 httpOnly Cookie 并返回 `{ success: true }`

---

### POST /api/tts
**TTS 语音合成**

**请求体**:
```json
{
  "text": "要朗读的文本",
  "voice": "zh-CN-XiaoxiaoNeural"
}
```

**响应**: 音频流 (`audio/mpeg`)

---

### GET /api/conversations/{id}
**会话详情（含分页消息）**

**查询参数**:
| 参数 | 说明 |
| :--- | :--- |
| `limit` | 分页大小。省略时返回全部消息（含 blocks） |
| `before_position` | 与 `limit` 配合，加载更早的一批 |

**响应**:
```json
{
  "success": true,
  "data": {
    "conversation": { "id": "…", "title": "…" },
    "messages": [{ "id": "…", "role": "user", "position": 1, "blocks": [] }],
    "hasMore": true,
    "oldestPosition": 1326,
    "tokenCounts": [{ "id": "…", "role": "user", "token_count": 12 }],
    "fullContextEstimate": 999902
  }
}
```

- `messages`：当前分页内的消息，**含 blocks**（重内容）。
- `tokenCounts`：全部消息的轻量 token 字段，**不含 blocks**。
- `fullContextEstimate`：整段历史的 CJK 感知 token 估算，仅在传 `limit` 时返回。顶栏计数器以此为基线，无需把所有消息驻留内存。

---

### GET/POST/PUT/DELETE /api/system-templates
**系统提示词模板管理**

---

### GET/POST/PUT/DELETE /api/api-configs
**多 API 配置管理**（仪表盘功能）

---

### GET /api/usage-stats
**使用统计查询**

**响应**:
```json
{
  "stats": [
    {
      "date": "2026-09-09",
      "input_tokens": 10000,
      "output_tokens": 5000,
      "request_count": 20
    }
  ]
}
```

---

### GET /api/db-content
**数据库内容导出**（需解锁）

用于备份/迁移，返回完整数据库内容的 JSON 格式。

---

### GET /api/db-stats
**数据库状态信息**

返回表记录数、文件大小等统计信息。

---

### POST /api/clear-all
**清除所有数据**（需确认）

**请求体**:
```json
{
  "confirm": true
}
```

⚠️ **危险操作**: 将永久删除所有会话、消息、设置和向量数据。

---

### GET /api/docs
**文档内容查询**

返回内置文档/GeminiDocs 目录下的 Markdown 内容。

---

## 数据模型参考

### Settings 表字段
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `base_url` | TEXT | API Base URL |
| `api_key` | TEXT | API Key（明文存储） |
| `api_protocol` | TEXT | `openai` 或 `gemini` |
| `selected_model` | TEXT | 当前选择的模型 ID |
| `tools_config` | TEXT | JSON 格式的工具配置 |
| `safety_settings` | TEXT | JSON 格式的安全设置 |
| `rag_enabled` | INTEGER | RAG 开关 (0/1) |
| `app_password_hash` | TEXT | 应用锁密码哈希 |
| `auth_secret` | TEXT | HMAC 签名密钥 |

### Message 块类型
| 类型 | 说明 |
| :--- | :--- |
| `text` | 纯文本内容 |
| `thinking` | 模型思考过程 |
| `image` | 图片附件 |
| `video` | 视频附件 |
| `audio` | 音频附件 |
| `pdf` | PDF 文档 |
| `code_execution` | 代码执行 |
| `function_call` | 函数调用 |
| `grounding` | Grounding 引用 |

---

> 最后更新时间：2026-09-09