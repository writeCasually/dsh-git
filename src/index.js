/**
 * dsh-git host half: one self-registered `/dsh-git` envelope route that exposes
 * status/diff/commit/readFile/turnDiff/recentTurns/ledger without requiring a
 * compile-time api-remotes contribution. This keeps the bundle installable by
 * `dsh plugin add` while a Remote namespace would force the host into the
 * harness source tree.
 * @module dsh-git
 */

// `webServer` is declared because this plugin registers its own `/dsh-git`
// prefix route, and `connection` supplies the shared Host/Origin + browser-auth
// rejection used by that route.
export const inject = ['connection', 'webServer', 'subprocess', 'sessionQuery', 'fs', 'sessionPersistence']

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
    const snapshots = await ctx.sessionPersistence.list()
    for (const snapshot of snapshots) {
      // list() yields SessionPersistenceSnapshot { header, revision, ... }; older
      // lines yielded the header directly. Accept both, otherwise this fast path
      // never matches and every call falls back to a full session replay.
      const header = snapshot && typeof snapshot === 'object' && snapshot.header ? snapshot.header : snapshot
      if (header && header.id === sessionId && typeof header.cwd === 'string') return header.cwd
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

/** Result sentinel for a tool call that errored: it changed nothing, so it contributes no hunks. */
const FAILED_RESULT = Symbol('dsh-git failed tool result')

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
  const files = found ? found.files : []
  await anchorTurnFiles(ctx, sessionId, files, new Map())
  return { files }
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
      t.calls.set(p.callId, { callId: p.callId, name: p.name, args: parsed || {} })
    } else if (ev.type === 'tool/result') {
      const callId = (p.message && p.message.source && p.message.source.callId) || p.callId
      let t = byTurn.get(turnNo)
      if (t === undefined) { t = { calls: new Map(), results: new Map() }; byTurn.set(turnNo, t) }
      // A refused edit (old_string not found, bad arguments) applied NOTHING; its
      // result carries no diff meta and its arguments must never be replayed as a
      // change, or the turn would claim an edit the file never received.
      const content = p.message && p.message.content
      const failed = Array.isArray(content) && content[0] !== undefined && content[0].isError === true
      t.results.set(p.resultSeq ?? callId, failed ? FAILED_RESULT : p.meta)
      t.results.set(callId, failed ? FAILED_RESULT : p.meta)
    }
  }
  const summaries = []
  for (const [turnNo, t] of byTurn) {
    const byPath = new Map()
    for (const call of t.calls.values()) {
      const path = call.args.file_path
      const meta = t.results.get(call.callId)
      if (meta === FAILED_RESULT) continue
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
        // Each call's hunks are ordered within that call, but one call may touch
        // an earlier line than the previous one, so anchoring restarts per call.
        hk.call = call.callId
        e.hunks.push(hk)
      }
    }
    summaries.push({ turn: turnNo, files: [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path)) })
  }
  summaries.sort((a, b) => a.turn - b.turn)
  return maxTurns > 0 ? summaries.slice(-maxTurns) : summaries
}

/* ── Absolute file line numbers for turn hunks ─────────────────────────────
 *
 * `write`/`edit` result metadata carries only per-hunk before/after text, so a
 * hunk has no position. The diff surfaces show real file line numbers instead
 * of a per-hunk 1..N sequence, so each hunk's new side is located in the file as
 * it exists on disk and stamped with `newStart` (the file line of the hunk's
 * first new-side line) plus `oldStart` (the same line on the old side — hunks
 * are in file order, so it trails by the net lines the earlier hunks of that
 * file added or removed).
 *
 * The anchor is verified against the whole hunk text first, then its leading
 * lines, then a single line. A hunk that cannot be located keeps no start, and
 * the client falls back to its hunk-relative numbering rather than pointing at
 * the wrong place: for the turn that just finished the file IS the after-state
 * (exact), while a later edit to the same lines makes the block mismatch and
 * degrade instead of matching elsewhere.
 */

