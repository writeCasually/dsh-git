/**
 * dsh-git host half: one Connection RPC interceptor over /api that exposes
 * status/diff/commit/readFile without requiring a compile-time api-remotes
 * contribution. This keeps the bundle installable by `dsh plugin add` while a
 * Remote namespace would force the host into the harness source tree.
 * @module dsh-git
 */

export const inject = ['connection', 'subprocess', 'sessionQuery', 'fs']

const ENDPOINT_PREFIX = 'dshGit/'
const ENDPOINT_PATTERN = /^dshGit\/[A-Za-z0-9_]+$/

function plainArgs(payload) {
  const args = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload.args : undefined
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    throw new Error('dsh-git expects exactly one args object')
  }
  return args
}

async function cwdOf(ctx, sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new Error('sessionId required')
  }
  const snap = await ctx.sessionQuery.readSession(sessionId)
  const cwd = snap?.session?.cwd
  if (typeof cwd !== 'string') throw new Error('session has no cwd')
  return cwd
}

async function runGit(ctx, cwd, argv) {
  const handle = ctx.subprocess.spawn({
    argv: ['git', ...argv],
    cwd,
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes: 2 * 1024 * 1024 },
      stderr: { maxBytes: 256 * 1024 },
    },
    graceMs: 10_000,
  })
  const outcome = await handle.done
  const out = handle.collected.stdout ? handle.collected.stdout.readFrom(0).text : ''
  const err = handle.collected.stderr ? handle.collected.stderr.readFrom(0).text : ''
  if (outcome.exitCode !== 0) {
    throw new Error(`git ${argv[0]} failed (${outcome.exitCode}): ${err.slice(0, 500)}`)
  }
  return out
}

function parseStatus(out) {
  const lines = out.split('\n').filter((line) => line.length > 0)
  const branchLine = lines.find((line) => line.startsWith('## ')) ?? ''
  const branch = branchLine.length > 3 ? branchLine.slice(3).split(' ')[0] ?? '(detached)' : '(detached)'
  let ahead = 0
  let behind = 0
  const bracket = branchLine.indexOf('[')
  if (bracket >= 0) {
    const seg = branchLine.slice(bracket)
    const ai = seg.indexOf('ahead ')
    if (ai >= 0) ahead = Number.parseInt(seg.slice(ai + 6), 10) || 0
    const bi = seg.indexOf('behind ')
    if (bi >= 0) behind = Number.parseInt(seg.slice(bi + 7), 10) || 0
  }
  const staged = []
  const unstaged = []
  const untracked = []
  for (const line of lines) {
    if (line.startsWith('## ')) continue
    const code = line.slice(0, 2)
    const path = line.slice(3)
    if (code === '??') {
      untracked.push(path)
    } else {
      if (code[0] !== ' ' && code[0] !== '?') staged.push(path)
      if (code[1] !== ' ' && code[1] !== '?') unstaged.push(path)
    }
  }
  return { branch, ahead, behind, staged, unstaged, untracked }
}

async function dispatch(ctx, method, args) {
  if (method === 'status') {
    const cwd = await cwdOf(ctx, args.sessionId)
    const out = await runGit(ctx, cwd, ['status', '--porcelain=v1', '-b'])
    return { ...parseStatus(out), cwd }
  }
  if (method === 'diff') {
    const cwd = await cwdOf(ctx, args.sessionId)
    const argv = ['diff', '--no-color']
    if (args.staged) argv.push('--cached')
    if (typeof args.path === 'string' && args.path.length > 0) argv.push('--', args.path)
    const out = await runGit(ctx, cwd, argv)
    return { diff: out }
  }
  if (method === 'commit') {
    const message = typeof args.message === 'string' ? args.message.trim() : ''
    if (message.length === 0) throw new Error('commit message required')
    const cwd = await cwdOf(ctx, args.sessionId)
    await runGit(ctx, cwd, ['add', '-A'])
    const out = await runGit(ctx, cwd, ['commit', '-m', message])
    return { output: out }
  }
  if (method === 'readFile') {
    if (typeof args.path !== 'string' || args.path.length === 0) throw new Error('path required')
    const cwd = await cwdOf(ctx, args.sessionId)
    const target = await ctx.fs.resolve(args.path, { cwd })
    const text = await ctx.fs.readText(target)
    return { text: text.slice(0, 60_000) }
  }
  throw new Error(`unknown dsh-git method ${method}`)
}

export function apply(ctx) {
  const remove = ctx.connection.rpc.intercept(
    '/api',
    (endpoint) => ENDPOINT_PATTERN.test(endpoint),
    async (endpoint, payload) => {
      try {
        const args = plainArgs(payload)
        const method = endpoint.slice(ENDPOINT_PREFIX.length)
        const value = await dispatch(ctx, method, args)
        return { ok: true, value }
      } catch (error) {
        return {
          ok: false,
          error: {
            code: 'dsh-git-error',
            message: error instanceof Error ? error.message : String(error),
          },
        }
      }
    },
    { authority: 'trusted-host' },
  )
  ctx.effect(() => remove, 'dsh-git host rpc')
}
