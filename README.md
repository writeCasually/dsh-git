# dsh-git

DeepSeek Harness 的 Git 面板插件，为 AI 编程助手提供可视化 Git 操作界面。

## 功能特性

### 核心功能
- **Git 状态查看**：实时显示当前分支、暂存区、未暂存和未跟踪文件
- **文件差异对比**：查看未暂存和已暂存的文件差异，支持语法高亮
- **一键提交**：快速提交所有变更（`git add -A && git commit`）
- **文件预览**：直接查看工作区中的文件内容
- **悬停查看回合改动**：鼠标悬停官方「本轮文件改动」行的文件名，就地弹出该文件的回合 diff

### 界面组件
- **Git 面板**：集成在 DeepSeek Harness Web UI 中的浮动面板
- **悬停 diff 弹窗**：跟随官方「本轮文件改动」chip 的浮层，**左右对照**展示该文件的回合 diff
- **差异查看器**：面板与弹窗共用的 diff 视图，显示增删行数

## 安装方式

### 方式一：本地安装（推荐开发调试）

1. 构建插件：
```sh
node scripts/build.mjs
```

2. 安装到 DeepSeek Harness：
```sh
cd /path/to/deepseek-harness
pnpm dsh plugin --profile web add /path/to/dsh-git
```

3. 启动并验证：
```sh
pnpm dsh --profile web --dump-config
pnpm dsh --profile web --port 3080
```

4. 打开 `http://127.0.0.1:3080`，会话头部应出现 `Git` 按钮。

### 方式二：从 npm 安装

```sh
dsh plugin --profile web add dsh-git
```

### 方式三：本地开发链接

```sh
cd /path/to/dsh-git
pnpm link --global
dsh plugin --profile web add dsh-git
```

## 使用说明

### 基本操作

1. **打开 Git 面板**：点击会话头部的 `Git` 按钮
2. **查看状态**：面板默认显示"变更"标签页，列出所有文件变更
3. **查看差异**：点击文件名查看具体差异内容
4. **提交代码**：切换到"提交"标签页，输入提交信息后点击提交
5. **预览文件**：切换到"预览"标签页，输入文件路径查看内容

### 界面说明

- **变更标签页**：
  - 显示当前分支信息和远程同步状态
  - 分类显示已暂存、未暂存、未跟踪文件
  - 支持查看未暂存和已暂存的 diff
  - 显示最近回合的修改摘要

- **提交标签页**：
  - 输入提交信息
  - 一键提交所有变更（自动执行 `git add -A`）

- **预览标签页**：
  - 输入相对路径查看文件内容
  - 支持代码高亮显示

### 悬停查看官方「本轮文件改动」的 diff

聊天里官方的「本轮文件改动」行**完全由官方 `ui-deliverables` 渲染**，本插件不再占用
`conversation.chat.turnTail`（单赢家 chain 槽），也不再渲染自己的回合卡：

- 鼠标停在某个文件名 chip 上约 140ms，即在其下方弹出该文件的 diff 浮窗；
- 弹窗头部 = 状态徽标 + 完整路径 + 回合号 + `+A −R`；正文是**左右对照**的 diff
  （左侧旧行、右侧新行，逐行对齐；短的一侧补占位格），hunk 按**文件行序**排列；
- 头部 `⇄ 滚动` / `↵ 折行` 按钮切换长行的两种读法（选择在当前页面内保持）：
  默认**折行**——长行在自己那一栏折行，两栏永远等于浮窗宽度，左右同时看全；
  切到**滚动**则左右各成一个独立滚动区（参考 VSCode diff）：**每侧都有自己的横向滚动条且常驻
  可见，滚动其中一侧另一侧跟着滚**，两侧行号与代码始终列对列对齐；**横向拖动时行号与
  `+/-` 列固定不动**（sticky 钉在左缘），拖到长行中段也知道是第几行；
- 两侧行号是**文件真实行号**（host 把每个 hunk 在磁盘文件里定位后回填 `oldStart`/`newStart`）；
  定位不到时行号**留空**，不会拿 hunk 内 1..N 冒充真实行号；
- 弹窗按视口取宽（`min(1180px, 视口 − 32px)`），两栏代码各得一半，必要时会盖住右侧栏
  —— 比压缩成聊天列宽度更容易看全代码；
- 鼠标移入弹窗可继续滚动查看，移开后约 180ms 关闭；滚动聊天流、窗口尺寸变化或按 `Esc` 立即关闭；
- chip 自带的原生 tooltip 在浮窗打开期间会被暂时静音，避免两层提示叠在一起；
- 该回合该文件没有记录（比如改动来自 bash）时，弹窗内给出说明而不是报错。

