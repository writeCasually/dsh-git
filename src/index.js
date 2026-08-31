/**
 * dsh-git host half: one Connection RPC interceptor over /api that exposes
 * status/diff/commit/readFile/turnDiff/ledger/restore without requiring a
 * compile-time api-remotes contribution. This keeps the bundle installable by
 * `dsh plugin add` while a Remote namespace would force the host into the
 * harness source tree.
 * @module dsh-git
 */

export const inject = ['connection', 'subprocess', 'sessionQuery', 'fs', 'sessionPersistence', 'agents']

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

// ─── P2: Ledger & Checkpoints ───────────────────────────────────────────────

/**
 * Build a version ledger from session events. Each turn with file changes
 * becomes a version entry. The ledger is append-only and rebuildable.
 * @param {object} ctx - Host context
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} Ledger entries
 */
async function buildLedger(ctx, sessionId) {
  const events = await sessionEvents(ctx, sessionId)
  const turnSummaries = scanTurns(events, 0)
  const ledger = []
  let version = 0
  for (const summary of turnSummaries) {
    if (summary.files.length === 0) continue
    version++
    const totalAdd = summary.files.reduce((sum, f) => sum + f.add, 0)
    const totalDel = summary.files.reduce((sum, f) => sum + f.del, 0)
    ledger.push({
      version,
      turn: summary.turn,
      files: summary.files.map((f) => f.path),
      add: totalAdd,
      del: totalDel,
      fileCount: summary.files.length,
      type: 'turn',
    })
  }
  return ledger
}

/**
 * Get the checkpoint ref name for a version.
 * @param {string} sessionId - Session ID (sanitized for ref name)
 * @param {number} version - Version number
 * @returns {string} Git ref name
 */
function checkpointRef(sessionId, version) {
  // Sanitize session ID for use in ref name
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
  return `refs/dsh-git/ckpt/${safe}/V${version}`
}

/**
 * Create a checkpoint (snapshot) of the entire working tree.
 * Stores as a detached git commit under a private ref.
 * @param {object} ctx - Host context
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @param {number} version - Version number
 * @returns {Promise<{ref: string, tree: string}>}
 */
async function createCheckpoint(ctx, cwd, sessionId, version) {
  const ref = checkpointRef(sessionId, version)
  // Stage everything (including untracked)
  await runGit(ctx, cwd, ['add', '-A'])
  // Create a tree object from the index
  const treeOut = await runGit(ctx, cwd, ['write-tree'])
  const tree = treeOut.trim()
  // Create a commit object (detached, no parent)
  const commitOut = await runGit(ctx, cwd, [
    'commit-tree', tree, '-m', `dsh-git checkpoint V${version} (session ${sessionId})`,
  ])
  const commit = commitOut.trim()
  // Update the ref to point to this commit
  await runGit(ctx, cwd, ['update-ref', ref, commit])
  return { ref, tree }
}

/**
 * List existing checkpoints for a session.
 * @param {object} ctx - Host context
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array<{version: number, ref: string, commit: string}>>}
 */
async function listCheckpoints(ctx, cwd, sessionId) {
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
  const prefix = `refs/dsh-git/ckpt/${safe}/`
  let out = ''
  try {
    out = await runGit(ctx, cwd, ['for-each-ref', '--format=%(refname) %(objectname:short)', prefix])
  } catch {
    // No refs exist yet
    return []
  }
  const results = []
  for (const line of out.split('\n').filter(Boolean)) {
    const [ref, commit] = line.split(' ')
    const match = ref.match(/V(\d+)$/)
    if (match) {
      results.push({ version: Number.parseInt(match[1], 10), ref, commit })
    }
  }
  results.sort((a, b) => a.version - b.version)
  return results
}

/**
 * Restore working tree to a checkpoint version.
 * Uses git checkout of the tree object, preserving the index.
 * @param {object} ctx - Host context
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @param {number} version - Target version
 * @param {string[]} [files] - Specific files to restore (null = all)
 * @returns {Promise<{restored: string[], ref: string}>}
 */