/** Split file/hunk text into lines; a trailing newline terminates, not adds. */
function splitLines(text) {
  if (text == null || text === '') return []
  return (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n')
}

/** First `from`-onward index where `block` matches `lines` exactly, or -1. */
function locateBlock(lines, block, from) {
  if (block.length === 0) return -1
  outer: for (let i = Math.max(0, from); i + block.length <= lines.length; i++) {
    for (let j = 0; j < block.length; j++) {
      if (lines[i + j] !== block[j]) continue outer
    }
    return i
  }
  return -1
}

/**
 * Stamp `oldStart`/`newStart` on every hunk that can be located in `fileLines`.
 *
 * Hunks arrive in call order, and one call's hunks are ordered and disjoint, but
 * a later call may touch an earlier line than the previous one. Anchoring
 * therefore restarts per call (`hunk.call`): the cursor is only a monotonic
 * search hint inside one call, and the old-side offset only accumulates the net
 * lines of that same call's earlier hunks.
 */
function anchorFileHunks(fileLines, hunks) {
  let group
  let cursor = 0
  let delta = 0
  for (const hunk of hunks) {
    if (hunk.call !== group) {
      group = hunk.call
      cursor = 0
      delta = 0
    }
    const newLines = splitLines(hunk.newText)
    const oldLines = splitLines(hunk.oldText)
    let newStart = null
    if (hunk.oldText === null) {
      newStart = 1 // a create starts at line 1
    } else if (newLines.length > 0) {
      let at = locateBlock(fileLines, newLines, cursor)
      if (at === -1 && newLines.length > 1) {
        at = locateBlock(fileLines, newLines.slice(0, Math.min(3, newLines.length)), cursor)
      }
      if (at === -1 && newLines.length > 1) at = locateBlock(fileLines, newLines.slice(0, 1), cursor)
      if (at !== -1) newStart = at + 1
    }
    if (newStart !== null) {
      hunk.newStart = newStart
      hunk.oldStart = Math.max(1, newStart - delta)
      cursor = newStart - 1 + newLines.length
    }
    delta += newLines.length - oldLines.length
  }
}

/**
 * Anchor one turn's file hunks against the working tree.
 * @param ctx - host context (`fs` + session services).
 * @param sessionId - session whose cwd resolves relative paths.
 * @param files - the turn's `{ path, hunks }` entries (mutated in place).
 * @param cache - per-request `path -> lines | null` map, so one file is read once.
 */
async function anchorTurnFiles(ctx, sessionId, files, cache) {
  let cwd
  try {
    cwd = await cwdOf(ctx, sessionId)
  } catch {
    return // no cwd: leave every hunk with hunk-relative numbering
  }
  for (const file of files) {
    if (!file || !Array.isArray(file.hunks) || file.hunks.length === 0) continue
    let lines = cache.get(file.path)
    if (lines === undefined) {
      lines = null
      try {
        const target = await ctx.fs.resolve(file.path, { cwd })
        const text = await ctx.fs.readText(target)
        if (typeof text === 'string' && text.length <= 2_000_000) lines = splitLines(text)
      } catch {
        // Unreadable (deleted, outside the workspace, binary): keep the fallback.
      }
      cache.set(file.path, lines)
    }
    if (lines !== null) anchorFileHunks(lines, file.hunks)
    // Present hunks in FILE order. Anchoring restarts per edit call, so call
    // order is chronological, not positional: a later call may sit above an
    // earlier one (the screenshot that prompted this showed 945-948 before 1-5).
    // Unanchored hunks have no position and keep their relative order at the end.
    file.hunks.sort((a, b) => hunkPosition(a) - hunkPosition(b))
    // The call grouping is an anchoring input only; keep it out of the payload.
    for (const hunk of file.hunks) delete hunk.call
  }
}

/** File-order sort key of one hunk; unanchored hunks sort last. */
function hunkPosition(hunk) {
  if (Number.isInteger(hunk.newStart)) return hunk.newStart
  if (Number.isInteger(hunk.oldStart)) return hunk.oldStart
  return Number.MAX_SAFE_INTEGER
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
    const turns = scanTurns(snap.events || [], limit)
    const cache = new Map()
    for (const summary of turns) await anchorTurnFiles(ctx, args.sessionId, summary.files, cache)
    return { turns }
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
  throw new Error(`unknown dsh-git method ${method}`)
}

/* ── HTTP carrier for the /dsh-git envelope channel ──────────────────────── */

/** Reject oversized envelopes before they are buffered (the client sends tiny JSON). */
const MAX_BODY_BYTES = 4 * 1024 * 1024

/** Read one request body as UTF-8 text, with a hard size cap. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('dsh-git request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => { resolve(Buffer.concat(chunks).toString('utf8')) })
    req.on('error', reject)
  })
}

/** Write one JSON response with explicit framing. */
function writeJson(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  })
  res.end(text)
}

