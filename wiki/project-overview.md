# 项目总览与目标定位

## 项目简介

AIStudio 是一个非官方的、教育性质的 Google AI Studio 复刻项目，基于 Next.js 16 App Router 构建。它提供了一个功能完整的本地优先 AI 聊天界面，支持流式对话、自定义 API 端点、多模型选择、RAG 长期记忆、工具调用、TTS 语音合成以及密码保护等高级特性。

项目的核心设计理念是**本地数据主权**：所有对话历史、设置和附件均存储在本地 SQLite 数据库中（`data/ai-studio.db`），无需依赖云端同步服务，确保用户数据的隐私与安全。

## 核心目标

- **全功能复刻**：还原 Google AI Studio 的核心交互体验，包括流式响应、思考气泡、搜索引用、分支对话、上下文导入导出等。
- **协议无关性**：通过统一的 API 客户端层同时支持 Gemini Native API 和 OpenAI Compatible API，允许用户无缝切换或接入任意兼容端点。
- **本地优先架构**：使用嵌入式 SQLite 数据库持久化所有状态，避免对外部服务的强依赖。
- **可扩展性**：支持自定义模型注册、Function Calling、Structured Output、RAG 嵌入提供者切换（API / Local ONNX）等扩展能力。
- **教育与研究**：代码库作为学习现代 Web 全栈开发、LLM 应用集成及复杂状态管理的参考实现。

## 主要功能清单

| 功能类别 | 具体特性 |
| :--- | :--- |
| **对话交互** | 流式 SSE 输出、Markdown 渲染、代码高亮复制、思考过程折叠、Grounding 引用脚注 |
| **消息管理** | 编辑/重发/删除、从某条消息分支、会话复制/导出、上下文 JSON 导入、懒加载历史 |
| **多模态支持** | 图片/视频/音频/PDF 附件、客户端可选压缩、Gemini Files API 上传、媒体分辨率控制 |
| **模型与配置** | 动态模型列表拉取、自定义模型注册、白名单过滤、安全设置、Stop Sequences、Thinking Level |
| **工具系统** | Code Execution、Function Calling、Structured Output、Google Search/Maps Grounding、URL Context |
| **RAG 记忆** | 滑动窗口裁剪 + RAG 按需检索、API/Local 双嵌入源、余弦相似度召回、Token 预算控制 |
| **语音合成** | Edge-TTS 服务端合成、多语言音色、自动朗读回复、代码块朗读开关 |
| **安全与权限** | 密码锁屏（HMAC 签名 Cookie）、硬刷新重置会话、清除所有数据三重确认 |
| **仪表盘** | API 配置管理、Token 用量统计、数据库状态查看、原始内容浏览 |

## 技术亮点

- **双协议统一抽象**：[`src/lib/api-client.ts`](../src/lib/api-client.ts) 封装了 Gemini 和 OpenAI 两种协议的请求构建、流式解析、工具配置和媒体处理逻辑，上层业务代码完全协议无关。
- **CJK 感知 Token 估算**：[`src/lib/context-manager.ts`](../src/lib/context-manager.ts) 针对中日韩文本采用 0.75 token/字符的估算策略（按实测分词器密度校准），显著优于通用 Latin 估算，避免上下文溢出或浪费。
- **乐观更新与冲突解决**：[`src/store/chatStore.ts`](../src/store/chatStore.ts) 中的 `applyDbMessages` 函数能够在服务端数据返回时保留本地的乐观消息和错误气泡，防止竞态条件导致的 UI 闪烁。
- **渐进式上下文加载**：首次仅加载最新 50 条消息，滚动到顶部时按需加载更早批次，保证大对话的性能表现。
- **流式部分持久化**：即使流式传输中断，已接收的部分内容仍会被保存到数据库，避免用户丢失长篇回复。
