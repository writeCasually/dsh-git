# dsh-git · 设计文档

> 面向 DeepSeek Harness 的 Git 插件：展示 agent 修改差异、按版本恢复、以及常用 git 操作面板。
> 状态：设计已评审定稿（2026-08），进入实施阶段。

## 1. 目标

1. **修改差异展示**：每次 agent 修改代码后，及时、就地展示修改内容与差异。
2. **版本保留与恢复**：同一会话内 agent 的每次修改都被保留；用户可将工作区恢复到任意历史版本（支持按区域/文件/全部粒度）。
3. **git 操作界面**：按钮式执行常用 git 操作，查看 git 状态与文件预览。

设计原则：**尽量复用 DSH 既有能力**（会话日志、事件流、Slots、审批链），不自建版本管理系统、不污染用户分支历史。

## 2. 术语

| 术语 | 含义 |
|---|---|
| 版本（V1…Vn） | 一个**发生了文件变更的 agent 回合**（`turn`）形成的账本条目；V0 = 会话起始基线 |
| 账本（Ledger） | 从会话日志派生的、**只增不改**的版本记录流 |
| 快照（Checkpoint） | 每个版本边界对工作区全量建树（含未提交/未跟踪内容），存到私有 ref，**只增不减** |
| 恢复（Restore） | 把"当前工作区 → 目标版本"的差异按用户勾选范围应用；不移动分支指针、不改写历史 |
| 写回（Write-back） | 恢复/提交流程通过 `agent.followup()` 把结果作为消息注入会话，消除下一轮的"信息差" |

## 3. 架构总览

```
┌─ Client（浏览器）───────────────────────────────────────────────┐
│  DiffViewer 组件（三模式复用）                                   │
│   ├ 回合摘要卡 compact   → conversation.chat.turnTail           │
│   ├ 变更抽屉   inline    → shell.overlay 自绘（可切换全屏）       │
│   └ Git 面板   full      → shell.overlay 自绘（大面积/文件预览）   │
│   [Git] 开关 → conversation.session.header.actions               │
└──────────────┬──────────────────────────────────────────────────┘
               │ host.call（JSON，Client→Host）
┌─ Host（dsh 进程内）─────────────────────────────────────────────┐
│  事件: session/event（实时捕获 fs 变更）                         │
│        agent/turn-stopping（版本边界 → 建快照）                   │
│        agent/status（idle ⇄ running → 写操作互斥）               │
│  ModLedger   —— 内存 + 可从 sessionQuery.listEvents 重建（零持久化）│
│  GitRunner   —— subprocess.spawn 参数化执行（白名单命令集）        │
│  CheckpointStore —— 私有 ref `refs/dsh-git/ckpt/<session>/<V>`   │
│  RPC handlers: status / diff / ledger / restore / ops / commit   │
│  Write-back: agent.followup() 注入用户消息                       │
└─────────────────────────────────────────────────────────────────┘
```

## 4. 复用地图（DSH 既有能力，均已核实）

| 能力 | 证据 | 复用方式 |
|---|---|---|
| 每次 write/edit 的逐 hunk diff 持久化 | `packages/fs/tool-fs/src/diff.ts` — `FsDiffMeta { diffs }`，随 `tool/result.meta` 落盘，可回放 | 版本账本与 diff 展示的**数据源** |
| 工具参数全量持久化 | `packages/core/session/src/types.ts` — `tool/call { turn, step, name, arguments }` | write/edit 参数可核对、可反演（兜底） |
| 回合号 turn | 同上 | 版本边界天然 = turn |
| 实时变更事件 | Host `session/event`（emit，Scope） | 实时捕获 fs 变更 |
| 回合边界时钟 | `agent/turn-stopping`（serial，await，带 turn） | 快照时机 |
| 历史读取 | `sessionQuery.listEvents(sessionId)` / `sessionPersistence.readFrom(id, seq)` | 跨重启重建账本 |
| 会话写回 | `Agent.followup(input)`（next-turn + wakeup） | 恢复/提交流程注入消息，agent 下一轮必读 |
| Host 执行 git | `subprocess.spawn`（subprocess-local 原生 child_process，**无沙盒**，网络/凭据同终端） | 插件侧可 push（走危险区+审批） |
| 文件预览 | `fs.readText` | 面板预览 |
| UI 挂载点 | Slots 实测：`turnTail`（chain）、`header.actions`（list）、`shell.overlay`（list）、`input.dock`（list）——均 additive | 三表面落位 |
| 审批链 | `approval.request`（留痕到会话日志） | 危险 git 操作的人工审批 |

> 实测证据（本机 ~/.dsh/sessions/…/session.jsonl.zstd）：会话日志为 zstd JSONL 追加式存储，`tool/call`（含 name/arguments/turn）与 `tool/result`（含 meta）逐条落盘。

## 5. 需求 1：修改差异展示

- **悬停 diff 弹窗**（主战场）：官方 `ui-deliverables` 的「本轮文件改动」行原样渲染（本插件不再占 `conversation.chat.turnTail`）；鼠标停在 chip 上约 140ms 弹出该文件的左右对照 diff 浮窗，详见 §17。
- **变更抽屉**（增强）：`shell.overlay` 右侧抽屉，浏览任意历史版本的完整 diff（DiffViewer `inline`）。
- **DiffViewer 组件**：唯一的 diff 渲染组件，三种模式（compact/inline/full）由 props 切换；输入统一为 `FileDiff[]`；数据源优先级：会话日志持久化 meta → Host 用 git/text diff 补算（bash 造成的改动由此补上）→ raw text 兜底。渲染为**左右对照**：单个表格承载「旧 | 新」两栏（删除与新增按序配对，短的一侧补占位格），两栏等宽、共用横向滚动与行高，便于逐行比对；表格以文件**最长行**为最小宽度（用 `ch` 计量，tab 记 4 格、全角记 2 格），两侧同时变宽并整体横向滚动，因此长行不会被截断。外层行已显示徽标/路径/±数时传 `hideHeader`，避免同一标题（以及同一组统计）在展开区里重复出现。

## 6. 需求 2：版本账本与恢复（只增）

### 6.1 账本（append-only，两类条目）

```
V1 ← 回合修改 (turn 3)     diff vs V0
V2 ← 回合修改 (turn 5)     diff vs V1
V3 ← 回合修改 (turn 6)     diff vs V2
V4 ← 恢复至 V2（用户触发）  diff vs V3   ← 新增条目，V3 记录不变
V5 ← 回合修改 (turn 8)     diff vs V4   ← agent 在恢复态之上继续
```

