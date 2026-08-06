# Changelog

All notable changes to this project will be documented in this file.

本项目的所有重要变更都将记录在此文件中。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

该格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，本项目遵循 [语义化版本控制](https://semver.org/spec/v2.0.0.html)。

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

[1.0.0]: https://github.com/SRInternet-Studio/AIStudio/releases/tag/v1.0.0