/** Decode one client envelope and answer it in the Connection result shape. */
async function answerEnvelope(ctx, envelope) {
  try {
    const endpoint = envelope !== null && typeof envelope === 'object' ? envelope.method : undefined
    if (typeof endpoint !== 'string' || !ENDPOINT_PATTERN.test(endpoint)) {
      throw new Error(`unknown dsh-git endpoint ${JSON.stringify(endpoint)}`)
    }
    const args = plainArgs(envelope.payload)
    const value = await dispatch(ctx, endpoint.slice(ENDPOINT_PREFIX.length), args)
    return { ok: true, value }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'dsh-git-error',
        message: error instanceof Error ? error.message : String(error),
        details: {},
      },
    }
  }
}

/**
 * Serve one POSTed Connection envelope on the plugin's own `/dsh-git` route.
 *
 * The plugin deliberately does NOT go through `connection.rpc.handle()`: that
 * registry ends at `owner.effect(() => owner.webServer.register(route))` where
 * `owner` is the connection service's OWN context (packages/client/connection
 * /src/rpc-host.ts), and on the current harness line that context does not
 * inject `webServer`, so the call throws
 * `cannot get property "webServer" without inject` and the whole plugin fails
 * to activate (observed live as a 405 on every `dshGit/*` request, because the
 * prefix was never registered). Declaring `webServer` HERE — the plugin's own
 * context — does resolve, so the prefix is registered directly instead.
 *
 * `connection.requestRejection` still applies the shared Host/Origin fence and
 * browser-session authentication before the envelope is decoded, so the route
 * is exactly as trusted as the built-in channels.
 */
async function handleRpcRequest(ctx, req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405)
    res.end('method not allowed')
    return
  }
  const rejection = ctx.connection.requestRejection(req)
  if (rejection !== undefined) {
    res.writeHead(rejection)
    res.end(rejection === 401 ? 'unauthorized' : 'forbidden')
    return
  }
  let envelope
  try {
    envelope = JSON.parse(await readBody(req))
  } catch {
    res.writeHead(400)
    res.end('invalid dsh-git request body')
    return
  }
  const rpcId = envelope !== null && typeof envelope === 'object' && typeof envelope.rpcId === 'string'
    ? envelope.rpcId
    : ''
  writeJson(res, 200, { type: 'server-response', rpcId, result: await answerEnvelope(ctx, envelope) })
}

export function apply(ctx) {
  // `webServer` is in this plugin's own inject list, which is the whole point:
  // the route is registered from the context that can actually resolve the
  // service, and its lifetime follows this plugin's fiber (an HMR reload
  // disposes and re-registers it cleanly).
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/dsh-git',
    handler: (req, res) => handleRpcRequest(ctx, req, res),
  }), 'dsh-git rpc route')
}