- 每回合边界（`agent/turn-stopping`，且当回合含 fs 变更）生成快照并追加条目。
- 账本可从持久会话日志全量重建；快照（git 私有 ref commit）随 repo 留存，跨重启一致。
- **只增不减（决策）**：快照与账本条目均不自动清理，符合 DSH 追加式日志理念。膨胀风险由 git 对象内容寻址/去重缓解（见 §12）。

### 6.2 恢复

- **语义**：恢复 = 把"当前工作区 → 目标版本"的差异按用户勾选范围应用。
- **与提交状态无关（决策）**：快照在边界时对**整个工作区**建树（未提交/已暂存/未跟踪全部收录），恢复预览与执行都基于文件真实内容，`git commit` 与否不影响恢复能力；恢复本身不自动 commit、不自动 stage（可选 stage）。
- **粒度三档**：全部（一键整版）/ 文件（勾选文件）/ 区域（展开到 hunk 逐条勾选）。逐 hunk 恢复对相互依赖的 hunk 给出提示；恢复后账本追加 `Vn+1 = 部分恢复到 V3 (2/4 文件)`。
- **写回会话（决策）**：恢复完成后 `agent.followup("已将工作区恢复到 V3，涉及 …")`，agent 下一轮必读，避免信息差；默认唤醒，可配置为静默。

### 6.3 降级

- 非 git 工作区：插件数据目录下影子快照（`<data>/dsh-git/snapshots/<session>/<V>/`），仅拷贝被改文件。
- 两者皆无：尝试按会话记录反演（edit 反向 + write 全量），UI 明确标注"可能发散"。

## 7. 需求 3：git 操作面板

- 形态：`shell.overlay` 全屏/大区面板，承载状态、变更、版本时间线、提交四个视图；可从变更抽屉切换全屏。
- **操作集分级**：

| 级别 | 操作 | 确认强度 |
|---|---|---|
| L0 只读 | status / diff / log / branch 查看 / 文件预览 | 无 |
| L1 常见写 | stage / unstage / commit / restore 单文件 / stash / fetch / pull | 单确认 |
| L2 危险写（决策） | push / reset --hard / 删分支 / 整版恢复 | 双确认 + `approval.request` 审批链（留痕会话日志） |

- **commit message（决策）**：输入框默认自动生成（`dsh: <会话标题> (#Vn, N 文件)`），可手改；提供"让 agent 起草"按钮——经 `agent.followup` 请 agent 结合变更内容拟 message，回复可一键套用。L1 单确认，不进审批链。
- 面板写操作在 agent 运行时（`agent/status != idle`）整体禁用。

## 8. Host/Client 数据契约（RPC，host.call）

| method | 入参 | 出参 |
|---|---|---|
| `git.status` | – | `{ branch, ahead/behind, staged[], unstaged[], untracked[] }`（porcelain 解析） |
| `git.diff` | `{ path?, base?, target? }` | `FileDiff[]`（懒加载，先 numstat 后按文件） |
| `ledger.list` | – | `LedgerEntry[]`（版本号/时间/文件数/增减/条目类型） |
| `ledger.preview` | `{ version, files?, hunks? }` | 将应用的 `FileDiff[]`（当前工作区 ↔ 目标快照） |
| `ledger.restore` | `{ version, files?, hunks?, stage? }` | 结果 + 新账本条目；随后 Host 触发写回 |
| `git.ops` | `{ op, params }`（白名单） | 结果；L2 操作先走审批 |
| `file.read` | `{ path }` | 文件文本（含大小/二进制标记） |
| `agent.pulse` | – | `{ status: idle/running, revision }`（面板轮询） |

约束：往返仅 JSON；大 diff 分批；危险操作返回审批态由客户端轮询收敛。

## 9. 安全与并发

- git 命令一律 `subprocess.spawn` 参数化执行（**不拼 shell 字符串**），命令集白名单。
- L2 操作经既有 `approval.request` 审批，答案与留痕进入会话日志。
- 互斥：agent `running` 时禁一切面板写操作；恢复/commit/push 前复查 `agent.status`。
- 恢复覆盖未提交内容属预期行为，但预览必须完整展示将变更文件（含会话外改动），确认后才执行。

## 10. 调试与交付环境

- **运行/调试实例**：`/Users/strikingly/workspace/deepseek-harness`（apps/web 构建 shell，验证 URL：`http://127.0.0.1:3080`，改动后需刷新验证）。
- **运行实例拓扑（已勘察，2026-08）**：
  - profile：`~/.dsh/profiles/web/`；组合 = bundles `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app` + `@anysearch/anysearch-dsh`；
  - 用户补丁层：`~/.dsh/profiles/web/cordis.patch.yml`（当前 `[]`）——挂 host 行/补丁的唯一入口；
  - client 模块：包 `package.json` 带 `dsh.client` 标记（platform: web、`./client` export、tsdown 构建到 lib/），由 clientModules 服务增量扫描并打入 web 启动图。
- **移植正式包路径**：在 dsh 仓库新建包（如 `packages/git/dsh-git`，host 插件 + client 模块 + `dsh.client` 标记）→ `tsdown` 构建 → profile patch 加行/加入 bundles → web 产物重建 → 刷新 3080 验证。host 行加载与实例重启策略待确认后执行。
- **开发迭代**：P0/P1 用动态 Cordis 插件（零构建）已完成验证：会话日志 meta 读回、插件侧 git 子进程（无沙盒、可 push）、Slot 渲染、RPC 闭环。注意：**双向 RPC 只收合法 JSON，参数不得含 `undefined`**（宁省略字段）；define 大载荷粘贴易失真（同内容 new 模式可过）。
- **交付物**：最终插件源码与文档落在 `deepseek-harness-plugins/plugins/dsh-git`（本仓库）。

## 11. 实施阶段

| 阶段 | 内容 | 完成口径 |
|---|---|---|
| P0 可行性 | 会话日志 meta 读回 / git 子进程 / 事件边界 / turnTail+overlay 渲染 —— 动态插件 Demo | 动态插件跑通端到端最小链路 ✅ |
| P1 MVP | Git 面板（status/diff/commit/readFile/preview）+ 回合摘要卡 | 面板 ✅（官方双面包静态安装生效）；回合摘要卡 ✅（面板「最近修改回合」+ turnTail 内联尽力而为） |
| P2 版本与恢复 | 账本 + 边界快照 + 三档恢复 + 写回会话 + 互斥/审批 | ✅ 基础实现完成（账本 + 快照 + 恢复 + 互斥） |
| P3 打磨 | 非 git 降级、大 diff 性能、主题适配、写回开关、导出打包 | **"发布形态"提前完成**（双面包 + `dsh plugin add` + docs/build.md）；其余待 P2 后 |

