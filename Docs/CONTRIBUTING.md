# 贡献指南

> 感谢考虑参与贡献！AI Studio Clone 是一个开源、非商业的学习项目——
> 欢迎任何改进。

## 如何贡献

1. **Fork** 仓库，并从 `main` 创建主题分支（例如 `feature/tts-playlist`
   或 `fix/sidebar-flicker`）。
2. 按照[代码规范](#代码规范)完成修改。
3. 本地验证：`npx tsc --noEmit` 通过且 `npm run build` 成功。
4. 提交 **Pull Request**，清晰描述改动内容、动机；UI 改动请附截图或 GIF。

## 开发环境搭建

```bash
git clone https://github.com/SRInternet-Studio/AIStudio.git
cd AIStudio
npm install
npm run dev      # http://localhost:3000
```

- Node.js ≥ 18.17（Next.js 14 要求）。
- 首次运行时会自动创建 `data/ai-studio.db`，无需外部数据库。
- 在 **Settings → API 配置**中配置接口后即可测试对话。

## Pull Request 规范

- 保持 PR 聚焦——每个 PR 只做一件事。
- 在描述中关联相关 issue。
- 除非有充分理由，不要引入新的运行时依赖。
- 不要提交 `data/*.db`、`.next/`、`node_modules/` 或调试截图。
- 涉及文档的更新需**同时**修改英文版（根目录）与中文版（`Docs/`）。

## 代码规范

- **组件**：PascalCase 命名，位于 `src/components/<area>/`。
- **状态**：全局 UI 状态集中在 `src/store/chatStore.ts`（Zustand），避免
  属性层层透传。
- **样式**：使用 Tailwind 主题令牌（`bg-background`、`text-foreground`、
  `bg-card` 等）——禁止硬编码颜色，以保证深色/浅色主题完整。
- **日志**：console 日志以 `[组件名]` 为前缀。
- **API 路由**：`force-dynamic`，响应结构为 `{ success, data | error }`。
- **注释**：保留功能性警告（执行顺序、z-index、水合相关），删除纯描述
  性注释。
