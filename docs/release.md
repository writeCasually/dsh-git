# 发布清单：从 dsh 调试副本 → 自己的插件仓库

> 目标：把在 dsh 仓库里调试的插件源码，变成可发布、可被聚合仓库收录的独立插件仓库。

## 角色划分

| 位置 | 性质 | 提交 |
|---|---|---|
| `deepseek-harness/packages/git/dsh-git*` | 调试副本（挂当前实例跑） | 不提交到 upstream；留在本地工作区（或自己的 fork） |
| `github.com/<you>/dsh-git` | 规范仓库/发布源 | 唯一提交目标 |

## 仓库结构（自身为 pnpm workspace）

```
dsh-git/
├── packages/git/dsh-git          # host：GitService (TypertRemoteService, @Remote)
│   └── src/service.ts
├── packages/git/dsh-git-client   # client：dsh.client 标记 + ctx.remote.dshGit
│   └── src/client/index.ts
├── docs/                         # design.md + release.md
├── install/cordis.patch.yml      # 安装片段示例（host 行）
├── package.json / pnpm-workspace.yaml
└── README.md                     # 安装说明
```

## 步骤

0. **接入 dsh 仓库（二选一，推荐符号链接，零漂移、上游 git 零污染）**：
   ```bash
   # A. 符号链接（推荐）：dsh 直接加载插件仓库真实源码
   mkdir -p /Users/strikingly/workspace/deepseek-harness/packages/git
   ln -s /Users/strikingly/workspace/deepseek-harness-plugins/plugins/dsh-git \
         /Users/strikingly/workspace/deepseek-harness/packages/git/dsh-git

   # B. 兜底：复制 + 单向同步（上游 git 零污染）
   cp -r /Users/strikingly/workspace/deepseek-harness-plugins/plugins/dsh-git/packages/git/dsh-git* \
         /Users/strikingly/workspace/deepseek-harness/packages/git/
   # 每次调试前：rsync -a --delete <插件仓库>/ <dsh 仓库>/packages/git/dsh-git/
   ```
   不推荐 git submodule：会污染上游 dsh 克隆的 git 状态（pointer 记账、上游更新易冲突）。
2. **修正依赖指针**：调试副本用 `workspace:^`，独立仓库改为已发布版本；
   - host：`@deepseek-ai/cordis`、`dsh-subprocess`、`dsh-session`、`dsh-session-query`、`dsh-fs`、`dsh-typert-protocol`
   - client：`dsh-client-connection`、`dsh-client-runtime`、`dsh-api-remotes`、`dsh-client-ui-conversation`
3. `.gitignore`：`node_modules/`、`lib/`、`dist/`
4. 首提交 + tag + push：
   ```bash
   git add -A && git commit -m "feat: dsh-git …" && git tag v0.1.0
   git remote add origin git@github.com:<you>/dsh-git.git
   git push -u origin main --tags
   ```
5. 仓库加 topic：`dsh-plugin`（触发 deepseek-harness-plugins 发现/审查）
6. README 写安装说明：`~/.dsh/profiles/<profile>/cordis.patch.yml` 加 host 行；client 模块按 web 构建/安装说明接入。

## 两条分发路径

- **社区路径**：独立仓库 + `dsh-plugin` topic → 聚合仓库自动收录（`deepseek-harness-plugins`）。
- **官方路径**（可选）：向 `deepseek-ai/deepseek-harness` 提 PR 合入 `packages/`；
  官方预设不参与聚合审查，二者互斥选一。

## 插件仓库当前状况（2026-08）

- `docs/design.md`：设计定稿（含恢复式回滚、只增账本、RPC/审批/互斥规范）。
- `p0/`、`p1/`：动态插件验证源码（host/client 可读版 + 紧凑版），已验证：
  会话日志 meta 读回、插件侧 git 子进程（可 push）、Slot 渲染、RPC 闭环
  （RPC 往返只为合法 JSON，参数不得含 undefined）。
- 待移植：host `GitService`（status/diff/commit/readFile）+ client 面板（变更/提交/预览/回合卡）。