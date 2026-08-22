# dsh-git

DeepSeek Harness 的 Git 面板插件。安装形态遵循官方“打包与安装插件”教程：仓库根目录就是一个 `dsh.bundle` 包，host 与 web client 打包在同一个包内，用 `dsh plugin add` 安装。这是第三方插件，不使用 `@deepseek-ai` 官方 scope。

## 官方本地调试方式

先构建：

```sh
node scripts/build.mjs
```

然后从 dsh 源码 checkout 安装插件 checkout：

```sh
cd /Users/strikingly/workspace/deepseek-harness
pnpm dsh plugin --profile web remove @deepseek-ai/dsh-git-bundle
pnpm dsh plugin --profile web add /Users/strikingly/workspace/deepseek-harness-plugins/plugins/dsh-git
```

启动并检查：

```sh
pnpm dsh --profile web --dump-config
pnpm dsh --profile web --port 3080
```

打开 `http://127.0.0.1:3080`，会话头部应出现 `Git` 按钮。

## 实现说明

- `cordis.patch.yml` 只插入一行 `dsh-git`；同一行同时提供 host 插件入口和 `dsh.client` web client bundle。
- host 使用 `ctx.connection.rpc.intercept('/api', ...)` 暴露 `dshGit/status`、`dshGit/diff`、`dshGit/commit`、`dshGit/readFile`，不需要给 harness 的 `api-remotes` 增加编译期 Remote 贡献。
- `scripts/build.mjs` 生成 `lib/index.js` 与 `lib/client.js`；`prepare` 会在 git 安装时自动构建。

## 发布形态

构建后可直接：

```sh
pnpm pack
```

或发布到 npm 后执行：

```sh
dsh plugin --profile web add dsh-git
```
