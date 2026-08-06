# <img src="../AIStudio.png" width="35" />  AI Studio

AI Studio 以完全自托管 Web 应用的形式复刻了 Google AI Studio 的操作台
界面与交互体验。你可以配置任意 **Gemini** 或 **OpenAI 兼容**接口（自定义
Base URL、API Key、代理），所有数据都保存在**本地嵌入式 SQLite（libsql）
数据库**中——除了发往你自己 API 接口的请求外，任何数据都不会离开你的电脑。

本项目是 Google AI Studio 界面的**非官方、教育性质的开源复刻版本**，基于 Next.js 14 构建，
**仅供学习与研究**——与 Google 无任何隶属、授权或赞助关系，不涉及任何
商业利益。

## 功能特性

### 核心操作台

- 💬 流式（SSE）与非流式对话补全
- 🔌 自定义 **Base URL / API Key**，可切换协议（**Gemini** 或
  **OpenAI 兼容**），支持可选 **HTTP 代理**
- 🤖 模型选择器：实时拉取模型列表，支持**注册自定义模型**（自定义上下文
  窗口、分类、描述）
- ✏️ 从任意位置**重新生成**回复，且不影响后续对话
- 🔀 会话**分支 / 复制**，**导入导出**上下文 JSON
- 📜 懒加载历史记录，滚动到顶部自动分页

### 工具

- 结构化输出（附 **JSON Schema 编辑器**）
- 函数调用（附**声明编辑器**）
- 代码执行
- Google Search / Google Maps 接地
- URL 上下文

### 配置与个性化

- 🎛️ 运行设置面板：系统指令、温度、top-p / top-k、最大输出 token、思考
  级别、按伤害类别的安全阈值
- 🗂️ **系统指令模板**（保存 / 应用 / 管理）
- 🌗 主题：**深色 / 浅色 / 跟随系统**
- 🔒 **密码保护**与锁屏（可选，本地存储）
- 📊 单条消息与单会话的 **token 用量**统计

### 数据与语音

- 🗄️ **本地 SQLite（libsql）数据库** — 对话、消息、设置与用量全部落盘；
  Dashboard 展示数据库大小与内容
- 🗣️ **Edge-TTS** 语音合成：多种音色，音量 / 语速 / 音调可调，支持单条
  朗读与 AI 回复**自动朗读**模式
- 📱 完全**响应式** — 桌面侧边栏与移动端抽屉布局

## 演示截图

应用的代表性界面（所有图片位于 [`Pictures/`](../Pictures/)）：

| | |
| --- | --- |
| ![主页（深色）](../Pictures/HomePage_(Dark).png) | ![主页（浅色）](../Pictures/HomePage_(Light).png) |
| *操作台 — 深色主题* | *操作台 — 浅色主题* |
| ![仪表盘](../Pictures/DashboardPage.png) | ![历史](../Pictures/HistoryPage.png) |
| *仪表盘 — 数据库与用量* | *历史 — 会话列表* |

<details>
<summary><b>🖼️ 完整截图合集（点击展开）</b></summary>

### 界面与主题

| | |
| --- | --- |
| ![移动端主页](../Pictures/HomePage_(Phone).png) | ![移动端侧边栏](../Pictures/Sidebar_(Phone).png) |
| *主页 — 移动端* | *侧边栏 — 移动端* |
| ![提示词页（深色）](../Pictures/PromptsPage_(Dark).png) | ![提示词页（浅色）](../Pictures/PromptsPage_(Light).png) |
| *对话界面 — 深色* | *对话界面 — 浅色* |

### 设置与工具

| | |
| --- | --- |
| ![设置窗口](../Pictures/Settings_Window.png) | ![API 配置](../Pictures/API_Configuration.png) |
| *设置窗口* | *API 配置* |
| ![工具选择](../Pictures/Select_Tools.png) | ![系统指令](../Pictures/Select_System_Instructions.png) |
| *工具选择* | *系统指令模板* |

### 模型与结构化输出

| | |
| --- | --- |
| ![模型选择](../Pictures/Model_Selection.png) | ![添加自定义模型](../Pictures/Add_Custom_Model.png) |
| *模型选择* | *添加自定义模型* |
| ![结构化输出编辑](../Pictures/Edit_Structure.png) | ![函数声明编辑](../Pictures/Edit_Function_Declarations.png) |
| *结构化输出 Schema 编辑器* | *函数声明编辑器* |

### 安全

| | |
| --- | --- |
| ![锁屏](../Pictures/LockScreenPage.png) | ![清除密码](../Pictures/LockScreenPage_(Clear-Password).png) |
| *密码锁屏* | *清除密码* |

</details>

## 安装

```bash
git clone https://github.com/SRInternet-Studio/AIStudio.git
cd AIStudio
npm install
npm run dev
```

打开 <http://localhost:3000>，点击输入框左下角的 **设置按钮**，选择协议，填写 Base URL 与 API Key，然后在运行设置面板（右侧）中 **选择或添加自定义模型**，即可开始对话。

## 配置说明

| 配置项 | 位置 | 说明 |
| --- | --- | --- |
| Base URL / API Key / 协议 / 代理 | 底部输入框 → 左下角设置按钮 → API 配置 | 本地持久化 |
| 系统指令与模板 | 运行设置面板（右侧） | 模板存入数据库 |
| 密码保护 | 设置窗口 | 可选锁屏 |
| 主题 | 设置窗口 | 深色 / 浅色 / 跟随系统 |

## 项目结构

```
├── src/
│   ├── app/            # Next.js App Router 页面 + API 路由
│   │   └── api/        # force-dynamic 后端接口
│   ├── components/     # chat、layout、settings、dashboard、documentation
│   ├── lib/            # db（libsql）、api-client、上下文管理、模型
│   ├── store/          # Zustand 全局状态
│   └── types/          # 共享 TypeScript 类型
├── public/             # 静态资源（Logo）
├── Pictures/           # 演示截图
├── Docs/               # 中文文档
└── data/               # 本地 SQLite 数据库（自动创建）
```

## 脚本命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 运行生产构建 |
| `npm run lint` | 运行 ESLint |

## 文档

应用内文档入口：**Manage → Documentation**（支持 English / 中文 切换）。
源文件：[WELCOME](WELCOME.md) · [DEVELOPMENT](DEVELOPMENT.md) ·
[SECURITY](SECURITY.md) · [CONTRIBUTING](CONTRIBUTING.md) ·
[CODE_OF_CONDUCT](CODE_OF_CONDUCT.md) · [DISCLAIMER](DISCLAIMER.md)；
英文版位于项目根目录。

## 免责声明

本项目是 Google AI Studio 的开源教育性质复刻作品，**与 Google 无关**，
**不涉及任何商业利益**。

**AI models may make mistakes, so double-check
outputs.** 详见 [DISCLAIMER](DISCLAIMER.md)。

## 许可证

[GNU GPL v3](LICENSE.md)。