async function restoreCheckpoint(ctx, cwd, sessionId, version, files) {
  const ref = checkpointRef(sessionId, version)
  // Verify the ref exists
  let commitHash
  try {
    commitHash = (await runGit(ctx, cwd, ['rev-parse', ref])).trim()
  } catch {
    throw new Error(`checkpoint V${version} not found`)
  }
  // Get the tree from the commit
  const tree = (await runGit(ctx, cwd, ['rev-parse', `${commitHash}^{tree}`])).trim()

  if (files && files.length > 0) {
    // Restore specific files from the tree
    for (const file of files) {
      try {
        await runGit(ctx, cwd, ['checkout', tree, '--', file])
      } catch (e) {
        // File might not exist in the checkpoint (new file since checkpoint)
        // In that case, remove it
        try {
          await runGit(ctx, cwd, ['rm', '--cached', file])
        } catch { /* ignore */ }
      }
    }
    return { restored: files, ref }
  }
  // Restore entire working tree
  // First, clean the working tree
  await runGit(ctx, cwd, ['checkout', tree, '--', '.'])
  // Remove files that exist in working tree but not in checkpoint
  const statusOut = await runGit(ctx, cwd, ['status', '--porcelain=v1'])
  const toRemove = []
  for (const line of statusOut.split('\n').filter(Boolean)) {
    if (line.startsWith('??')) {
      // Untracked file - check if it existed in checkpoint
      const path = line.slice(3)
      try {
        await runGit(ctx, cwd, ['ls-tree', tree, path])
        // File exists in checkpoint, keep it
      } catch {
        // File doesn't exist in checkpoint, remove it
        toRemove.push(path)
      }
    }
  }
  // Note: we don't auto-remove untracked files for safety
  // The user can manually clean them
  return { restored: ['*'], ref }
}

/**
 * Compute diff between current working tree and a checkpoint.
 * @param {object} ctx - Host context
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @param {number} version - Target version
 * @returns {Promise<{diff: string, files: Array}>}
 */
