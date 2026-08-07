# 欢迎使用 AI Studio

AI Studio 是一个可自托管的大语言模型对话平台，支持任意 Gemini 或
OpenAI 兼容接口。所有对话、设置与用量统计都保存在**本地 SQLite 数据库**中——
你的数据始终留在自己的电脑里。

## 目录

- [README](README.md) — 项目概述、功能特性、快速开始、截图展示。
- [LICENSE](LICENSE.md) — 使用与分发条款。
- [二次开发手册](DEVELOPMENT.md) — 架构、后端接口文档、扩展指南。
- [安全](SECURITY.md) — 漏洞报告与负责任披露。
- [贡献指南](CONTRIBUTING.md) — 如何贡献、PR 流程、代码规范。
- [行为准则](CODE_OF_CONDUCT.md) — 社区标准与期望。
- [免责声明](DISCLAIMER.md) — 与 Google AI Studio 的关系及法律声明。

## 项目特色

- 🗄️ **本地优先存储** — 内嵌 libsql（SQLite）数据库，无云端依赖。
- 🗣️ **Edge-TTS 语音朗读** — 多种音色，支持音量/语速/音调调节与自动朗读。
- 🔒 **密码保护** — 可选锁屏，守护整个应用。
- 🌗 **深色 / 浅色 / 跟随系统主题** — 无闪烁，水合前即生效。
- 🔌 **自带接口** — 自定义 Base URL、API Key、协议与代理。
- 🧠 **长期记忆（RAG）** — 被滑动窗口裁掉的消息仍可通过语义检索找回；
  Local 嵌入提供方完全在本机运行，无需任何嵌入渠道。
- 🧰 **完整工具套件** — 结构化输出、函数调用、代码执行、Search / Maps
  接地、URL 上下文。

## 快速开始

1. 执行 `npm install` 与 `npm run dev`，打开 <http://localhost:3000>。
2. 打开左下角 **Settings** → API 配置：填写 Base URL、API Key、协议与可选代理。
3. 在右侧运行设置面板中选择模型，即可开始对话。
4. 在 **Dashboard** 查看数据库统计，在 **History** 查看历史会话。

## 下一步

- 第一次接触代码？请阅读[二次开发手册](DEVELOPMENT.md)。
- 想要参与贡献？请查看[贡献指南](CONTRIBUTING.md)与[行为准则](CODE_OF_CONDUCT.md)。
- 发现安全漏洞？请查看[安全](SECURITY.md)。
