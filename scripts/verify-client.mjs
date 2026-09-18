/**
 * Dev-only regression check for the chat surface this plugin observes (run from
 * the plugin repo):
 *
 *   DSH_CHECKOUT=/path/to/deepseek-harness node scripts/verify-client.mjs
 *
 * dsh-git deliberately owns NO chat slot: the official `ui-deliverables`
 * 「本轮文件改动」 row keeps `conversation.chat.turnTail` to itself, and no
 * dsh-git entry exists in `conversation.chat.assistant-actions` (the old turn
 * card and its restore action are gone). Instead:
 *
 * 1. the plugin registers only additive seats — the header button, the Git
 *    panel, and the hover-diff popover — in `shell.overlay`/list slots that
 *    never evict an official entry;
 * 2. hovering a produced-files chip (`[data-produced-files-row] button`) raises
 *    the popover after the hover-intent delay, resolves the turn from the
 *    enclosing `[data-turn-tail]` (or the chat seat's `[data-chat-turn]` on a
 *    tool-only turn), and fetches the file's diff once per session+turn
 *    through `dshGit/turnDiff`;
 * 3. the popover renders the diff side-by-side (one six-column table, old left
 *    / new right, filler cells on the short side) with the path, status badge
 *    and ± totals in its head;
 * 4. leaving the chip (or scrolling the transcript) closes it after the grace
 *    period and restores the chip's native tooltip;
 * 5. a turn without a record for that file, a missing session, and a chip
 *    outside any turn degrade to an in-popover message instead of an error.
 *
 * It needs the harness checkout for its built `ui-slots`, plus `react`,
 * `react-dom` and `jsdom` from that tree; without one it prints SKIP and
 * exits 0. @module dsh-git/scripts/verify-client
 */
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CHECKOUT = (process.env.DSH_CHECKOUT ?? '').replace(/\/+$/, '')
const BUNDLE = fileURLToPath(new URL('../lib/client.js', import.meta.url))

if (CHECKOUT === '' || !existsSync(`${CHECKOUT}/packages/client/ui-slots/lib/index.js`)) {
  console.log('SKIP: set DSH_CHECKOUT to a built deepseek-harness checkout to run this check')
  process.exit(0)
}

const { SlotCore } = await import(`${CHECKOUT}/packages/client/ui-slots/lib/index.js`)
const uiChatRequire = createRequire(`${CHECKOUT}/packages/client/ui-chat/package.json`)
let jsdom
try {
  jsdom = uiChatRequire('jsdom')
} catch {
  jsdom = createRequire(`${CHECKOUT}/package.json`)('jsdom')
}
const { JSDOM } = jsdom

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
globalThis.window = dom.window
globalThis.document = dom.window.document
try { Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true }) } catch (_) { /* Node's own navigator stands */ }
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const React = uiChatRequire('react')
const { createRoot } = uiChatRequire('react-dom/client')
const act = React.act ?? uiChatRequire('react-dom/test-utils').act

/** Hover-intent open delay is 140ms and the close grace period 180ms (src/client.js). */
const OPEN_WAIT_MS = 220
const CLOSE_WAIT_MS = 260

/**
 * Execute the built bundle; each call yields an independent module instance.
 * The bundle's only module dependency is `react`.
 */
function loadBundle() {
  let registration = null
  dom.window.__ModuleLoader__ = { load: (r) => { registration = r } }
  new Function(readFileSync(BUNDLE, 'utf8'))()
  return registration.factory(spec => {
    if (spec === 'react') return React
    throw new Error(`unexpected require("${spec}")`)
  })
}

const SLOT_SPECS = {
  'conversation.chat.turnTail': { kind: 'chain', scope: 'root' },
  'conversation.chat.assistant-actions': { kind: 'list', scope: 'root' },
  'conversation.session.header.actions': { kind: 'list', scope: 'root' },
  'shell.overlay': { kind: 'list', scope: 'root' },
}

