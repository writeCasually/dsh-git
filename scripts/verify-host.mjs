/**
 * Host-half regression check (run from the plugin repo):
 *
 *   node scripts/verify-host.mjs
 *
 * The plugin must not depend on `connection.rpc.handle()`: on the current
 * harness line that registry registers its Web route on the CONNECTION
 * service's own context (`rpc-host.ts` `owner.webServer.register`), which does
 * not inject `webServer`, so the call throws
 * `cannot get property "webServer" without inject`, the whole plugin fails to
 * activate, and every `dshGit/*` request answers 405 from the static fallback.
 *
 * It therefore registers its own `/dsh-git` prefix on the `webServer` service
 * it injects, and re-applies the shared trust/auth rejection itself. These
 * checks drive that handler through a fake node:http pair, so they need no
 * server, no browser, and no harness checkout.
 * @module dsh-git/scripts/verify-host
 */
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MODULE_URL = pathToFileURL(fileURLToPath(new URL('../lib/index.js', import.meta.url))).href

const results = []
const check = (label, ok, detail = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** One fake node:http request carrying `body` as its stream. */
function fakeRequest(method, body) {
  const req = new Readable({ read() {} })
  req.method = method
  req.headers = { host: '127.0.0.1:3199', 'content-type': 'application/json' }
  if (body !== undefined) req.push(body)
  req.push(null)
  return req
}

/** One fake node:http response recording status, headers, and body. */
function fakeResponse() {
  const res = { statusCode: 0, headers: null, body: '', destroyed: false }
  res.writeHead = (status, headers) => { res.statusCode = status; res.headers = headers ?? null; return res }
  res.end = (text) => { res.body += text === undefined ? '' : String(text); return res }
  res.destroy = () => { res.destroyed = true; return res }
  return res
}

/**
 * Compose the real host plugin over a fake ctx and return the registered route
 * plus the request/response helpers.
 *
 * `events` seeds a fake session log (`readFrom` slices it by seq) and `fileText`
 * backs `fs.readText`, which together let `turnDiff` anchor hunks in real file
 * lines; `fileText` may be a function of the resolved target.
 */
async function compose({
  rejection = undefined,
  gitOutput = '## main...origin/main\n M a.ts\n?? b.ts\n',
  rpcFailure = null,
  events = [],
  fileText = null,
} = {}) {
  const module = await import(`${MODULE_URL}?v=${Math.random()}`)
  const registrations = []
  const disposers = []
  const spawns = []
  const reads = []
  const services = {
    webServer: {
      register: (route) => { registrations.push(route); return () => { registrations.pop() } },
    },
    connection: {
      // The plugin re-applies the shared policy; a rejection short-circuits auth.
      requestRejection: () => rejection,
    },
    sessionPersistence: {
      list: async () => (rpcFailure === 'no-session' ? [] : [{ header: { id: 'S1', cwd: '/tmp/ws' } }]),
      readFrom: async (_sessionId, from) => ({ events: events.filter((event) => event.seq >= from) }),
    },
    subprocess: {
      spawn: (options) => {
        spawns.push(options)
        return {
          done: Promise.resolve({ exitCode: 0 }),
          collected: {
            stdout: { readFrom: () => ({ text: gitOutput }) },
            stderr: { readFrom: () => ({ text: '' }) },
          },
        }
      },
    },
    fs: {
      resolve: async (path, options) => ({ path, cwd: options?.cwd }),
      readText: async (target) => {
        reads.push(target.path)
        if (fileText === null) throw new Error(`no such file: ${target.path}`)
        return typeof fileText === 'function' ? fileText(target) : fileText
      },
    },
    sessionQuery: {},
  }
  const ctx = {
    ...services,
    effect: (fn) => { const d = fn(); if (typeof d === 'function') disposers.push(d); return () => {} },
  }
  module.apply(ctx)
  return { route: registrations[0], registrations, spawns, disposers, reads, module }
}

/** One fake `tool/call` + `tool/result` pair carrying an edit's hunk metadata. */
function editEvents(turn, callId, path, diffs) {
  return [
    {
      seq: 1,
      type: 'tool/call',
      data: {
        turn,
        name: 'edit',
        callId,
        arguments: JSON.stringify({ file_path: path, old_string: 'x', new_string: 'y' }),
      },
    },
    {
      seq: 2,
      type: 'tool/result',
      data: { turn, message: { source: { callId } }, meta: { diffs } },
    },
  ]
}

const post = (endpoint, args) => JSON.stringify({
  type: 'client-request',
  rpcId: 'rpc-1',
  method: `dshGit/${endpoint}`,
  payload: { args },
})

// ── 1. the plugin owns a prefix route on its own injected webServer ──
{
  const { route, module } = await compose()
  check('route: registers /dsh-git as its own prefix route',
    route !== undefined && route.kind === 'prefix' && route.path === '/dsh-git',
    route === undefined ? 'nothing registered' : `${route.kind} ${route.path}`)
  check('route: does not route through connection.rpc.handle',
    typeof module.apply === 'function' && module.inject.includes('webServer') && module.inject.includes('connection'),
    module.inject.join(', '))
}

// ── 2. method + authentication gates ──
{
  const { route } = await compose()
  const get = fakeResponse()
  await route.handler(fakeRequest('GET'), get)
  check('gate: a non-POST method answers 405', get.statusCode === 405, `status=${get.statusCode}`)
}
{
  const { route } = await compose({ rejection: 401 })
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('status', { sessionId: 'S1' })), res)
  check('gate: the shared rejection is re-applied (401 before dispatch)',
    res.statusCode === 401 && res.body === 'unauthorized', `status=${res.statusCode} body=${res.body}`)
}
{
  const { route } = await compose({ rejection: 403 })
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('status', { sessionId: 'S1' })), res)
  check('gate: forbidden hosts answer 403', res.statusCode === 403 && res.body === 'forbidden')
}