> 数据来自 host 的 `dshGit/turnDiff`，按 `sessionId+turn` 客户端缓存：同一回合的多个文件
> 只请求一次。回合号取自官方 DOM 的 `[data-turn-tail]`（纯工具回合没有该属性时回退到聊天行
> 的 `[data-chat-turn]`），完整路径取自 chip 的 `title`；会话 id 由插件在会话头部捕获。
> host 只统计**成功**的 write/edit：被拒的 edit（`tool/result` 带 `isError`）不会进入 diff。
> 实现细节见 `docs/design.md` 第 17 节。

## 技术实现

### 架构设计
- **双面包结构**：仓库根目录就是一个 `dsh.bundle` 包，host 与 web client 打包在同一个包内
- **独立 RPC 通道**：插件用自己 `inject` 的 `webServer` 直接注册 `/dsh-git` 前缀路由（POST 一个 Connection envelope），复用 `connection.requestRejection` 做 Host/Origin 与浏览器会话鉴权；不占用 `/api` 拦截器，也不依赖 `connection.rpc.handle()` 的内部 owner 上下文（该路径在当前 harness 行会抛 `cannot get property "webServer" without inject`，导致插件整体不激活：每个 `dshGit/*` 请求都是 405）
- **零代码生成**：不依赖 typert 或其他代码生成工具

### API 接口

插件通过 RPC 暴露以下方法：

| 方法 | 说明 | 参数 |
|------|------|------|
| `dshGit/status` | 获取 Git 状态 | `sessionId` |
| `dshGit/diff` | 获取文件差异 | `sessionId`, `staged?`, `path?` |
| `dshGit/commit` | 提交变更 | `sessionId`, `message` |
| `dshGit/readFile` | 读取文件内容 | `sessionId`, `path` |
| `dshGit/recentTurns` | 获取最近回合修改 | `sessionId`, `limit?` |
| `dshGit/turnDiff` | 回合的文件级 diff（悬停弹窗数据源） | `sessionId`, `turn` |

### 数据源

- **会话日志**：从 DSH 会话日志中提取工具调用和结果
- **Git 命令**：通过 `subprocess.spawn` 执行 git 命令
- **文件系统**：使用 DSH 的 `fs` 服务读取文件

## 开发指南

### 项目结构

```
dsh-git/
├── src/
│   ├── index.js      # Host 端插件逻辑
│   └── client.js     # Web 客户端 UI 组件
├── scripts/
│   ├── build.mjs     # 构建脚本
│   ├── watch.mjs     # 开发监听脚本
│   ├── verify-host.mjs    # Host 传输/RPC 回归校验（无需 harness）
│   └── verify-client.mjs  # 客户端槽位/浮窗回归校验（需 DSH_CHECKOUT）
├── lib/              # 构建产物（自动生成）
├── docs/             # 设计文档
├── cordis.patch.yml  # 插件配置
└── package.json
```

### 构建命令

```sh
# 构建
pnpm build

# 开发模式（监听 src/ 变化并重建 lib/）
pnpm dev

# Host 传输层回归校验（/dsh-git 路由注册、鉴权、envelope、dispatch；无需 harness）
pnpm verify:host

# 客户端回归校验（官方「本轮文件改动」行不被抢占 + 悬停 diff 弹窗）
DSH_CHECKOUT=/path/to/deepseek-harness pnpm verify:client

# 两者一起跑
pnpm verify

# 打包发布
pnpm pack
```

### 依赖关系

**Host 端依赖**：
- `@deepseek-ai/dsh-connection` - 连接服务
- `@deepseek-ai/dsh-subprocess` - 子进程管理
- `@deepseek-ai/dsh-session-query` - 会话查询
- `@deepseek-ai/dsh-fs` - 文件系统服务
- `@deepseek-ai/dsh-session-persistence` - 会话持久化

**Client 端依赖**：
- `@deepseek-ai/dsh-client-connection` - 客户端连接（RPC）
- `@deepseek-ai/dsh-client-ui-conversation` - 会话 UI（头部动作槽位 + 聊天 DOM）
- `@deepseek-ai/dsh-client-ui-layout` - 布局 UI（`shell.overlay`）

> 客户端不 import 官方 `ui-deliverables`：官方「本轮文件改动」行原样渲染，插件只读取它的
> DOM 约定（`[data-produced-files-row] button[title]`、`[data-turn-tail]`）来定位悬停目标。

## 发布说明

### 发布到 npm

```sh
# 构建
node scripts/build.mjs

# 打包
pnpm pack

# 发布（需要 npm 权限）
npm publish
```

### 作为社区插件

1. 仓库添加 `dsh-plugin` topic
2. 提交到 `deepseek-harness-plugins` 聚合仓库
3. 用户通过 `dsh plugin add` 安装

## 设计文档

详细设计文档位于 `docs/` 目录：

- `design.md` - 完整设计文档，包含架构、需求分析和实现细节
- `build.md` - 打包方式选型与产物契约
- `release.md` - 发布清单与流程说明

## 许可证

MIT License