> 阶段校准（2026-08）：静态官方安装（原 P3 的"发布形态"）提前落地，作用是把 P2 放进已验证的正式载体。现架构 = 仓库根双面包（connection RPC 通信），P2 直接在 `src/index.js` + `src/client.js` 上扩展。

## 12. 风险与缓解

| 风险 | 缓解 |
|---|---|
| bash 造成的改动不进账本 | diff 展示用 git diff 补齐；快照为全量建树，恢复不受影响 |
| 只增不减 → 私有 ref 对象累积 | git 内容寻址去重；提供可选"导出/归档"打包，默认不删 |
| 大仓库 status/diff 慢 | porcelain + numstat 预检 + 按文件懒加载 |
| 恢复覆盖用户手改/会话外改动 | 预览完整列出 + 逐文件/hunk 勾选 + 确认 |
| 写回唤醒 agent 产生新回合 | 默认唤醒（信息差优先），提供"静默写回"开关 |
| 会话跨重启 | 账本由持久日志重建，快照在 repo ref 中，天然一致 |

## 13. 决策记录（本评审确认）

1. 恢复 = 正向应用快照，账本只增，不叫"回滚"。✅
2. 快照与账本只增不减。✅
3. 恢复后写回会话（agent.followup），消除信息差。✅
4. commit message 可默认生成，可让 agent 起草。✅
5. 恢复与提交状态无关（快照覆盖整个工作区）。✅
6. push 等高危操作入面板，但走危险区 + 双确认 + approval 审批。✅
7. diff 为共享组件，三个表面（turnTail / 抽屉 / 全屏面板）复用。✅
8. 恢复粒度支持 区域 hunk / 文件 / 全部。✅
9. 插件 Host 侧不受 agent 沙盒约束，执行 git 等同终端能力。✅
10. 调试环境：dsh 实例 `/Users/strikingly/workspace/deepseek-harness`。✅
## 13. 开发记录：P1 回合修改卡（2026-08-23 交接）

### 需求（用户原话要点）
1. agent 每次修改代码后，**在 agent 回复下方**展示本次修改的文件列表与 diff（参考 Codex 的回合内 diff 总结）；
2. 官方已有 write/edit 工具卡片的 diff 展示，插件只需做**总结层**（文件 + 增减统计，点开看详情）；
3. 只在**有文件变动的回合**显示（无变更不占位）。

### 已实现（HEAD=6bf7b00）
- host（src/index.js，connection.rpc.handle('/dsh-git')，无 typert）：
  - `dshGit/status|diff|commit|readFile`（面板：分支/分组/单文件 diff/提交/预览）；
  - `dshGit/turnDiff`：**非懒加载全量读 + 水位增量缓存**（`sessionEvents`），任一回合约 5 秒级首次、之后即时；meta 缺失时用 edit 参数（old/new_string）或 write content 合成 hunk；
  - `dshGit/turnOf`（messageId→回合）、`dshGit/recentTurns`（readSurface lastSeq 窗口，面板「最近修改回合」）。
- client（src/client.js）：
  - 面板（shell.overlay）含「最近修改回合」兜底列表（已验证显示）；
  - **keyed 替换** `conversation.chat.node` 的 `turn-tail` 键（声明 children 保留子座位），`TurnNodeSummary`：有变更→蓝标总结卡（逐 hunk 展开）；无变更→精简尾行 `turn N · 本回合无文件变更`；
  - 面板头 `BUILD_TS` 秒级戳 + 「最近修改回合 · seen=…」探针（排查缓存与节点调用）。
- 构建：`node scripts/build.mjs`；**⚠️ 每次改动必须重启 dsh 实例**（bundle URL rev 在启动时生成，仅刷新会命中浏览器缓存旧产物——多次"强刷无效果"的根因之一）。

### 已根因定位并修复
- **窗口默认区间 bug（"懒加载后一直无法显示"的主因）**：`turnDiff` 窗口化后，未传 `upToSeq` 时默认 `MAX_SAFE_INTEGER` → 窗口起点超出日志已存前缀 → `readFrom` 返回空 → files 恒 `[]` → 卡片永不渲染；面板因 `recentTurns` 另走了 `readSurface.lastSeq` 而未受影响。修复：turnDiff 回归全量缓存扫描（用户要求"改回无懒加载版本"后最终实现）。

### 未解决 / 待新 agent 排查
1. **内联卡（turn-tail 键）至今未在用户浏览器出现可见内容**；面板（同一数据源）始终正常。已排除：RPC 链路（信封直测全通）、数据（turnDiff 真返回 files+hunks）、注册（探针曾见 65/67 等被调用）、缓存（秒级戳可确认新产物）。
2. **最大嫌疑**：`turn-tail` 尾区节点对"工具收尾型回合"（write/edit 后无收盘文本、`closing=null`）可能不存在——观测到 turn 66（演示改文件回合）无对应请求，而同区 65/67 有；官方自身回合尾（时间/词元行）在该类回合同样不显示。需浏览器侧确认（面板 `seen=` 对改文件回合是否出现）。
3. keyed 替换是否真正接管官方 `turn-tail` 渲染器未确认（若注册冲突，面板会显示 `tail=err`）。
4. 全部演示改文件（write/edit 工具调用）恰好都落在"工具收尾型"回合，导致时序上始终错过验证窗口；建议用"正常带收盘文本的编辑回合"验证，或接受面板兜底为准。

### 排查速查（给接手的 agent）
- 面板头戳应为 `08-23 12:28:01` 对应构建；「最近修改回合 · seen=…」列出被尾区调用过的回合号。
- host 直测模板：POST `/dsh-git/dshGit/turnDiff` body `{"type":"client-request","rpcId":"p","method":"dshGit/turnDiff","payload":{"args":{"sessionId":"<SID>","turn":<N>}}}`。
- 会话日志：`~/.dsh/sessions/--Users-strikingly-workspace-deepseek-harness-plugins-plugins-dsh-git--/session-73f52534-1263-47e5-b12f-f2cf063b314b/session.jsonl.zstd`（zstd -d -c）。

## 14. P1 回合修改卡重构（2026-08-25）

### 问题根因
原方案使用 `conversation.chat.node` 的 `turn-tail` 键控替换，试图让 `TurnNodeSummary` 接管官方的 `TurnTailNodeView`。但存在两个根本问题：

