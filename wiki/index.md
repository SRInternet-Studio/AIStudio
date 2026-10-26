# AIStudio Wiki

欢迎来到 AIStudio 项目知识库。本文档集旨在帮助开发者、贡献者和用户全面理解项目的技术架构、核心模块、API 接口以及开发流程。

## 📚 文档目录

### 核心文档

| 文档 | 描述 |
| :--- | :--- |
| [项目概览与目标定位](./project-overview.md) | 项目简介、核心理念、功能清单与技术亮点 |
| [技术架构与设计详解](./technical-design.md) | 系统架构图、设计模式、数据流、状态管理与安全机制 |
| [模块职责与功能说明](./module-responsibilities.md) | 各核心模块（lib/store/components/app）的职责、导出接口与交互关系 |
| [API 文档与接口规范](./api-reference.md) | 所有后端 API 端点、请求/响应格式、认证要求与错误处理 |
| [开发环境与构建部署](./development-guide.md) | 环境搭建、依赖安装、本地运行、测试、Lint、构建与部署流程 |

### 问题追踪

| 文档 | 描述 |
| :--- | :--- |
| [Bug 报告与代码审查记录](../BUG_REPORT.md) | 代码审查中发现的潜在 Bug、代码异味、逻辑缺陷与改进建议 |

## 🏗️ 项目技术栈速览

- **框架**: Next.js 16 (App Router) + React 18 + TypeScript 5.7
- **样式**: Tailwind CSS 3.4 + Radix UI
- **状态管理**: Zustand 5.0
- **数据库**: SQLite (via @libsql/client) + Drizzle ORM
- **AI 集成**: Gemini Native API / OpenAI Compatible API
- **RAG**: API Embeddings / Local ONNX (@huggingface/transformers)
- **TTS**: msedge-tts (Edge TTS)
- **测试**: Node.js native test runner

## 🔗 快速链接

- [GitHub 仓库](https://github.com/SRInternet-Studio/AIStudio)
- [CHANGELOG](../CHANGELOG.md)
- [CONTRIBUTING](../CONTRIBUTING.md)
- [DEVELOPMENT](../DEVELOPMENT.md)
- [SECURITY](../SECURITY.md)

---

> 本文档由代码分析自动生成，最后更新时间：2026-09-09