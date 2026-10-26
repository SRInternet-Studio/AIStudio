# 开发环境与构建部署指南

本文档涵盖 AIStudio 项目的开发环境搭建、依赖安装、本地运行、测试、Lint 检查以及构建与部署流程。

## 1. 系统要求

- **Node.js**: >= 18.x（推荐 20.x LTS）
- **npm**: >= 9.x（或使用 pnpm）
- **操作系统**: Windows / macOS / Linux
- **磁盘空间**: >= 2GB（含 node_modules 和本地 RAG 模型缓存）

## 2. 项目获取与依赖安装

```bash
# 克隆仓库
git clone https://github.com/SRInternet-Studio/AIStudio.git
cd AIStudio

# 安装依赖
npm install
# 或使用 pnpm
pnpm install
```

### 原生模块说明
项目依赖以下原生 Node.js 模块，安装时可能需要编译工具：
- `better-sqlite3`: SQLite 数据库驱动
- `onnxruntime-node`: 本地 RAG 嵌入模型运行时
- `sharp`: 图像处理（可选）
- `bufferutil` / `utf-8-validate`: WebSocket 性能优化

Windows 用户可能需要安装 [windows-build-tools](https://www.npmjs.com/package/windows-build-tools)：
```bash
npm install --global windows-build-tools
```

## 3. 本地开发运行

```bash
# 启动开发服务器（默认 http://localhost:3000）
npm run dev
```

开发服务器支持热重载，修改代码后自动刷新页面。

### 环境变量
项目不强制要求 `.env` 文件，所有配置通过应用内设置面板管理并持久化到 SQLite 数据库。如需覆盖默认行为，可创建 `.env.local`：

```bash
# 可选：自定义端口
PORT=3000
```

## 4. 数据库

- **位置**: `data/ai-studio.db`（首次运行时自动创建）
- **引擎**: SQLite（通过 `@libsql/client`）
- **迁移**: 自动执行（`src/lib/db.ts` 中的 `COLUMN_MIGRATIONS`）
- **备份**: 通过 `/api/db-content` 接口导出 JSON

### 重置数据库
删除 `data/ai-studio.db` 文件后重启应用即可重建空数据库。或通过应用内"清除所有数据"功能操作。

## 5. 测试

```bash
# 运行全部测试
npm test

# 运行单个测试文件
node --import ./tests/register.mjs --test tests/context-window.test.ts
```

### 测试框架
- 使用 Node.js 原生测试运行器 (`node:test`)
- 断言库: `assert/strict`
- 测试注册器: `tests/register.mjs`

### 现有测试覆盖
| 测试文件 | 覆盖范围 |
| :--- | :--- |
| `assistant-persistence.test.ts` | 助手消息持久化 |
| `auto-read.test.ts` | 自动朗读触发逻辑 |
| `context-window.test.ts` | 滑动窗口裁剪 |
| `current-context-tokens.test.ts` | Token 估算准确性 |
| `gemini-contents-guard.test.ts` | Gemini 请求内容校验 |
| `gemini-media-routing.test.ts` | 媒体附件路由策略 |
| `gemini-thinking-config.test.ts` | Thinking 配置版本适配 |
| `grounding-footnotes.test.ts` | Grounding 引用解析 |
| `grounding-anchor-uniqueness.test.ts` | 引用锚点跨消息唯一性 |
| `media-compress.test.ts` | 媒体压缩逻辑 |
| `model-merge.test.ts` | 模型列表合并 |
| `models-openai.test.ts` | OpenAI 模型兼容 |
| `models-whitelist.test.ts` | 模型白名单过滤 |
| `rag-fallback.test.ts` | RAG 降级机制 |
| `reload-guard.test.ts` | 重载保护 |
| `segmented-token-count.test.ts` | 整史 Token 计数与分页无关性 |
| `stream-error-save.test.ts` | 流式中断保存 |
| `stream-handoff.test.ts` | 流式结束交接（回复不闪现、不重复） |
| `tts-text.test.ts` | TTS 文本预处理 |

## 6. 代码质量

### Lint 检查
```bash
npm run lint
```

- **ESLint**: 9.x flat config (`eslint.config.mjs`)
- **规则集**: `eslint-config-next/core-web-vitals`
- **React Hooks**: v7 警告已降级为 warn（避免阻塞遗留代码）

### TypeScript
- 严格模式 (`strict: true`)
- 路径别名: `@/*` → `./src/*`
- 目标: ES2017

## 7. 构建与生产部署

### 构建
```bash
npm run build
```

构建产物输出到 `.next/` 目录。

### 生产运行
```bash
npm start
```

### Docker 部署（推荐）
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

### 注意事项
- `data/` 目录需持久化挂载，否则重启丢失数据
- `serverExternalPackages` 中列出的原生模块不可被 webpack 打包，必须从 `node_modules` 加载
- 大文件上传需确保反向代理（Nginx/Caddy）的 body size 限制 ≥ 100MB

## 8. 项目脚本一览

| 脚本 | 命令 | 说明 |
| :--- | :--- | :--- |
| `dev` | `next dev` | 启动开发服务器 |
| `build` | `next build` | 生产构建 |
| `start` | `next start` | 启动生产服务器 |
| `lint` | `eslint .` | ESLint 代码检查 |
| `test` | `node --import ./tests/register.mjs --test "tests/*.test.ts"` | 运行测试 |

## 9. 贡献流程

1. Fork 仓库并创建特性分支
2. 遵循现有代码风格（TypeScript strict + Tailwind CSS）
3. 为新功能添加测试用例
4. 确保 `npm run lint` 和 `npm test` 通过
5. 提交 Pull Request 并描述变更内容

详细贡献规范请参阅 [CONTRIBUTING.md](../CONTRIBUTING.md)。

---

> 最后更新时间：2026-09-09