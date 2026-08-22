# dsh-git 打包方式选型与产物契约（第三方插件）

> 定位：DSH 官方生态的**第三方插件**（非 deepseek-ai 官方内置包）。
> 结论（2026-08 定稿）：**仓库根双面包 + Connection RPC + 手写构建脚本**，不使用 tsdown/tsc/typert。

## 为什么不用 tsdown/tsc/typert

| 工具 | 在 DSH 中的角色 | 对第三方插件 |
|---|---|---|
| tsc + tsdown | 官方内置包（`packages/` 内）的编译与打包流水线：`tsc -b` 项目引用 → tsdown 工作区构建 → `typertPlugin`/`clientBundle` 插件 | 可不用。运行时的产物契约只有两个文件，不依赖这套 |
| typert | 官方内置包之间"浏览器⇄host"的类型化 RPC 代码生成（`@Remote` → `typert.*` 面 → api-remotes 网关） | **不要用**：生成器只在 harness 仓库构建链里；第三方包一旦引入就被迫进 monorepo |

**历史教训**：曾尝试按 monorepo 方式把插件做成 `packages/` 成员（tsc 项目引用、根 tsconfig 编辑、typert 导出契约、files 字段、符号链接不被 pnpm 链接、profile 解析链），全部是为官方内置包设计的机制；legacy 见 `legacy/monorepo-attempt/`。

## 最合适方案（当前仓库形态）

```
dsh-git/                      # 仓库根 = 双面包插件包（包名 dsh-git，无官方 scope）
├── package.json
│     name: dsh-git
│     dsh.bundle.patch: ./cordis.patch.yml
│     dsh.client: { inject: [...], platform: web }
│     exports: { ".": lib/index.js, "./client": lib/client.js }
│     scripts: { build/prepare/prepack: node scripts/build.mjs }
├── cordis.patch.yml          # - insert: [- id: dsh-git, name: 'dsh-git']（一行）
├── src/index.js              # 宿主：const connection / subprocess / sessionQuery / fs
│                              #   ctx.connection.rpc.intercept('/api', …) 暴露 dshGit/*
├── src/client.js             # 浏览器：factory(require) 闭包内注册 slots + connection.rpc.call
├── scripts/build.mjs         # ~25 行：拷 src/index.js→lib/index.js；
│                              #   src/client.js 包成 window.__ModuleLoader__.load({id, factory})
└── lib/                      # 构建产物（提交与否均可；prepare 自动生成）
```

- **RPC**：宿主用 `ctx.connection.rpc.intercept('/api', predicate, handler, {authority})`，客户端 `connection.rpc.call('/api', 'dshGit/status', {args})` → `{ok, value}`。零代码生成。
- **安装**：`dsh plugin --profile web add <repo>`（本地 `add .` 可 self-link）→ 自动并入 `dsh.profile.bundles`；重启生效。
- **client 产物契约**：`lib/client.js` 必须是
  ```js
  window.__ModuleLoader__.load({ id: 'dsh-git', factory: (require) => { /* 你的代码 */ return module.exports } })
  ```

## 若要升级到 TS/多文件工程化（可选方案 B）

自带独立、可提交的打包配置，**产物契约不变**（`lib/index.js` 宿主 apply + `lib/client.js` 闭包）：
- 仓库内自维护 `tsconfig.json` + `tsdown.config.ts`（或 esbuild），**不得 import** `@deepseek-ai/.../tsdown.client.ts`（`clientBundle`）或 `typertPlugin`——它们是 harness 仓库内部资产；
- CSS 自管（内联 `<style>` 或自己的 lightningcss 管线）；
- RPC 依旧 `connection.rpc`，不引入 typert。

## 官方流程验证

1. `node scripts/build.mjs`
2. `dsh plugin --profile web remove @deepseek-ai/dsh-git-bundle`（若装了历史遗留）
3. `dsh plugin --profile web add /path/to/dsh-git`
4. `dsh --profile web --dump-config` 应含 `dsh-git` 行；重启后打开 web UI 会话头部出现 `Git` 按钮