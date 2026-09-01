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

- **回合摘要卡**（主战场）：`conversation.chat.turnTail`，回合结束后渲染 `本回合修改 3 文件 · +24 −10 [展开]`，展开为逐文件逐 hunk diff。内容少时天然在聊天流内。
- **变更抽屉**（增强）：`shell.overlay` 右侧抽屉，浏览任意历史版本的完整 diff（DiffViewer `inline`）。
- **DiffViewer 组件**：唯一的 diff 渲染组件，三种模式（compact/inline/full）由 props 切换；输入统一为 `FileDiff[]`；数据源优先级：会话日志持久化 meta → Host 用 git/text diff 补算（bash 造成的改动由此补上）→ raw text 兜底。

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