1. **键控插槽竞争不确定**：官方 `TurnTailNodeView` 作为核心 bundle 先注册，dsh-git 作为插件后注册。键控插槽中同一 key 只有一个赢家，先注册者通常优先。
2. **"工具收尾型回合"的 turn-tail 渲染为空**：当 `closing === null`（纯工具调用回合无文本响应）时，`TurnTailNodeView` 的行为是：
   ```typescript
   if (closing === null) return tail === null ? null : <div>{tail}</div>
   ```
   当 chain 为空时渲染结果为 null，导致 dsh-git 的组件永远不会被挂载。

### 新方案：turnTail chain 条目
改为注册 `conversation.chat.turnTail` **chain** 条目（而非 keyed 替换）：

```javascript
const disposeTurnTail = slots.inject('conversation.chat.turnTail', () =>
  slots.register({
    name: 'conversation.chat.turnTail',
    id: 'dsh-git-turn-diff',
    order: 10,
  }, TurnDiffSummary))
```

**关键优势**：
- chain 条目在 `closing === null` 时也会渲染（`TurnTailNodeView` 第 25 行保证）
- 不与官方 renderer 竞争，chain 是独立通道
- 数据来源：直接从会话快照读取（`useSession` → `chat.locations.getTurn()` → `chat.nodes.get()` → `tool-call` 节点的 `callView`/`resultView`）
- 复用官方的数据管道：write/edit 工具的 `presentCall`/`presentResult` 生成 `card: 'diff'` 视图

### 数据流
```
ConversationSnapshot
  └→ chat.locations.getTurn(turn) → 该回合所有节点的 key[]
  └→ chat.nodes.get(key) → ChatConversationViewNode
      └→ kind === 'tool-call' 时
          └→ data.root (ToolCallBlock)
              ├→ callView:    { card: 'diff', diffs: [...] }  (运行时)
              └→ resultView:  { card: 'diff', diffs: [...] }  (完成后)
```

### 删除的组件
- `TurnNodeSummary`：原 turn-tail keyed 替换组件
- `TurnTailCard`：未使用的 chain 组件
- `GitSummary`：assistant-actions 组件（在 closing === null 时不渲染）

### 新增的组件
- `dshGitDiffsDefinition()`：Conversation Node Definition（数据累积器，无视图节点）
- `selectTurnDiffs(owner)`：chain selector，从 `owner.turn.data.get('dsh-git-turn-diffs')` 读取
- `TurnDiffSummary(props)`：turnTail chain 条目，渲染回合级 diff 汇总

### 复核修正（2026-08-26，dsh 仓库 8/25 重构后）
dsh 仓库在 8/25 重构（`conversation-nodes` 从 ui-conversation 移到 ui-chat、`match.view` 机制移除、`@deepseek-ai/dsh-client-runtime` 包删除）。首版新方案基于重构前的 API，导致"回合下方什么都没有"。修正点：

1. **数据源**：`match.view` 已移除 → 改从 `tool/result` 事件的 `meta.diffs` 提取（官方 diff-card-model 的同一数据源）；meta 缺失时用 write/edit 调用参数合成 hunk（官方 fallback 同款）。
2. **`buildLocationData` key 约束**：返回的 `key` 必须等于 definition 的 `kind`（assembler 强校验，否则抛错）→ key 统一为 `'dsh-git-turn-diffs'`。
3. **chain 注册必须带 `select`**：chain 条目缺 selector 是注册契约违约（SlotCore 校验），首版漏掉 → 补 `select: selectTurnDiffs`。
4. **surface 过滤**：tool/result 事件加 `surfaceOp === 'append'` 过滤（与 ui-deliverables 一致），避免替换表面的重复计数。
5. **package.json**：`dsh.client.inject` 移除已删除的 `@deepseek-ai/dsh-client-runtime`。

### 最终修复（2026-08-26 晚，回合卡已显示）
面板诊断（`diag: uiConv=N events=N conn=Y · selLast=8(empty)`）定位到最后一环：

- **`ctx.get('uiConversation')` 对未在 `exports.inject` 声明的服务返回 undefined** —— cordis 依赖解析机制。官方消费者（ui-chat / ui-deliverables）都把 `'uiConversation'` 放进 inject 列表。
- 修正：`exports.inject = ['slots', 'connection', 'uiConversation']`。加载顺序由 `dsh.client.inject` 中的 `@deepseek-ai/dsh-client-ui-conversation` 依赖保证（clientModules 的 `orderByModuleGraph` 拓扑排序）。
- 连锁效应：之前 definition 从未注册 → `turn.data` 无 `'dsh-git-turn-diffs'` → selector 恒返回 null → 卡片永不渲染。chain 本身一直正常（`selLast=8` 证明 selector 被调用）。

### UI 重构（2026-08-26 晚）
全部样式改用官方 `--dsw-alias-*` 设计 token（自动适配明暗主题），类名统一 `dg-` 前缀避免与官方样式冲突：

- **回合卡**（`TurnDiffSummary`）：迷你 commit 卡设计。签名元素 = 左侧 2px business 色 diff-gutter 竖线；头行 = `dsh-git` 标签 + 摘要 + 右对齐等宽 `+A −R`；文件行 = chevron + 等宽路径 + 红绿统计；展开 diff 完全复用官方 DiffBlock 语言（代码块背景、path header 600 权重、`- `/`+ ` 前缀、`└ +A -R · N hunk` footer）。
- **Git 面板**：`--dsw-alias-bg-overlay` 背景、business 色激活 tab、等宽数据；诊断行保留（等宽 caption 小字）。
- **数据口径**：行数统计与官方 `DiffBlock.contentLines` 一致（尾部换行是终止符不算行）。

### 验证链（当前实现）
```
tool/result 事件（surfaceOp=append，非错误）
  └→ dshGitDiffsDefinition.update：meta.diffs 或参数合成
      └→ buildLocationData 发布 turn.data['dsh-git-turn-diffs']
          └→ TurnTailNodeView renderSlotChain('conversation.chat.turnTail', {turn, seq, openFile})
              └→ selectTurnDiffs(owner) → 非空 diffs → TurnDiffSummary 挂载
                  └→ props.matched = diffs[]，按 path 分组渲染 +N −M 与 hunk 展开
```

关键前提（已在 dsh HEAD 核实）：`TurnTailNodeView` 第 27 行 `if (closing === null) return tail === null ? null : <div>{tail}</div>` —— 即使纯工具回合（无收盘文本），chain 内容也渲染。

## 15. P2 版本与恢复实现（2026-08-26）

### 实现概览

P2 在 P1 基础上扩展了恢复功能。**核心设计变更**：恢复操作直接集成在回合摘要卡上，而不是单独的 Git 面板 tab。用户可以在每个回合的 diff 汇总上点击"恢复"按钮，撤销该回合的代码修改。