// ── 3. envelope decoding and error shaping ──
{
  const { route } = await compose()
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', '{not json'), res)
  check('envelope: malformed JSON answers 400', res.statusCode === 400, `status=${res.statusCode}`)
}
{
  const { route } = await compose()
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('nope', {})), res)
  const body = JSON.parse(res.body)
  check('envelope: an unowned endpoint answers a shaped dsh-git-error',
    res.statusCode === 200 && body.type === 'server-response' && body.rpcId === 'rpc-1'
      && body.result.ok === false && body.result.error.code === 'dsh-git-error'
      && body.result.error.message.includes('unknown dsh-git method'),
    body.result?.error?.message ?? res.body)
}
{
  const { route } = await compose()
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', JSON.stringify({
    type: 'client-request', rpcId: 'rpc-1', method: '../etc/passwd', payload: { args: {} },
  })), res)
  const body = JSON.parse(res.body)
  check('envelope: a method outside the dshGit/* pattern is refused before dispatch',
    body.result.ok === false && body.result.error.message.includes('unknown dsh-git endpoint'),
    body.result?.error?.message ?? res.body)
}
{
  const { route } = await compose()
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('status', {})), res)
  const body = JSON.parse(res.body)
  check('envelope: a missing sessionId surfaces as a dsh-git-error result',
    body.result.ok === false && body.result.error.message === 'sessionId required',
    body.result?.error?.message ?? res.body)
}

// ── 4. a real dispatch runs git and answers the parsed status ──
{
  const { route, spawns } = await compose()
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('status', { sessionId: 'S1' })), res)
  const body = JSON.parse(res.body)
  const value = body.result?.value
  check('dispatch: status runs git in the session cwd and returns the parsed status',
    body.result.ok === true && value.branch === 'main...origin/main'
      && value.unstaged.join(',') === 'a.ts' && value.untracked.join(',') === 'b.ts'
      && value.cwd === '/tmp/ws' && spawns[0]?.argv.join(' ') === 'git status --porcelain=v1 -b',
    JSON.stringify(value))
}

// ── 5. the response is a Connection-shaped envelope the client can parse ──
{
  const { route } = await compose()
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('status', { sessionId: 'S1' })), res)
  check('envelope: response carries type/rpcId/result and no-store framing',
    res.headers?.['content-type']?.startsWith('application/json') === true
      && res.headers?.['cache-control'] === 'no-store'
      && typeof res.headers?.['content-length'] === 'number',
    JSON.stringify(res.headers))
}

