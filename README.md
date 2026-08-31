# dsh-git

DeepSeek Harness 的 Git 面板插件，为 AI 编程助手提供可视化 Git 操作界面。

## 功能特性

### 核心功能
- **Git 状态查看**：实时显示当前分支、暂存区、未暂存和未跟踪文件
- **文件差异对比**：查看未暂存和已暂存的文件差异，支持语法高亮
- **一键提交**：快速提交所有变更（`git add -A && git commit`）
- **文件预览**：直接查看工作区中的文件内容
- **回合修改摘要**：在聊天界面中显示每个 AI 回合的代码修改统计

### 界面组件
- **Git 面板**：集成在 DeepSeek Harness Web UI 中的浮动面板
- **回合摘要卡**：在聊天流中显示每回合的文件修改统计
- **差异查看器**：支持展开/收起的 diff 视图，显示增删行数

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

### 回合修改摘要

每次 AI 助手修改代码后，聊天界面会自动显示修改摘要：
- 修改的文件数量
- 新增和删除的行数统计
- 可展开查看详细的 diff 内容

## 技术实现

### 架构设计
- **双面包结构**：仓库根目录就是一个 `dsh.bundle` 包，host 与 web client 打包在同一个包内
- **独立 RPC 通道**：使用 `ctx.connection.rpc.handle('/dsh-git', ...)` 暴露 API，不占用 `/api` 拦截器
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
│   └── watch.mjs     # 开发监听脚本
├── lib/              # 构建产物（自动生成）
├── docs/             # 设计文档
├── cordis.patch.yml  # 插件配置
└── package.json
```

### 构建命令

```sh
# 构建
node scripts/build.mjs

# 开发模式（监听文件变化）
node scripts/dev.mjs

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
- `@deepseek-ai/dsh-client-connection` - 客户端连接
- `@deepseek-ai/dsh-client-ui-conversation` - 会话 UI
- `@deepseek-ai/dsh-client-ui-layout` - 布局 UI

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