async function previewRestore(ctx, cwd, sessionId, version) {
  const ref = checkpointRef(sessionId, version)
  let commitHash
  try {
    commitHash = (await runGit(ctx, cwd, ['rev-parse', ref])).trim()
  } catch {
    throw new Error(`checkpoint V${version} not found`)
  }
  const tree = (await runGit(ctx, cwd, ['rev-parse', `${commitHash}^{tree}`])).trim()
  // Diff current index against the checkpoint tree
  const diff = await runGit(ctx, cwd, ['diff', '--no-color', tree])
  // Get numstat for file-level summary
  const numstat = await runGit(ctx, cwd, ['diff', '--numstat', tree])
  const files = []
  for (const line of numstat.split('\n').filter(Boolean)) {
    const [add, del, path] = line.split('\t')
    files.push({
      path,
      add: add === '-' ? 0 : Number.parseInt(add, 10) || 0,
      del: del === '-' ? 0 : Number.parseInt(del, 10) || 0,
    })
  }
  return { diff, files }
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
  // ─── P2: Ledger & Restore ─────────────────────────────────────────────────
  if (method === 'ledger.list') {
    const ledger = await buildLedger(ctx, args.sessionId)
    const cwd = await cwdOf(ctx, args.sessionId)
    const checkpoints = await listCheckpoints(ctx, cwd, args.sessionId)
    // Merge checkpoint info into ledger entries
    const checkpointVersions = new Set(checkpoints.map((c) => c.version))
    const entries = ledger.map((entry) => ({
      ...entry,
      hasCheckpoint: checkpointVersions.has(entry.version),
    }))
    return { entries }
  }
  if (method === 'ledger.preview') {
    if (typeof args.version !== 'number') throw new Error('version required')
    const cwd = await cwdOf(ctx, args.sessionId)
    return await previewRestore(ctx, cwd, args.sessionId, args.version)
  }
  if (method === 'ledger.checkpoint') {
    // Create a checkpoint for a specific version (or the latest)
    const ledger = await buildLedger(ctx, args.sessionId)
    if (ledger.length === 0) throw new Error('no versions to checkpoint')
    const version = typeof args.version === 'number' ? args.version : ledger[ledger.length - 1].version
    const cwd = await cwdOf(ctx, args.sessionId)
    const result = await createCheckpoint(ctx, cwd, args.sessionId, version)
    return { version, ...result }
  }
  if (method === 'ledger.restore') {
    if (typeof args.version !== 'number') throw new Error('version required')
    const cwd = await cwdOf(ctx, args.sessionId)
    const files = Array.isArray(args.files) ? args.files : undefined
    const result = await restoreCheckpoint(ctx, cwd, args.sessionId, args.version, files)
    // Append a restore entry to the ledger
    const ledger = await buildLedger(ctx, args.sessionId)
    const maxVersion = ledger.length > 0 ? ledger[ledger.length - 1].version : 0
    const restoreEntry = {
      version: maxVersion + 1,
      turn: null,
      files: result.restored,
      add: 0,
      del: 0,
      fileCount: result.restored.length,
      type: 'restore',
      targetVersion: args.version,
    }
    return { result, restoreEntry }
  }
  if (method === 'agent.status') {
    // Check if agent is running (for mutex)
    try {
      const surface = await ctx.sessionQuery.readSurface(args.sessionId)
      return { running: surface ? surface.running === true : false }
    } catch {
      return { running: false }
    }
  }
  if (method === 'restoreTurn') {
    if (typeof args.turn !== 'number') throw new Error('turn required')
    const sessionId = args.sessionId
    const turn = args.turn
    const cwd = await cwdOf(ctx, sessionId)
    const events = await sessionEvents(ctx, sessionId)
    // Find all write/edit calls and their results in this turn
    const turnOperations = []
    for (const ev of events) {
      if (ev.type !== 'tool/call') continue
      const p = ev.data !== undefined ? ev.data : ev
      if (p.turn !== turn) continue
      if (p.name !== 'write' && p.name !== 'edit') continue
      let parsed = null
      try { parsed = JSON.parse(p.arguments || '{}') } catch (_) {}
      if (parsed) turnOperations.push({ name: p.name, args: parsed, callId: p.callId })
    }
    if (turnOperations.length === 0) throw new Error(`no write/edit calls found in turn ${turn}`)
    // Find the corresponding results to get meta.diffs (which contains oldText)
    const resultsByCallId = new Map()
    for (const ev of events) {
      if (ev.type !== 'tool/result') continue
      const p = ev.data !== undefined ? ev.data : ev
      if (p.turn !== turn) continue
      const callId = (p.message && p.message.source && p.message.source.callId) || p.callId
      if (callId) resultsByCallId.set(callId, p.meta)
    }
    // Reverse the changes using meta.diffs.oldText
    const restored = []
    const errors = []
    for (const op of turnOperations) {
      const filePath = op.args.file_path
      if (!filePath) continue
      const fullPath = require('node:path').resolve(cwd, filePath)
      try {
        // Get the meta.diffs from the result
        const meta = resultsByCallId.get(op.callId)
        const diffs = meta && Array.isArray(meta.diffs) ? meta.diffs : []
        const fileDiff = diffs.find((d) => d.path === filePath)
        if (fileDiff && fileDiff.oldText !== null && fileDiff.oldText !== undefined) {
          // We have oldText from meta.diffs - restore it
          await ctx.fs.writeText(fullPath, fileDiff.oldText)
          restored.push(filePath)
        } else if (fileDiff && fileDiff.oldText === null) {
          // New file creation - delete the file
          try {
            await ctx.fs.remove(fullPath)
            restored.push(filePath + ' (deleted)')
          } catch {
            errors.push({ path: filePath, error: 'new file cannot be deleted (file may not exist)' })
          }
        } else {
          // No meta.diffs available, try to reverse from args
          if (op.name === 'edit') {
            const currentContent = await ctx.fs.readText(fullPath)
            const oldString = op.args.old_string || ''
            const newString = op.args.new_string || ''
            if (currentContent.includes(newString)) {
              const restoredContent = currentContent.replace(newString, oldString)
              await ctx.fs.writeText(fullPath, restoredContent)
              restored.push(filePath)
            } else {
              errors.push({ path: filePath, error: 'new_string not found in current file' })
            }
          } else {
            errors.push({ path: filePath, error: 'cannot restore write operation (no oldText in meta)' })
          }
        }
      } catch (e) {
        errors.push({ path: filePath, error: String(e.message || e) })
      }
    }
    // Write-back: inject a message into the session so the agent knows about the restore
    try {
      const agent = ctx.agents.get(sessionId)
      if (agent) {
        const fileList = restored.join(', ')
        const errorList = errors.length > 0 ? `，${errors.length} 个文件恢复失败` : ''
        const message = `用户撤销了 turn ${turn} 的代码修改，恢复了 ${restored.length} 个文件${errorList}：${fileList}。请知晓当前工作区已变更。`
        agent.followup({ role: 'user', content: [{ type: 'text', text: message }] })
      }
    } catch (e) {
      // followup 失败不影响恢复结果
      errors.push({ path: '__followup__', error: `write-back failed: ${e.message}` })
    }
    return { restored, errors, turn }
  }
  throw new Error(`unknown dsh-git method ${method}`)
}

export function apply(ctx) {
  const remove = ctx.connection.rpc.handle(
    '/dsh-git',
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
  )
  ctx.effect(() => remove, 'dsh-git host rpc')
}