### 设计决策

**恢复操作的位置**：
- ❌ 原方案：Git 面板新增"版本" tab，展示版本时间线
- ✅ 新方案：恢复按钮直接在回合摘要卡（TurnDiffSummary）的头部

**原因**：
- 用户的心智模型是"撤销这个回合的修改"，而不是"恢复到某个版本"
- 回合摘要卡已经展示了修改内容，恢复操作应该就近放置
- 避免在 Git 面板上增加复杂度

### Host 端实现（src/index.js）

**新增 RPC：`restoreTurn`**：
- 入参：`{ sessionId, turn }`
- 逻辑：
  1. 从会话日志中找到该回合的所有 `write/edit` 工具调用
  2. 对每个 `edit` 调用：读取当前文件内容，将 `new_string` 替换回 `old_string`
  3. 对 `write` 调用：跳过（无法自动恢复，因为不知道修改前的内容）
- 出参：`{ restored: string[], errors: Array, turn }`

**互斥检查**：
- `agent.status` RPC：检查 agent 是否运行中
- 恢复按钮在 agent 运行时禁用

### Client 端实现（src/client.js）

**TurnDiffSummary 组件增强**：
- 头部新增"恢复"按钮（dg-btn 样式）
- 点击后弹出确认对话框
- 确认后调用 `restoreTurn` RPC
- 恢复成功后显示结果（恢复了几个文件，有几个错误）

**UI 细节**：
- 恢复按钮：business 色边框，11px 小字，agent 运行时半透明
- 确认对话框：border-l1 边框、bg-base 背景、business 色确认按钮
- 错误提示：write 操作无法自动恢复时显示警告

### 已移除

- ~~LedgerTab 组件~~：不再需要单独的版本时间线 tab
- ~~ledger.list / ledger.preview / ledger.checkpoint / ledger.restore~~：简化为单个 `restoreTurn` RPC

### 写回会话实现

恢复操作完成后，通过 `agent.followup()` 注入消息到会话：

```javascript
const agent = ctx.agents.get(sessionId)
if (agent) {
  const message = `用户将工作区恢复到 turn ${targetTurn} 之前的状态，撤销了 ${turnsReverted.length} 个回合的修改，恢复了 ${restored.length} 个文件：${fileList}。请知晓当前工作区已变更。`
  agent.followup({ role: 'user', content: [{ type: 'text', text: message }] })
}
```

- 消息在 agent 下一轮对话时必读
- 消除信息差：agent 知道文件被恢复了
- followup 失败不影响恢复结果（降级为静默恢复）

### 恢复逻辑

**核心设计**：恢复到某个回合的状态 = 撤销该回合及之后的所有修改

```
当前状态：回合 1 → 2 → 3 → 4 → 5 → 6 → 7
用户点击回合 5 的"恢复到此"
实际操作：撤销回合 7 → 撤销回合 6 → 撤销回合 5
结果：回到回合 4 的状态
```

**原因**：
- 后面的回合可能会修改前面回合已经修改过的内容（交叉修改）
- 如果只撤销单个回合，会导致文件状态不一致
- 按时间倒序撤销可以保证正确性

**数据来源**：
- 使用 `tool/result` 事件的 `meta.diffs.oldText`（修改前的内容）
- 不依赖 git，直接从会话日志获取

### 待完善

1. **hunk 级恢复**：当前只实现文件级恢复
2. **非 git 降级**：影子快照方案待实现

## 16. 回合卡与官方「本轮文件改动」的链竞争修复（2026-09-17）

### 症状
官方 `ui-deliverables` 的「本轮文件改动」行（见截图：`本轮文件改动 </> a.ts </> b.tsx 📄 mr.md`）有时被 dsh-git 的「本回合修改 N 个文件」卡整行替换。

### 根因
`conversation.chat.turnTail` 是 **chain** 槽，选举是**单赢家**语义（`packages/client/ui-chat/src/client/contract/slots.ts`）：

- `packages/client/ui-slots/src/index.ts`：chain 条目只按 `priority`（升序，默认 0）排序，**同优先级保持注册顺序**；`order` 只对 list 槽生效，chain 完全忽略。
- `packages/client/ui-renderer/src/client/scoped-slots.tsx`：按序跑 `select`，**第一个非 null 的条目独占渲染**，其余条目根本不会挂载。

官方 `ui-deliverables` 与本插件都注册在这个链上，且**选择器命中的是同一批回合**（都基于成功的 write/edit 结果）：

| 插件 | 注册参数 | 实际优先级 |
|---|---|---|
| `@deepseek-ai/dsh-client-ui-deliverables` | 只传 `select` | 0 |
| `dsh-git`（旧） | `order: 10` | **0**（`order` 无效） |

于是胜负由注册顺序决定，而客户端插件在启动时是**并发应用**的（`packages/client/web/src/boot-client.ts`：`Promise.all(rows.map(name => loader.create({ name })))`），所以谁先 apply 是不确定的竞态——dsh-git 先到时就把官方整行覆盖掉。

### 修复：确定性选举 + 由本插件渲染官方行（最终方案）
注册选项由 `order: 10` 改为 `priority: -1`，并让本插件的 chain 条目**自己渲染官方行 + 自己的卡片**：

```
TurnTailSummary（本插件条目，priority -1，必然当选）
  ├─ <ProducedFiles matched={produced} openFile t />   ← 官方「本轮文件改动」行，直接用官方公开组件，不是仿制
  └─ <TurnDiffSummary />                               ← 本插件回合卡（+A −R、逐文件展开、恢复到此）
```

- 官方 `@deepseek-ai/dsh-client-ui-deliverables/client` 的公开导出只有 `ProducedFiles` 与 `producedForClosing`——正好够渲染那一行；样式由官方 bundle 在模块求值时注入（`data-plugin-css`），复用组件即复用其文案、图标、六个 chip 上限与容器查询响应式。
- `selectTurnTail(owner)`：
  - 纯函数，只读 turn data（`deliverables` / `dsh-git-turn-diffs`），不再有渲染期副作用（旧 `state.tailSeen[...] = true; emit()` 已删除）。
  - **带显式 `present` 交付的回合一律 decline**：那些卡片及宿主打开/预览控制器（`Deliverables` + `PresentedOpenController`）官方未导出，本插件无法复现，交回官方条目整体渲染，官方能力零丢失。
  - 只有 produced、且官方组件不可用（包被组合出去/导出漂移）时也 decline，绝不把官方行拿走却渲染不出来。