/** Official-entry stand-in: proves the plugin leaves the turn-tail chain alone. */
function officialEntry() {
  return {
    select: () => ({ produced: ['a.ts'] }),
    component: function OfficialRow() { return React.createElement('div', { 'data-official-entry': 'true' }) },
  }
}

/** Compose the real client plugin over a real SlotCore with a fake host RPC. */
function compose({ turnDiffFiles = [{ path: 'src/a.ts', hunks: [] }], turnDiffError = null } = {}) {
  const core = new SlotCore()
  core.register({ name: 'root', children: SLOT_SPECS }, () => null)
  const slots = {
    inject: (key, callback) => {
      if (!Object.hasOwn(SLOT_SPECS, key)) throw new Error(`slot "${key}" is not declared`)
      return callback()
    },
    register: (options, component) => core.register(options, component),
  }
  const rpcCalls = []
  const connection = {
    rpc: {
      call: async (channel, endpoint, payload) => {
        rpcCalls.push({ endpoint, args: payload.args })
        switch (endpoint) {
          case 'dshGit/turnDiff':
            if (turnDiffError !== null) return { ok: false, error: { message: turnDiffError } }
            return { ok: true, value: { files: turnDiffFiles } }
          default:
            return { ok: false, error: { message: `unexpected ${endpoint}` } }
        }
      },
    },
  }
  const services = { slots, connection }
  const ctx = {
    ...services,
    get: (name) => services[name],
    effect: (fn) => {
      const disposer = fn()
      if (typeof disposer === 'function') appDisposers.push(disposer)
      return () => {}
    },
  }
  const official = officialEntry()
  core.register({ name: 'conversation.chat.turnTail', select: official.select }, official.component)
  core.register({ name: 'conversation.chat.assistant-actions', id: 'feedback', order: 10 }, function Feedback() { return null })
  const client = loadBundle()
  ctx.effect(() => client.apply(ctx))
  return { core, rpcCalls }
}

const results = []
const check = (label, ok, detail = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/**
 * Per-scenario isolation: every scenario gets a fresh bundle instance, but JS
 * module state and DOM listeners live outside React, so each scenario must be
 * torn down before the next one composes its own app. Otherwise a stale
 * instance keeps answering the new scenario's pointer events.
 */
const mountedRoots = []
const appDisposers = []

async function resetApp() {
  for (const root of mountedRoots.splice(0)) {
    await act(async () => { root.unmount() })
  }
  document.body.innerHTML = ''
  for (const dispose of appDisposers.splice(0)) {
    try { dispose() } catch (_) { /* teardown is best-effort in the harness */ }
  }
}

async function settle(ms = 0) {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)) })
}

/** Mount one registered component and return `{ container, root }`. */
async function mountComponent(component, props = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push(root)
  await act(async () => { root.render(React.createElement(component, props)) })
  await settle()
  return { container, root }
}

/** One official 「本轮文件改动」 row: chip inside a turn-tail wrapper. */
function officialChip(path, turn = 5) {
  const tail = document.createElement('div')
  tail.setAttribute('data-turn-tail', String(turn))
  const row = document.createElement('div')
  row.setAttribute('data-produced-files-row', '')
  const chip = document.createElement('button')
  chip.type = 'button'
  chip.setAttribute('title', path)
  chip.textContent = path.split('/').pop()
  row.appendChild(chip)
  tail.appendChild(row)
  document.body.appendChild(tail)
  return { tail, chip }
}

const hover = async (node) => {
  await act(async () => { node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })) })
}

const cells = (row) => [...row.querySelectorAll('td')].map(td => td.textContent)

