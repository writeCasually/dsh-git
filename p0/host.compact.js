return {
apply(ctx) {
async function runGit(cwd, args) {
const sub = ctx.get('subprocess')
if (sub === undefined) return { error: 'subprocess service unavailable' }
const handle = sub.spawn({
argv: ['git', ...args],
cwd,
stdio: {
stdin: 'ignore',
stdout: { maxBytes: 2 * 1024 * 1024 },
stderr: { maxBytes: 256 * 1024 },
},
graceMs: 5000,
})
const outcome = await handle.done
const out = handle.collected.stdout ? handle.collected.stdout.readFrom(0).text : ''
const err = handle.collected.stderr ? handle.collected.stderr.readFrom(0).text : ''
if (outcome.exitCode !== 0) {
return { error: 'git ' + args[0] + ' failed (' + outcome.exitCode + '): ' + err.slice(0, 500) }
}
return { out }
}
async function loadSession(sessionId) {
const sq = ctx.get('sessionQuery')
if (sq === undefined) return { error: 'sessionQuery service unavailable' }
try {
const snap = await sq.readSession(sessionId)
return { snap }
} catch (e) {
return { error: String((e && e.message) || e) }
}
}
harness.handle('p0.status', async (args) => {
try {
const sessionId = args && args.sessionId
if (typeof sessionId !== 'string') return { error: 'sessionId required' }
const loaded = await loadSession(sessionId)
if (loaded.error || !loaded.snap) return loaded
const cwd = loaded.snap.session.cwd
if (typeof cwd !== 'string') return { error: 'session has no cwd' }
const res = await runGit(cwd, ['status', '--porcelain=v1', '-b'])
if (res.error) return { error: res.error, cwd }
return { cwd, raw: res.out }
} catch (e) {
return { error: String((e && e.message) || e) }
}
})
harness.handle('p0.modifications', async (args) => {
try {
const sessionId = args && args.sessionId
if (typeof sessionId !== 'string') return { error: 'sessionId required' }
const loaded = await loadSession(sessionId)
if (loaded.error || !loaded.snap) return loaded
const events = loaded.snap.events || []
const calls = []
const results = new Map()
for (const ev of events) {
const p = ev.data !== undefined ? ev.data : ev
if (ev.type === 'tool/call' && (p.name === 'write' || p.name === 'edit')) {
let path = null
try { path = JSON.parse(p.arguments || '{}').file_path || null } catch (_) {}
calls.push({ turn: p.turn, name: p.name, path, callId: p.callId, seq: ev.seq })
} else if (ev.type === 'tool/result') {
results.set(p.callId, { meta: p.meta, time: ev.time })
}
}
const mods = calls.map((c) => {
const r = results.get(c.callId)
const diffs = r && r.meta && Array.isArray(r.meta.diffs) ? r.meta.diffs : []
return {
turn: c.turn,
name: c.name,
path: c.path,
time: r ? r.time : null,
diffs: diffs.slice(0, 5).map((d) => ({
path: d.path,
oldText: d.oldText === null ? null : String(d.oldText).slice(0, 800),
newText: String(d.newText).slice(0, 800),
})),
}
})
mods.sort((a, b) => a.turn - b.turn)
return { count: mods.length, modifications: mods.slice(-10) }
} catch (e) {
return { error: String((e && e.message) || e) }
}
})
},
}