- **降级**：`require` 失败（profile 未组合官方包）时 `officialProducedFiles` 为 null，条目只渲染自己的卡片；produced-only 回合交回官方条目。
- 由于不再有竞态，`priority: 0` 的旧值与 `order` 都已无意义；`order` 只对 list 槽生效，chain 只看 `priority`。
- 包声明：`dsh.client.inject` 增加 `@deepseek-ai/dsh-client-ui-deliverables`（到达顺序）与 `@deepseek-ai/dsh-client-locale`（渲染官方行需要 `deliverables` 命名空间的 `t`）；`dsh.client.external` 声明该官方包。

### 配套：加法式的回合恢复动作
整卡回来之后仍保留 `conversation.chat.assistant-actions` 的恢复图标（list 槽，叠加不抢位）：

```
TurnTailNodeView
  ├─ renderSlotChain('conversation.chat.turnTail')  → 官方行 + 本插件卡片
  └─ MessageIconActions extraActions={renderSlot('conversation.chat.assistant-actions')}
                                                    → dsh-git 恢复图标
```

它覆盖卡片缺席的场景（present 回合、以及卡片未当选时），与卡片上的「恢复到此」按钮是同一操作的两种入口。

- `RestoreTurnAction(props)`：owner 只有 `{ messageId }`（ui-session 另注入 `sessionId`）。挂载时用 `dshGit/turnOf`（messageId → turn）再 `dshGit/turnDiff` 探测该回合是否有改动；**无改动则渲染 null**。
- `turnProbeCache` / `turnProbeInFlight`：一个 messageId 只探测一次（回合定稿后记录不再变化，无需整体失效）；并发条目共享同一次探测，落地后 `emit()` 触发重渲染。
- 点开就地确认气泡（`.dg-action-pop`），确认走既有 `dshGit/restoreTurn`；`dshGit/agent.status` 判定 agent 运行中则禁用确认。
- 图标样式对齐官方 `MessageIconActions`（28px 圆形热区、15px 线稿、tertiary→secondary hover）。
- 注意：`closing === null` 的纯工具回合 `TurnTailNodeView` 只渲染 tail、不渲染 actions，这类回合靠卡片上的「恢复到此」按钮；老回合的动作行默认 hover 才显形。

Host 侧配套：`turnOf` 改为读取**增量缓存的全会话日志**（`sessionEvents`），不再每个消息重新 `readFrom` 一个 20000 事件的窗口。

### 已知代价
- 与官方 `ui-deliverables` 的**公开导出**耦合（`ProducedFiles` / `producedForClosing`）；官方若改动这两个导出，需要同步跟随（已在 selector 里做降级）。
- `present` 交付回合由官方条目渲染，本插件的整卡在这些回合不显示（换取官方交付卡片 100% 保留）。

### 回归校验
`scripts/verify-client.mjs`（`pnpm verify:client`，需 `DSH_CHECKOUT` 指向已构建的 dsh 仓库）用真实 `SlotCore` + jsdom/React 跑 18 项检查：两种注册顺序下官方行与卡片同时渲染且当选者是 dsh-git（priority -1）、present 回合让回官方、无官方包时降级为纯卡片且不抢 produced-only 回合、空回合不渲染、两个 action 条目共存、恢复图标仅在改动回合出现、确认后调用 `restoreTurn`、agent 运行中禁用、同一 messageId 只探测一次。

> **本节已被 §17 取代（2026-09-17 晚）**：回合卡与恢复动作全部移除，插件不再占有任何聊天槽位。

## 17. 改为悬停官方 chip 的 diff 浮窗（2026-09-17 晚）

### 需求（用户原话）
> 去掉回合 card 吧，改成鼠标 hover 官方文件改动列表的文件名称时，弹出一个文件 diff 悬浮窗口（类似 popover），diff 保持左右布局。

> 恢复代码回合功能也去掉。

### 结论：退出聊天槽位竞争
§16 的方案（`priority: -1` 抢 `conversation.chat.turnTail`、由本插件渲染官方行 + 自己的卡）整体删除：

- 不再注册 `conversation.chat.turnTail`（含 `selectTurnTail` / `TurnTailSummary` / `TurnDiffSummary`）；
- 不再注册 `conversation.chat.assistant-actions`（`RestoreTurnAction` / `turnProbeCache` / `probeTurnChanges`）；
- 不再注册会话 Definition `dshGitDiffsDefinition`（它只为那张卡发布 turn data），`exports.inject` 收窄为 `['slots', 'connection']`；
- 不再 `require('@deepseek-ai/dsh-client-ui-deliverables/client')`，`dsh.client.inject`/`external` 相应去掉 `ui-deliverables` 与 `locale`。

官方行于是 100% 由官方渲染：带 `present` 交付的回合、六个 chip 上限、容器查询响应式、
文案与图标全部保持官方行为，插件侧没有任何"复刻"或"让位"逻辑。

### 新表面：`shell.overlay` 上的悬停浮窗
```
官方 ProduceFiles 行（ui-deliverables，原样）
  └─ [data-produced-files-row] button[title="src/x.ts"]
        ▲ mouseover（document 捕获阶段委托）
        │
installHoverListeners（apply 时安装，dispose 时移除）
  ├─ chipTarget(event)   → { chip, path(title), turn(最近的 [data-turn-tail]), rect }
  ├─ open/close 定时器   → 打开延时 140ms（悬停意图），关闭宽限 180ms（进出浮窗不闪）
  └─ setHover(state)     → DiffHoverPopover 订阅重渲染
        └─ shell.overlay（list 槽，order 90，与 order 100 的面板共存）
              └─ .dg-diff-pop（position: fixed，按 chip 视口 rect 定位/夹取）
                    ├─ head：徽标 + 完整路径 + turn N + ± 统计
                    └─ body：DiffViewer（hideHeader）+ 单一滚动盒
```

要点：

- **不碰官方 DOM 结构**：只用官方已公开的 DOM 约定——chip 的 `title` 是完整路径，
  回合号取最近的 `[data-turn-tail]`（`ui-chat/TurnTailNodeView.tsx` 的
  `data-turn-tail={data.turn}`），纯工具回合（`closing === null`，官方只渲染裸 div）回退到
  聊天行的 `[data-chat-turn]`（`ui-chat/ChatNodeSeat.tsx`）。会话 id 由插件在会话头部
  （session 作用域槽）捕获。
- **数据源**：`dshGit/turnDiff`（host 已有，增量缓存全会话日志后按回合聚合 write/edit 的
  `meta.diffs`）；客户端按 `sessionId+turn` 缓存 Promise，同一回合的多个 chip 只请求一次，
  失败的 key 会被移除以便重试。