// ── 6. turnDiff anchors hunks in real file lines ──
{
  // The on-disk file is the AFTER state: hunk 1 inserted a line at file line 10
  // (old side had three lines, new side four), hunk 2 sits at file line 50.
  const lines = Array.from({ length: 200 }, (_, index) => `line ${index + 1}`)
  const put = (start, values) => values.forEach((value, offset) => { lines[start - 1 + offset] = value })
  put(10, ['ctx1', 'new1a', 'new1b', 'ctx2'])
  put(50, ['ctx3', 'new2a', 'new2b', 'ctx4'])
  const fileText = lines.join('\n') + '\n'
  const diffs = [
    { path: 'src/a.ts', oldText: 'ctx1\nold1\nctx2', newText: 'ctx1\nnew1a\nnew1b\nctx2' },
    { path: 'src/a.ts', oldText: 'ctx3\nold2\nctx4', newText: 'ctx3\nnew2a\nnew2b\nctx4' },
  ]
  const { route, reads } = await compose({ events: editEvents(3, 'c1', 'src/a.ts', diffs), fileText })
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('turnDiff', { sessionId: 'S1', turn: 3 })), res)
  const body = JSON.parse(res.body)
  const hunks = body.result?.value?.files?.[0]?.hunks ?? []
  check('line numbers: hunks carry the file line of their first line',
    hunks.length === 2 && hunks[0].newStart === 10 && hunks[1].newStart === 50,
    hunks.map((h) => `new=${h.newStart}`).join(', ') || 'no hunks')
  check('line numbers: the old side trails the new side by the earlier hunks\' net lines',
    hunks[0]?.oldStart === 10 && hunks[1]?.oldStart === 49,
    hunks.map((h) => `old=${h.oldStart}`).join(', '))
  check('line numbers: the file is read once per request', reads.length === 1, reads.join(', '))
}
{
  // A create has no prior text: its first line is file line 1 by construction.
  const diffs = [{ path: 'src/new.ts', oldText: null, newText: 'one\ntwo\n' }]
  const { route } = await compose({ events: editEvents(4, 'c2', 'src/new.ts', diffs), fileText: 'one\ntwo\n' })
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('turnDiff', { sessionId: 'S1', turn: 4 })), res)
  const hunks = JSON.parse(res.body).result?.value?.files?.[0]?.hunks ?? []
  check('line numbers: a created file starts at line 1',
    hunks[0]?.newStart === 1 && hunks[0]?.oldStart === 1,
    JSON.stringify(hunks[0] ?? null))
}
{
  // The block is gone from disk (a later edit replaced it): no guess, no start.
  const diffs = [{ path: 'src/a.ts', oldText: 'ctx\nold\n', newText: 'ctx\nnew\n' }]
  const { route } = await compose({
    events: editEvents(5, 'c3', 'src/a.ts', diffs),
    fileText: 'something\ncompletely\ndifferent\n',
  })
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('turnDiff', { sessionId: 'S1', turn: 5 })), res)
  const hunks = JSON.parse(res.body).result?.value?.files?.[0]?.hunks ?? []
  check('line numbers: an unlocatable hunk keeps hunk-relative numbering',
    hunks.length === 1 && hunks[0].newStart === undefined && hunks[0].oldStart === undefined,
    JSON.stringify(hunks[0] ?? null))
}
{
  // Unreadable file (deleted since): same graceful degradation, no throw.
  const diffs = [{ path: 'src/gone.ts', oldText: 'a\n', newText: 'b\n' }]
  const { route } = await compose({ events: editEvents(6, 'c4', 'src/gone.ts', diffs), fileText: null })
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('turnDiff', { sessionId: 'S1', turn: 6 })), res)
  const body = JSON.parse(res.body)
  check('line numbers: an unreadable file still answers the turn',
    body.result.ok === true && body.result.value.files.length === 1
      && body.result.value.files[0].hunks[0].newStart === undefined,
    JSON.stringify(body.result?.value?.files?.[0]?.hunks?.[0] ?? null))
}

// ── 7. a refused edit contributes nothing ──
{
  // A real session's failed `edit` looks exactly like a successful one on the
  // wire except for the result content; replaying its arguments would invent a
  // change the file never received (that is how the popover showed a phantom
  // hunk numbered 1..N).
  const diffs = [{ path: 'src/a.ts', oldText: 'old\n', newText: 'new\n' }]
  const events = [
    {
      seq: 1,
      type: 'tool/call',
      data: {
        turn: 7,
        name: 'edit',
        callId: 'bad',
        arguments: JSON.stringify({ file_path: 'src/a.ts', old_string: 'old', new_string: 'new' }),
      },
    },
    {
      seq: 2,
      type: 'tool/result',
      data: {
        turn: 7,
        message: { source: { callId: 'bad' }, content: [{ isError: true }] },
        meta: { diffs },
      },
    },
  ]
  const { route } = await compose({ events, fileText: 'old\n' })
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('turnDiff', { sessionId: 'S1', turn: 7 })), res)
  const files = JSON.parse(res.body).result?.value?.files ?? []
  check('failed edit: an errored tool result contributes no file and no hunk',
    files.length === 0, JSON.stringify(files))
}

// ── 8. one call may touch an earlier line than the previous call ──
{
  const lines = Array.from({ length: 200 }, (_, index) => `line ${index + 1}`)
  lines[0] = "'use strict'"
  lines[99] = 'anchorA'
  const fileText = lines.join('\n') + '\n'
  const events = [
    ...editEvents(8, 'first', 'src/a.ts', [{ path: 'src/a.ts', oldText: 'anchorA_old\n', newText: 'anchorA\n' }]),
    // Same file, same turn, but back at line 1: a single monotonic cursor would
    // have given up here and left the gutter blank.
    ...editEvents(8, 'second', 'src/a.ts', [{ path: 'src/a.ts', oldText: 'other_old\n', newText: "'use strict'\n" }]),
  ]
  const { route } = await compose({ events, fileText })
  const res = fakeResponse()
  await route.handler(fakeRequest('POST', post('turnDiff', { sessionId: 'S1', turn: 8 })), res)
  const hunks = JSON.parse(res.body).result?.value?.files?.[0]?.hunks ?? []
  check('line numbers: each edit call anchors independently (later call above the first)',
    hunks.length === 2 && hunks[0].newStart === 1 && hunks[1].newStart === 100,
    hunks.map((h) => `new=${h.newStart}`).join(', ') || 'no hunks')
  check('line numbers: hunks are returned in file order, not call order',
    hunks.length === 2 && hunks[0].newStart < hunks[1].newStart,
    hunks.map((h) => `new=${h.newStart}`).join(' -> '))
  check('line numbers: anchoring inputs stay out of the payload',
    hunks.every((h) => h.call === undefined), Object.keys(hunks[0] ?? {}).join(','))
}

const failed = results.filter((r) => !r.ok).length
console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILURE(S)`} (${results.length} checks)`)
process.exitCode = failed === 0 ? 0 : 1