// ── 1. chat slots stay official; the plugin only adds additive seats ──
{
  await resetApp()
  const { core } = compose()
  const tailIds = core.entriesOfSlot('conversation.chat.turnTail').map(e => e.options.id).filter(Boolean)
  const actionIds = core.entriesOfSlot('conversation.chat.assistant-actions').map(e => e.options.id)
  check('turnTail: no dsh-git entry competes for the official row',
    tailIds.every(id => !String(id).startsWith('dsh-git')), tailIds.join(', ') || '(official only)')
  check('assistant-actions: no dsh-git restore action remains',
    actionIds.every(id => !String(id).startsWith('dsh-git')), actionIds.join(', '))
  const overlayIds = core.entriesOfSlot('shell.overlay').map(e => e.options.id).sort()
  check('shell.overlay: panel and hover popover coexist',
    overlayIds.join(',') === 'dsh-git-diff-hover,dsh-git-panel', overlayIds.join(', '))
}

// ── 2. hover a produced chip → popover with the turn's side-by-side diff ──
const FULL_TURN = [{
  path: 'src/a.ts',
  // `oldStart`/`newStart` are what the host anchors onto the file; from line 1
  // the gutter reads 1, 2, 3 and the expectations below stay literal.
  hunks: [{ oldText: 'const a = 1\nconst b = 2\n', newText: 'const a = 1\nconst b = 3\nconst c = 4\n', oldStart: 1, newStart: 1 }],
}]

/** Compose, mount the header (session capture) and the popover, hover `chip`. */
async function hoverScenario({ files = FULL_TURN, error = null, sessionId = 'S1', path = 'src/a.ts', turn = 5 } = {}) {
  await resetApp()
  const { core, rpcCalls } = compose({ turnDiffFiles: files, turnDiffError: error })
  const header = core.entriesOfSlot('conversation.session.header.actions')[0].component
  await mountComponent(header, { sessionId })
  const popover = core.entriesOfSlot('shell.overlay').find(e => e.options.id === 'dsh-git-diff-hover').component
  const { container } = await mountComponent(popover)
  const { chip } = officialChip(path, turn)
  return { container, chip, rpcCalls }
}