- **左右布局**：完全复用面板的 `DiffViewer`：host 的 `hunks[{oldText,newText}]` 被还原成
  "每个 hunk = 先全旧行、再全新行"的 `FileDiff`，`splitRows` 逐行配对，短侧补 `dg-ds-void`
  占位格；同一个表格承载两栏，行高与横向滚动都不会各走各的。
- **宽度**：浮窗按视口取宽（`min(1180px, 视口 − 32px)`，最小 360px），**不局限于聊天列**——
  两栏代码并排，窄浮窗会把每栏压到几百像素而看不全代码；允许浮窗盖住右侧栏换取可读宽度，
  左边界再夹回视口内。首版 720px 反馈"左右代码无法看全"，故放宽。
- **行号 = 文件真实行号**：`meta.diffs` 只带每个 hunk 的 before/after 文本，没有位置，所以
  旧实现按 hunk 内 1..N 编号（文件第 120 行的改动显示成 1、2、3）。现在 host 在
  `turnDiff`/`recentTurns` 里把每个 hunk 的新侧文本在**磁盘文件**中定位，回填
  `newStart` 与 `oldStart`（同一 hunk 的旧侧与 hunk 首行同号，同一 edit 内后续 hunk 再按前面
  hunk 的净增删行数偏移），客户端 `fileDiffFromHunks` 直接从起点连续编号（hunk 每侧本就是该
  文件版本里的一段连续行）。定位先用整段文本精确匹配，失败退到前 3 行、再退到首行；都失败就
  **留空**——不填一个看起来像真行号的 1..N 去骗人。刚落幕的回合文件就是 after 态，因此行号
  精确；老回合若被后续回合改过同一段，匹配失败→留空。
  三个配套修正（都由"行号看起来不对"暴露出来）：
  1. **锚定按 edit 调用分组**：同一回合里一个 edit 可能改到比上一个 edit 更靠前的行
     （实测 BUILD_TS 那处改在第 1 行、另两处在 561/887 行）。原先整份文件共用一个单调
     cursor，后面的 hunk 会被前面的 cursor 挡死 → 按 `hunk.call` 分组，每组各自重置 cursor
     与 delta（组内 hunk 有序且互不重叠，组间不保证）。
  2. **失败的 edit 不再算作改动**：`edit` 被拒（old_string 未命中）时 `tool/result` 是
     `isError`，没有 diff meta；旧代码于是退回用调用参数合成 hunk，把**从未发生的修改**画进
     了 diff（用户截图里那个 1..10 的幽灵 hunk 就是它）。现在带 `isError` 的结果一律跳过，
     文件都不进列表，`+A −R` 统计也随之修正（实测该回合 client.js 从 +48 −30 修为 +39 −30）。
  3. **`scanTurns` 丢 callId**：call 记录从未带 `callId`，`t.results.get(call.callId)` 恒为
     `undefined`，于是 `meta.diffs`（带 3 行上下文的真实 hunk）从来没被用上，一直退回用参数
     合成；补上后 hunk 既准确又可锚定。
  4. **hunk 按文件行序输出**：hunk 原本按 edit 调用（时间）顺序排列，锚定又按调用分组，
     于是一份文件里会出现 945-948 排在 1-5 前面。现在锚定后按 `newStart`（无则 `oldStart`）
     升序稳定排序，无锚点的 hunk 保持在末尾（用户反馈"行号为何不是升序"即此）。
- **长行两种读法，默认折行 + 可切回滚动（VSCode diff 式）**：浮窗头部的 `⇄ 滚动` / `↵ 折行`
  按钮在两种模式间切换（选择在同一页面内保持）：
  - **折行（默认）**：`DiffViewer` 传 `wrap`，去掉表格 `min-width` 下限，代码格
    `white-space:pre-wrap; overflow-wrap:anywhere`——两栏永远等于浮窗宽度，长行在自己栏内折行，
    左右两侧同时可读；同一行两侧仍顶对齐（共用一行表格，只有折行的那格变高）。
  - **滚动**：不再用"一张六列表格 + 单个横向滚动"，而是 `SplitPanes`：左右各一张三列表格、
    各自一个 `overflow-x:auto` 的 `.dg-pane`，**每侧都有自己的横向滚动条且常驻可见**
    （`::-webkit-scrollbar` 11px 高对比 thumb + `scrollbar-width:thin`）。两侧表格共用同一个
    每侧 `min-width`（取两侧最长行），滚动范围完全一致；任一侧 `scrollLeft` 变化时把另一侧
    镜像过去（`lock` 标记 + rAF/0ms 释放，避免回环），因此一行的左右两半始终对齐。
    纵向滚动仍由浮窗 body 统一承担，两栏一起上下走。
  - **横向滚动时行号不动**：`.dg-pane` 内 `td.dg-ds-num` / `td.dg-ds-mark` 用
    `position:sticky`（`left:0` / `left:44px`）钉在左缘，与 VSCode 一致 —— 拖到长行中段时
    仍知道是第几行。sticky 单元格必须**不透明**，否则代码会从底下透出来；行状态底色本身是
    半透明（`6–9% + transparent`），所以钉住的列改成把同一比例混到浮窗底色上
    （`color-mix(in srgb, <tint> 9%, var(--dsw-alias-bg-overlay, …))`），并给符号列加一条
    1px 阴影当分界。折行模式没有横向滚动，不需要 sticky。
  - 两种模式的每一行都来自同一个 `diffRowDescriptors(file)` 列表（hunk 分隔/上下文/代码行），
    所以切换模式不会改变行的内容与顺序。
  - 面板内保持原有"最宽行撑开 + 横向滚动"的单表模式。
- **加/删文字色随主题自适应**：设计系统里 `--dsw-alias-state-success-primary` 明暗两套主题都是
  同一个 green-500（`rgb(34,197,94)`）——在浅色底上只有 **2.28:1** 对比度（而删除色用的是
  red-600，4.5:1），这就是"绿色字体太亮、有点看不清"的来源。插件把加/删文字色统一改成
  `color-mix(in srgb, <state> 60%, var(--dsw-alias-label-primary))`：浅色主题混向近黑 →
  `rgb(26,126,65)`（5.18:1），深色主题混向近白 → `rgb(120,218,157)`（10.69:1）。
  这两个值声明在 `.dg-panel,.dg-diff-pop` 上成为 `--dg-add-fg` / `--dg-del-fg`
  （主题 token 定义在 `body` 而不是 `:root`，声明在 `:root` 会解析不到），加/删的代码文字、
  行号、`+/-` 标记、徽标字母与 `+A −R` 统计全部走这两个变量；行底色仍用原始 token 的
  6–9% 淡色，色相语义不变、只是不再刺眼。
