/**
 * dsh-git host half: one Connection RPC interceptor over /api that exposes
 * status/diff/commit/readFile/turnDiff without requiring a compile-time
 * api-remotes contribution. This keeps the bundle installable by
 * `dsh plugin add` while a Remote namespace would force the host into the
 * harness source tree.
 * @module dsh-git
 */

export const inject = ['connection', 'subprocess', 'sessionQuery', 'fs', 'sessionPersistence']

const ENDPOINT_PREFIX = 'dshGit/'
const ENDPOINT_PATTERN = /^dshGit\/[A-Za-z0-9_]+$/

function plainArgs(payload) {
  const args = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload.args : undefined
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    throw new Error('dsh-git expects exactly one args object')
  }
  return args
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

/** cwd from cheap metadata listing (no event replay), falling back to a windowed read. */
async function cwdOf(ctx, sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new Error('sessionId required')
  }
  if (ctx.sessionPersistence && typeof ctx.sessionPersistence.list === 'function') {
    const headers = await ctx.sessionPersistence.list()
    for (const header of headers) {
      if (header.id === sessionId && typeof header.cwd === 'string') return header.cwd
    }
  }
  const persistence = ctx.sessionPersistence || ctx.sessionQuery
  const snap = persistence.readFrom
    ? await persistence.readFrom(sessionId, 0)
    : { meta: (await ctx.sessionQuery.readSession(sessionId)).session, events: [] }
  const cwd = snap.meta && snap.meta.cwd
  if (typeof cwd !== 'string') throw new Error('session has no cwd')
  return cwd
}

/** Per-turn modifications around the turn's ending seq: write/edit calls paired with their result-time diff hunks. */
const windowCache = new Map() // `${sessionId}@${fromSeq}` -> events array (last 2 windows per session kept)

/** Full-log cache (non-lazy): first call reads everything, later calls extend from the cached watermark. */
const logCache = new Map()

async function sessionEvents(ctx, sessionId) {
  let entry = logCache.get(sessionId)
  const from = entry ? entry.lastSeq + 1 : 0
  const persistence = ctx.sessionPersistence || ctx.sessionQuery
  const snap = persistence.readFrom
    ? await persistence.readFrom(sessionId, from)
    : { events: (await ctx.sessionQuery.readSession(sessionId)).events }
  if (!entry) { entry = { events: [], lastSeq: -1 }; logCache.set(sessionId, entry) }
  const evs = snap.events || []
  if (evs.length > 0) {
    entry.events.push(...evs)
    entry.lastSeq = evs[evs.length - 1].seq
  }
  return entry.events
}

async function turnDiff(ctx, sessionId, turn) {
  if (typeof turn !== 'number') throw new Error('turn required')
  const events = await sessionEvents(ctx, sessionId)
  const summaries = scanTurns(events, 0)
  const found = summaries.find((s) => s.turn === turn)
  return { files: found ? found.files : [] }
}
function scanTurns(events, maxTurns) {
  const byTurn = new Map()
  const cap = (s) => (s == null ? null : s.slice(0, 4000))
  for (const ev of events) {
    if (ev.type !== 'tool/call' && ev.type !== 'tool/result') continue
    const p = ev.data !== undefined ? ev.data : ev
    const turnNo = p.turn
    if (typeof turnNo !== 'number') continue
    if (ev.type === 'tool/call' && (p.name === 'write' || p.name === 'edit')) {
      let parsed = null
      try { parsed = JSON.parse(p.arguments || '{}') } catch (_) {}
      let t = byTurn.get(turnNo)
      if (t === undefined) { t = { calls: new Map(), results: new Map() }; byTurn.set(turnNo, t) }
      t.calls.set(p.callId, { name: p.name, args: parsed || {} })
    } else if (ev.type === 'tool/result') {
      const callId = (p.message && p.message.source && p.message.source.callId) || p.callId
      let t = byTurn.get(turnNo)
      if (t === undefined) { t = { calls: new Map(), results: new Map() }; byTurn.set(turnNo, t) }
      t.results.set(p.resultSeq ?? callId, p.meta)
      t.results.set(callId, p.meta)
    }
  }
  const summaries = []
  for (const [turnNo, t] of byTurn) {
    const byPath = new Map()
    for (const call of t.calls.values()) {
      const path = call.args.file_path
      const meta = t.results.get(call.callId)
      const diffs = meta && Array.isArray(meta.diffs) ? meta.diffs : []
      const hunks = []
      if (diffs.length > 0) {
        for (const d of diffs) hunks.push({ oldText: cap(d.oldText), newText: cap(d.newText) })
      } else if (call.name === 'edit') {
        hunks.push({ oldText: cap(call.args.old_string), newText: cap(call.args.new_string) })
      } else if (call.name === 'write' && call.args.content != null) {
        hunks.push({ oldText: null, newText: cap(call.args.content) })
      }
      if (hunks.length === 0) {
        if (path && !byPath.has(path)) byPath.set(path, { path, add: 0, del: 0, hunks: [] })
        continue
      }
      for (const hk of hunks) {
        const oldText = hk.oldText
        const newText = hk.newText
        const add = newText == null ? 0 : (newText === '' ? 0 : newText.split('\n').length)
        const del = oldText == null ? 0 : (oldText === '' ? 0 : oldText.split('\n').length)
        if (!byPath.has(path)) byPath.set(path, { path, add: 0, del: 0, hunks: [] })
        const e = byPath.get(path)
        e.add += add
        e.del += del
        e.hunks.push(hk)
      }
    }
    summaries.push({ turn: turnNo, files: [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path)) })
  }
  summaries.sort((a, b) => a.turn - b.turn)
  return maxTurns > 0 ? summaries.slice(-maxTurns) : summaries
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
  if (method === 'turnOf') {
    if (typeof args.messageId !== 'string') throw new Error('messageId required')
    let lastSeq = args.upToSeq
    if (typeof lastSeq !== 'number' || !Number.isFinite(lastSeq)) {
      const surface = await ctx.sessionQuery.readSurface(args.sessionId)
      lastSeq = surface ? (surface.lastSeq ?? 0) : 0
    }
    const fromSeq = Math.max(0, lastSeq - 20000)
    const persistence = ctx.sessionPersistence || ctx.sessionQuery
    const snap = persistence.readFrom
      ? await persistence.readFrom(args.sessionId, fromSeq)
      : { events: (await ctx.sessionQuery.readSession(args.sessionId)).events }
    let turn = null
    for (const ev of snap.events || []) {
      if (ev.type !== 'assistant/message') continue
      const p = ev.data !== undefined ? ev.data : ev
      if (p.message && p.message.id === args.messageId) { turn = p.turn; break }
    }
    return { turn }
  }
  if (method === 'turnDiff') {
    return await turnDiff(ctx, args.sessionId, args.turn, args.upToSeq)
  }
  if (method === 'recentTurns') {
    const limit = Math.max(1, Math.min(30, Number(args.limit) || 10))
    let lastSeq = args.upToSeq
    if (typeof lastSeq !== 'number' || !Number.isFinite(lastSeq)) {
      const surface = await ctx.sessionQuery.readSurface(args.sessionId)
      lastSeq = surface ? (surface.lastSeq ?? 0) : 0
    }
    const fromSeq = Math.max(0, lastSeq - 20000)
    const persistence = ctx.sessionPersistence || ctx.sessionQuery
    const snap = persistence.readFrom
      ? await persistence.readFrom(args.sessionId, fromSeq)
      : { events: (await ctx.sessionQuery.readSession(args.sessionId)).events }
    return { turns: scanTurns(snap.events || [], limit) }
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