{
  await resetApp()
  const { container, chip, rpcCalls } = await hoverScenario()
  check('popover: renders nothing before any hover', container.querySelector('.dg-diff-pop') === null)
  await hover(chip)
  check('popover: still closed during the hover-intent delay', container.querySelector('.dg-diff-pop') === null)
  await settle(OPEN_WAIT_MS)
  const pop = container.querySelector('.dg-diff-pop')
  check('popover: opens after hovering a produced-file chip', pop !== null)
  check('popover: fetches the turn diff once for the viewed session',
    rpcCalls.length === 1 && rpcCalls[0].endpoint === 'dshGit/turnDiff'
      && rpcCalls[0].args.sessionId === 'S1' && rpcCalls[0].args.turn === 5,
    rpcCalls.map(c => `${c.endpoint}(${JSON.stringify(c.args)})`).join(' -> '))
  check('popover head: path, turn, status badge and ± totals',
    pop?.querySelector('.dg-diff-pop-path')?.textContent === 'src/a.ts'
      && pop?.querySelector('.dg-diff-pop-turn')?.textContent === 'turn 5'
      && pop?.querySelector('.dg-file-badge')?.textContent === 'M'
      && pop?.querySelector('.dg-diff-pop-stat')?.textContent === '+3 −2',
    `${pop?.querySelector('.dg-diff-pop-head')?.textContent ?? 'no head'}`)
  check('popover: the chip tooltip is muted while its popover shows the full path',
    chip.getAttribute('title') === null && chip.getAttribute('data-dsh-git-path') === 'src/a.ts',
    `title=${String(chip.getAttribute('title'))}`)
  check('popover: one side-by-side table, six columns, no repeated file header',
    pop?.querySelector('table.dg-diff-split') !== null
      && pop?.querySelectorAll('colgroup col').length === 6
      && pop?.querySelector('.dg-diff-file-header') === null
      && pop?.querySelector('.dg-diff-footer') === null)
  // Two code panes share the popover, so it spans the viewport instead of the
  // chat column (jsdom reports 1024px → 992px after the 32px viewport gutter).
  check('popover: spans the viewport so both panes get real width',
    parseFloat(pop?.style.width ?? '0') >= 900, pop?.style.width ?? 'no width')
  const rows = [...(pop?.querySelectorAll('tbody tr') ?? [])]
  check('popover diff: old line left, new line right on the same row',
    rows.length === 3
      && cells(rows[0]).join('|') === '1|−|const a = 1|1|+|const a = 1'
      && cells(rows[1]).join('|') === '2|−|const b = 2|2|+|const b = 3',
    rows[1] ? cells(rows[1]).join('|') : 'no row')
  check('popover diff: the shorter side is padded so both panes stay aligned',
    rows[2] !== undefined && cells(rows[2]).join('|') === '|||3|+|const c = 4'
      && rows[2].querySelectorAll('td.dg-ds-void').length === 3,
    rows[2] ? cells(rows[2]).join('|') : 'no row')
  check('popover diff: wraps long lines instead of flooring the table',
    pop?.querySelector('table.dg-diff-split')?.classList.contains('dg-diff-wrap') === true
      && pop?.querySelector('table.dg-diff-split')?.getAttribute('style') === null,
    pop?.querySelector('table.dg-diff-split')?.getAttribute('style') ?? 'no inline min-width')

  // The raw state token is a saturated green-500 (~2.3:1 on the light theme
  // background — the "too bright / hard to read" report). Add/remove text must
  // go through the theme-adaptive tone instead.
  const styleText = document.getElementById('dsh-git-style')?.textContent ?? ''
  check('diff colors: the plugin declares a theme-adaptive add/remove tone',
    styleText.includes('--dg-add-fg:color-mix(') && styleText.includes('--dg-del-fg:color-mix('))
  const addCell = container.querySelector('.dg-diff-pop td.dg-ds-add.dg-ds-code')
  const delCell = container.querySelector('.dg-diff-pop td.dg-ds-del.dg-ds-code')
  check('diff colors: changed code lines use that tone, not the raw state color',
    /--dg-add-fg/.test(dom.window.getComputedStyle(addCell).color)
      && /--dg-del-fg/.test(dom.window.getComputedStyle(delCell).color),
    `${dom.window.getComputedStyle(addCell).color} / ${dom.window.getComputedStyle(delCell).color}`)

  // The head toggle swaps wrap for VSCode-style scroll: one table per side,
  // each in its own scroll pane, mirrored to each other.
  const toggle = pop?.querySelector('.dg-diff-pop-toggle')
  check('popover: the head offers a wrap/scroll toggle', toggle?.textContent === '⇄ 滚动',
    toggle?.textContent ?? 'no toggle')
  await act(async () => { toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle()
  const panes = [...container.querySelectorAll('.dg-diff-pop .dg-pane')]
  check('popover scroll mode: one scroll pane per side, each floored at the longest line',
    panes.length === 2
      && panes.every((pane) => pane.querySelector('table.dg-pane-table')?.getAttribute('style')?.includes('calc(12ch + 73px)'))
      && container.querySelector('.dg-diff-pop table.dg-diff-split') === null,
    panes.map((pane) => pane.querySelector('table')?.getAttribute('style') ?? 'no table').join(' , '))
  check('popover scroll mode: each pane renders its own side of the row pair',
    panes[0]?.querySelectorAll('tbody tr').length === panes[1]?.querySelectorAll('tbody tr').length
      && cells(panes[0].querySelectorAll('tbody tr')[1]).join('|') === '2|−|const b = 2'
      && cells(panes[1].querySelectorAll('tbody tr')[1]).join('|') === '2|+|const b = 3',
    panes[1] ? cells(panes[1].querySelectorAll('tbody tr')[1]).join('|') : 'no pane')
  // Panning must not carry the gutter off-screen: the number and sign columns
  // are sticky at the pane's left edge (and opaque, or the code shows through).
  const gutter = dom.window.getComputedStyle(panes[0].querySelector('td.dg-ds-num'))
  const sign = dom.window.getComputedStyle(panes[0].querySelector('td.dg-ds-mark'))
  check('popover scroll mode: the line-number gutter is pinned while the code pans',
    gutter.position === 'sticky' && gutter.left === '0px'
      && gutter.background !== '' && !gutter.background.includes('transparent'),
    `num=${gutter.position}/${gutter.left}/${gutter.background}`)
  check('popover scroll mode: the sign column is pinned next to the numbers',
    sign.position === 'sticky' && sign.left === '44px',
    `mark=${sign.position}/${sign.left}`)
  await act(async () => {
    panes[0].scrollLeft = 40
    panes[0].dispatchEvent(new dom.window.Event('scroll', { bubbles: true }))
  })
  await settle()
  check('popover scroll mode: panning one side mirrors the other',
    panes[1].scrollLeft === 40, `left=${panes[0].scrollLeft} right=${panes[1].scrollLeft}`)
  await act(async () => {
    panes[1].scrollLeft = 7
    panes[1].dispatchEvent(new dom.window.Event('scroll', { bubbles: true }))
  })
  await settle()
  check('popover scroll mode: mirroring works in both directions',
    panes[0].scrollLeft === 7, `left=${panes[0].scrollLeft} right=${panes[1].scrollLeft}`)
  const back = container.querySelector('.dg-diff-pop-toggle')
  check('popover: the toggle now offers wrap again', back?.textContent === '↵ 折行', back?.textContent ?? 'no toggle')
  await act(async () => { back.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle()
  check('popover: toggling back restores wrap mode',
    container.querySelector('.dg-diff-pop table.dg-diff-split')?.classList.contains('dg-diff-wrap') === true)

  // Hovering the same chip again must not refetch or flicker.
  await hover(chip)
  await settle(OPEN_WAIT_MS)
  check('popover: re-hovering the same chip neither refetches nor reopens',
    rpcCalls.length === 1 && container.querySelector('.dg-diff-pop') !== null,
    `turnDiff calls: ${rpcCalls.length}`)

  // Entering the popover keeps it alive…
  const popNode = container.querySelector('.dg-diff-pop')
  await hover(popNode)
  await settle(0)
  await hover(document.body)
  await settle(0)
  await hover(popNode)
  await settle(CLOSE_WAIT_MS)
  check('popover: moving into the popover holds it open', container.querySelector('.dg-diff-pop') !== null)

  // …leaving it closes after the grace period and restores the tooltip.
  await hover(document.body)
  await settle(CLOSE_WAIT_MS)
  check('popover: leaving the chip closes it and restores the chip tooltip',
    container.querySelector('.dg-diff-pop') === null
      && chip.getAttribute('title') === 'src/a.ts'
      && chip.getAttribute('data-dsh-git-path') === null,
    `title=${String(chip.getAttribute('title'))}`)
}

// ── 3. switching between chips swaps the popover in place ──
{
  await resetApp()
  const { core, rpcCalls } = compose({
    turnDiffFiles: [
      { path: 'src/a.ts', hunks: [{ oldText: 'a\n', newText: 'b\n' }] },
      { path: 'src/b.ts', hunks: [{ oldText: null, newText: 'new\nfile\n' }] },
    ],
  })
  const header = core.entriesOfSlot('conversation.session.header.actions')[0].component
  await mountComponent(header, { sessionId: 'S1' })
  const popover = core.entriesOfSlot('shell.overlay').find(e => e.options.id === 'dsh-git-diff-hover').component
  const { container } = await mountComponent(popover)
  const first = officialChip('src/a.ts', 5)
  const second = officialChip('src/b.ts', 5)
  await hover(first.chip)
  await settle(OPEN_WAIT_MS)
  await hover(second.chip)
  await settle(OPEN_WAIT_MS)
  check('popover: a second chip of the same turn reuses the cached fetch',
    rpcCalls.length === 1 && rpcCalls[0].args.turn === 5, `turnDiff calls: ${rpcCalls.length}`)
  check('popover: switching chips swaps the head and the panes',
    container.querySelector('.dg-diff-pop-path')?.textContent === 'src/b.ts'
      && container.querySelector('.dg-file-badge')?.textContent === 'A'
      && container.querySelector('.dg-diff-pop-stat')?.textContent === '+2 −0')
  check('popover: the first chip gets its tooltip back when it loses the hover',
    first.chip.getAttribute('title') === 'src/a.ts' && second.chip.getAttribute('title') === null)
}

// ── 4. no record for the hovered file, no session, no turn ──
{
  await resetApp()
  const { container, chip } = await hoverScenario({ files: [{ path: 'src/other.ts', hunks: [] }] })
  await hover(chip)
  await settle(OPEN_WAIT_MS)
  check('popover: a file with no recorded change explains itself',
    container.querySelector('.dg-diff-pop')?.textContent.includes('该回合没有记录这个文件的改动') === true,
    container.querySelector('.dg-diff-pop-body')?.textContent ?? 'no body')
}
{
  await resetApp()
  const { container, chip } = await hoverScenario({ error: 'boom' })
  await hover(chip)
  await settle(OPEN_WAIT_MS)
  check('popover: a failed fetch reports the host error',
    container.querySelector('.dg-err')?.textContent === 'boom',
    container.querySelector('.dg-diff-pop-body')?.textContent ?? 'no body')
}
{
  await resetApp()
  const { container, chip } = await hoverScenario({ sessionId: null })
  await hover(chip)
  await settle(OPEN_WAIT_MS)
  check('popover: without a session it says so instead of calling the host',
    container.querySelector('.dg-err')?.textContent === '未定位到当前会话',
    container.querySelector('.dg-diff-pop-body')?.textContent ?? 'no body')
}
{
  await resetApp()
  const { core, rpcCalls } = compose()
  const header = core.entriesOfSlot('conversation.session.header.actions')[0].component
  await mountComponent(header, { sessionId: 'S1' })
  const popover = core.entriesOfSlot('shell.overlay').find(e => e.options.id === 'dsh-git-diff-hover').component
  const { container } = await mountComponent(popover)
  // A produced chip outside any `[data-turn-tail]` wrapper carries no turn.
  const row = document.createElement('div')
  row.setAttribute('data-produced-files-row', '')
  const chip = document.createElement('button')
  chip.setAttribute('title', 'src/a.ts')
  row.appendChild(chip)
  document.body.appendChild(row)
  await hover(chip)
  await settle(OPEN_WAIT_MS)
  check('popover: a chip outside any turn says it cannot locate the turn',
    container.querySelector('.dg-err')?.textContent === '未定位到该回合' && rpcCalls.length === 0,
    container.querySelector('.dg-diff-pop-body')?.textContent ?? 'no body')
}

// ── 5. a tool-only turn has no turn-tail wrapper, but the chat seat knows ──
{
  await resetApp()
  const { core, rpcCalls } = compose({ turnDiffFiles: FULL_TURN })
  const header = core.entriesOfSlot('conversation.session.header.actions')[0].component
  await mountComponent(header, { sessionId: 'S1' })
  const popover = core.entriesOfSlot('shell.overlay').find(e => e.options.id === 'dsh-git-diff-hover').component
  const { container } = await mountComponent(popover)
  // `closing === null` renders the produced row through a bare div, so only the
  // seat's `[data-chat-turn]` carries the turn.
  const seat = document.createElement('div')
  seat.setAttribute('data-chat-turn', '7')
  const row = document.createElement('div')
  row.setAttribute('data-produced-files-row', '')
  const chip = document.createElement('button')
  chip.setAttribute('title', 'src/a.ts')
  row.appendChild(chip)
  seat.appendChild(row)
  document.body.appendChild(seat)
  await hover(chip)
  await settle(OPEN_WAIT_MS)
  check('popover: a tool-only turn falls back to the chat seat for its turn number',
    container.querySelector('.dg-diff-pop-turn')?.textContent === 'turn 7'
      && rpcCalls.length === 1 && rpcCalls[0].args.turn === 7,
    rpcCalls.map(c => JSON.stringify(c.args)).join(' -> '))
}

// ── 6. scrolling the transcript dismisses the popover ──
{
  await resetApp()
  const { container, chip } = await hoverScenario()
  await hover(chip)
  await settle(OPEN_WAIT_MS)
  await act(async () => {
    document.body.dispatchEvent(new dom.window.Event('scroll', { bubbles: false }))
  })
  await settle(CLOSE_WAIT_MS)
  check('popover: scrolling the transcript closes it',
    container.querySelector('.dg-diff-pop') === null && chip.getAttribute('title') === 'src/a.ts')
}

// ── 7. a pending close is not re-armed by every subsequent mouseover ──
{
  await resetApp()
  const { container, chip } = await hoverScenario()
  await hover(chip)
  await settle(OPEN_WAIT_MS)
  await hover(document.body)
  await settle(90)
  await hover(document.documentElement)
  await settle(140) // t=230ms: one 180ms timer, not one restarted at t=90
  check('popover: continuous pointer movement does not keep it alive',
    container.querySelector('.dg-diff-pop') === null)
}

// ── 8. host-anchored hunks render real file line numbers ──
{
  await resetApp()
  const { core } = compose({
    turnDiffFiles: [{
      path: 'src/a.ts',
      hunks: [
        { oldText: 'ctx\nold\n', newText: 'ctx\nnew\n', oldStart: 120, newStart: 120 },
        // A later hunk in the same file: the old side trails by earlier net lines.
        { oldText: 'tail\n', newText: 'tail\n', oldStart: 400, newStart: 401 },
      ],
    }],
  })
  const header = core.entriesOfSlot('conversation.session.header.actions')[0].component
  await mountComponent(header, { sessionId: 'S1' })
  const popover = core.entriesOfSlot('shell.overlay').find(e => e.options.id === 'dsh-git-diff-hover').component
  const { container } = await mountComponent(popover)
  const { chip } = officialChip('src/a.ts', 5)
  await hover(chip)
  await settle(OPEN_WAIT_MS)
  const rows = [...(container.querySelectorAll('.dg-diff-pop tbody tr') ?? [])]
  check('line numbers: an anchored hunk shows real file line numbers on both sides',
    rows[0] !== undefined && cells(rows[0]).join('|') === '120|−|ctx|120|+|ctx'
      && rows[1] !== undefined && cells(rows[1]).join('|') === '121|−|old|121|+|new',
    rows[1] ? cells(rows[1]).join('|') : 'no row')
  // rows[2] is the "⋯" separator between hunks.
  check('line numbers: a later hunk keeps its own anchored range',
    rows[3] !== undefined && cells(rows[3]).join('|') === '400|−|tail|401|+|tail',
    rows[3] ? cells(rows[3]).join('|') : 'no row')
}

// ── 9. an unanchored hunk leaves its gutter blank instead of inventing a line ──
{
  await resetApp()
  const { container, chip } = await hoverScenario({
    files: [{ path: 'src/a.ts', hunks: [{ oldText: 'a\nb\n', newText: 'a\nc\n' }] }],
  })
  await hover(chip)
  await settle(OPEN_WAIT_MS)
  const rows = [...(container.querySelectorAll('.dg-diff-pop tbody tr') ?? [])]
  check('line numbers: without an anchor the gutter stays blank (no 1..N guess)',
    rows[1] !== undefined && cells(rows[1]).join('|') === '|−|b||+|c',
    rows[1] ? cells(rows[1]).join('|') : 'no row')
}

const failed = results.filter(r => !r.ok).length
console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILURE(S)`} (${results.length} checks)`)
process.exitCode = failed === 0 ? 0 : 1