- **原生 tooltip 静音**：chip 的 `title` 会被临时移到 `data-dsh-git-path` 并移除，避免浏览器
  tooltip 稍后压在浮窗上；浮窗关闭或切换到别的 chip 时原样还回。
- **关闭时机**：移出 chip/浮窗 180ms 后、`Esc`、聊天流滚动（浮窗内部滚动不算）、窗口尺寸变化。
- **降级**：定位不到会话 / 回合，或该回合没有这个文件的记录（例如改动来自 bash），浮窗内
  给出说明文案；host 报错则显示错误信息。
- Host 侧同步删除只为恢复功能存在的 `restoreTurn`、`turnOf`、`agent.status` 三个 RPC 及其
  `removePath` 辅助函数与 `agents` 注入；`ledger.*`（P2 检查点账本）保持原样。

### Host 传输层：改为插件自己注册 `/dsh-git` 路由（同日晚，修 405）

**症状**：悬停浮窗内显示 `transport failure for /dsh-git/dshGit/turnDiff: HTTP 405`。

**定位**（用一个 `DSH_HOME` 隔离实例复现 boot）：
```
dsh: warning: 1 entry did not activate
dsh-git (dsh-git): Error: cannot get property "webServer" without inject
  at rpc-host.ts:179  ← owner.effect(() => owner.webServer.register(route))
  at Object.handle (rpc-host.ts:82)
  at new apply (dsh-git/lib/index.js)
```
`ctx.connection.rpc.handle('/dsh-git', …)` 内部把路由注册挂在**连接服务自己的 context** 上
（`HostConnectionService.rpc` getter 里的 `const owner = this.ctx`），而当前 harness 行的
connection 插件 `inject` 只有 `credentials`（`webServer` 只在其内部 `ctx.inject(['webServer'])`
里为 `/api` 路由使用），于是 `owner.webServer` 抛错 → **整个 host 插件不激活** → `/dsh-git`
前缀从未注册 → 未注册路径的 POST 落到静态 fallback，返回 405。
（此前 §16 的注释已预判过这条路径，但结论"声明 webServer 也没用"是对的：出问题的是别人的
context，本插件声明无济于事。）

**修复**：不再走 `connection.rpc.handle()`，改为用插件自己 `inject` 的 `webServer` 直接注册
前缀路由，并自己实现同一套 envelope 载体：

```
ctx.effect(() => ctx.webServer.register({ kind:'prefix', path:'/dsh-git', handler }), 'dsh-git rpc route')
      handler:
        method !== POST                → 405
        ctx.connection.requestRejection(req)  → 401/403（复用 Host/Origin + 浏览器会话鉴权）
        JSON.parse(body)               → 400
        answerEnvelope(ctx, envelope)  → { type:'server-response', rpcId, result }
```

- 路由生命周期改由插件自己的 fiber 拥有（HMR 重载会干净地 dispose + 重新注册，不再残留别人的 effect）。
- 请求/响应形状与 Connection 的完全一致，客户端 `connection.rpc.call` 无需改动。
- 独立性更好：只要 `webServer` + `connection.requestRejection` 两个公开面在，harness 内部
  `rpc.handle` 的 owner-context 实现怎么变都不影响本插件。

**验证**（隔离实例 + 真实会话日志）：
- boot 日志不再有 `did not activate` / `cannot get property`；
- 未鉴权 `POST /dsh-git/dshGit/status` → 401；`GET` → 405；
- 用 root token 换 cookie 后 `dshGit/status` → 真实 branch/staged/unstaged/cwd；
  `dshGit/recentTurns` 与 `dshGit/turnDiff` → 真实 files/hunks（浮窗数据源）。
- 常驻回归：`scripts/verify-host.mjs`（`pnpm verify:host`，21 项，无需 harness/服务器）
  用假 `webServer`/`connection`/`subprocess`/`fs` 直接驱动注册出来的 route handler，覆盖
  prefix 注册、非 POST 405、401/403 复用、坏 JSON 400、未知 endpoint/越界 method 的
  错误形状、缺 sessionId、真实 dispatch 下 `git status --porcelain=v1 -b` 的解析结果与响应
  framing，以及行号锚定（多 hunk 偏移、新建文件从 1 开始、**失败 edit 零贡献**、
  **同一回合多次 edit 各自独立锚定且输出按文件行序**、文本已变/文件不可读时留空、
  锚定输入不泄漏进 payload、同一文件每次请求只读一次）。

### 回归校验
`scripts/verify-client.mjs` 为 41 项检查：聊天槽位里没有 dsh-git 条目、`shell.overlay`
同时存在面板与浮窗、悬停延时后才打开、按 `sessionId+turn` 只请求一次、头部路径/回合/徽标/±、
**加/删文字色走主题自适应变量而非原始 state token**、
六列左右对照与短侧占位对齐、**浮窗默认折行（无 min-width 下限）**、
**切到滚动模式后左右各一个 `.dg-pane`（各自 min-width 下限、各自渲染本侧单元格），
一侧 scrollLeft 变化时另一侧镜像（双向），且行号/符号列 `position:sticky` 不透明地钉在左缘**、
再切回折行、浮窗按视口取宽（≥900px）而非压缩两栏、
**携带 `oldStart`/`newStart` 的 hunk 渲染文件真实行号、无锚点时行号留空**、
同 chip 重复悬停不重取、移入浮窗保持打开、移出后关闭并还回
tooltip、同回合换 chip 复用缓存并交换内容、纯工具回合回退 `[data-chat-turn]`、
无记录/无会话/无回合/请求失败四种降级、滚动关闭、移动鼠标不会不断续期关闭定时器。

### 已知代价
- 与官方三个 DOM 约定耦合（`[data-produced-files-row] button[title]`、`[data-turn-tail]`、
  `[data-chat-turn]`）：官方若改名，浮窗会静默不触发（不会报错，也不会破坏官方 UI）。
- 浮窗是 `position: fixed` 的固定定位，聊天滚动即关闭，不跟随锚点重定位；接近全宽时可能
  盖住右侧栏（这是换取两栏代码可读宽度的有意取舍）。
- 行号锚定以**磁盘当前文件**为基准：刚落幕的回合精确；老回合的同一段被后续回合改写后匹配
  失败，该 hunk 行号**留空**（会话日志只保留 hunk 文本，`meta.diffs` 本身不带位置，无法做到
  历史精确）。留空是有意的：填一个 1..N 会被读成真实行号，比没有更糟。



