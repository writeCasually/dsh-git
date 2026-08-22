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
   ln -s /Users/strikingly/workspace/deepseek-harness-plugins/plugins/dsh-git/packages/git/dsh-git \
         /Users/strikingly/workspace/deepseek-harness/packages/git/dsh-git
   ln -s /Users/strikingly/workspace/deepseek-harness-plugins/plugins/dsh-git/packages/git/dsh-git-client \
         /Users/strikingly/workspace/deepseek-harness/packages/git/dsh-git-client

   # B. 兜底：复制 + 单向同步（上游 git 零污染）
   #   每次调试前：rsync -a --delete <插件仓库>/ <dsh 仓库>/packages/git/
   ```
   不推荐 git submodule：会污染上游 dsh 克隆的 git 状态（pointer 记账、上游更新易冲突）。

0b. **运行实例接线（实测步骤，缺一不可）**：
   ```bash
   # ① dsh 仓库安装并构建（产出 lib/，服务/client 模块才能被解析）
   cd /Users/strikingly/workspace/deepseek-harness
   pnpm install
   pnpm build:lib          # 或 pnpm --filter dsh-git... build

   # ② profile 能解析到两个包（link 到插件仓库源码）
   cd ~/.dsh/profiles/web
   pnpm add -D dsh-git@link:/Users/strikingly/workspace/deepseek-harness-plugins/plugins/dsh-git/packages/git/dsh-git \
              dsh-git-client@link:/Users/strikingly/workspace/deepseek-harness-plugins/plugins/dsh-git/packages/git/dsh-git-client
   pnpm install

   # ③ patch 挂两行（host 服务 + client 模块入口）
   #    ~/.dsh/profiles/web/cordis.patch.yml 追加：
   #    - id: dsh-git
   #      name: 'dsh-git'
   #    - id: dsh-git-client
   #      name: 'dsh-git-client'

   # ④ 重启 dsh 实例（client-modules 负缓存/行加载按进程生效）→ 刷新 http://127.0.0.1:3080
   ```
   原理（已核源码）：`clientModules` 只扫描 **loader 行**、从 **profile baseUrl** `require.resolve(pkg/package.json)`，
   读到 `dsh.client` 标记 + `./client` export 后打包进 `window.__DSH_BOOT__`；client 包需像
   `dsh-client-ui-*` 一样提供空 host 面 `apply(){}` 才能作 loader 行。

> ⚠️ 上表 0b 是"探索版"接线，**有坑**（见 §复盘），不推荐。**官方社区插件安装方式**见下方 §官方方式。

## 官方社区插件安装方式（正确路径，零碰 harness 仓库）

1. **插件仓库做成 pnpm workspace**，含三件：
   - host 服务包（如 `dsh-git`，依赖发布于 npm 的 `@deepseek-ai/*`，不引 harness 仓库）
   - client 模块包（`dsh.client` 标记 + `./client` export 的构建产物；typert 生成的 `.js/.d.ts` 提交存档）
   - **bundle 包**（如 `dsh-git-bundle`）：`package.json` 声明 `dsh.bundle.patch` +
     把 host/client 列为依赖；`cordis.patch.yml` **顶层 `- insert:` 列表**新增两行
     `{id: dsh-git, name: 'dsh-git'}`、`{id: dsh-git-client, name: 'dsh-git-client'}`
2. **安装（一次命令，官方）**：
   ```bash
   cd dsh-git && dsh plugin --profile web add <bundle-pkg>
   # 等价于：在 profile 里 pnpm add <bundle-pkg>，再自动把带 dsh.bundle 的包并入
   #          dsh.profile.bundles；重启实例即加载。
   # 本地开发可用 `dsh plugin --profile web add .`（从插件 checkout self-link）。
   ```
3. 重启 dsh 实例 → clientModules 从 profile baseUrl 解析到 host/client 包 → 打包进 boot。

要点：**行加载要求包能被 profile 解析到**（`dsh-git` 作为 bundle 包的依赖随装），
只把包塞进 `bundles` 而不安装依赖会启动失败（loader 解析不到 → 整树 boot 报错）。
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
## 复盘：为什么之前那么复杂（教训）

| 踩坑 | 根因 |
|---|---|
| 手改 harness 的 tsconfig.host/.client.json + root 依赖 + 根 tsconfig 编辑 | 那是"向看护本体贡献官方内置包"的路径（monorepo 编译编排 + typert 生成器发布契约），不是社区插件 |
| 符号链接成员不被 pnpm 链接 | pnpm 只链接"被依赖"的 workspace 成员，外来符号链接不参与安装 |
| patch 用户层写 `{id,name}` 行被静默丢弃 | **官方新增行必须顶层 `- insert:`**；顶层映射是"按 id 覆盖/禁用" |
| loader 启动崩 | 只把包放进 `bundles` 没装依赖 → profile 解析不到 → 整树 boot 失败 |

**结论**：社区插件的官方方式是「独立仓库 + bundle 包 + `dsh plugin add`」，**绝不修改 harness 仓库**；
agent 侧能力用 Agent 预设；UI 原型/会话内能力用动态插件。静态发布只走官方命令。
