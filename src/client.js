'use strict'

const BUILD_TS = '08-26 20:30:00'

const React = require('react')

const CSS = [
  /* ---- Git overlay panel (official tokens, theme-adaptive) ---- */
  '.dg-panel{position:fixed;top:64px;right:16px;width:480px;max-width:94vw;max-height:calc(100vh - 96px);overflow:auto;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#1a1a1a);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.3);z-index:2000;padding:14px;font:13px/1.5 system-ui,sans-serif;pointer-events:auto;box-sizing:border-box}',
  '.dg-panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}',
  '.dg-panel-title{font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.dg-panel-build{font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:11px;color:var(--dsw-alias-label-caption,#999);margin-left:8px;font-weight:400}',
  '.dg-btn-row{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center}',
  '.dg-btn{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.06));border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:8px;padding:3px 9px;cursor:pointer;font-size:12px;color:var(--dsw-alias-label-secondary,#333)}',
  '.dg-btn:hover{background:var(--dsw-alias-interactive-bg-hover-solid,rgba(0,0,0,.1));color:var(--dsw-alias-label-primary)}',
  '.dg-btn:disabled{opacity:.5;cursor:default}',
  '.dg-btn-active{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b82f6) 14%,transparent);border-color:var(--dsw-alias-state-business-primary,#3b82f6);color:var(--dsw-alias-state-business-primary,#3b82f6)}',
  '.dg-sec-title{font-weight:600;margin:12px 0 6px;color:var(--dsw-alias-label-secondary,#444);font-size:12px}',
  '.dg-status-row{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06));cursor:pointer}',
  '.dg-status-row:hover{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.04))}',
  '.dg-status-path{font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.dg-code{white-space:pre-wrap;word-break:break-all;background:var(--dsw-alias-markdown-code-block,rgba(0,0,0,.06));border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08));border-radius:8px;padding:8px;margin:4px 0;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;line-height:1.5;max-height:340px;overflow:auto}',
  '.dg-err{color:var(--dsw-alias-state-error-primary,#b3261e);white-space:pre-wrap}',
  '.dg-ok{color:var(--dsw-alias-state-success-primary,#188038);white-space:pre-wrap}',
  '.dg-muted{color:var(--dsw-alias-label-tertiary,#666);font-size:12px}',
  '.dg-input{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.15));border-radius:8px;padding:6px;font-size:12px;font-family:inherit;background:var(--dsw-alias-bg-base,transparent);color:var(--dsw-alias-label-primary)}',
  /* ---- Turn summary card (turnTail chain) ---- */
  '.dg-turn{position:relative;margin:8px 0 4px;padding:8px 10px 8px 14px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08));border-radius:10px;background:var(--dsw-alias-bg-base,transparent)}',
  /* Signature: a 2px diff-gutter accent on the card's left edge. */
  '.dg-turn::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:2px;border-radius:1px;background:var(--dsw-alias-state-business-primary,#8ab4f8)}',
  '.dg-turn-head{display:flex;align-items:baseline;gap:8px;margin-bottom:4px}',
  '.dg-turn-tag{display:inline-block;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#8ab4f8) 16%,transparent);color:var(--dsw-alias-state-business-primary,#3b6fd4);border-radius:5px;padding:1px 6px;font-size:11px;font-weight:600;line-height:16px}',
  '.dg-turn-title{color:var(--dsw-alias-label-secondary,#444);font-size:12px}',
  '.dg-turn-stat{margin-left:auto;font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;color:var(--dsw-alias-label-caption,#888);white-space:nowrap}',
  '.dg-turn-stat .dg-add{color:var(--dsw-alias-state-success-primary,#188038)}',
  '.dg-turn-stat .dg-del{color:var(--dsw-alias-state-error-primary,#b3261e)}',
  '.dg-file{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:3px 0;cursor:pointer;border-radius:4px}',
  '.dg-file:hover{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.04))}',
  '.dg-file-path{font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;color:var(--dsw-alias-label-secondary,#444);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
  '.dg-file-chev{color:var(--dsw-alias-label-caption,#aaa);font-size:10px;flex:none;transition:transform .12s ease}',
  '.dg-file-open .dg-file-chev{transform:rotate(90deg)}',
  '.dg-file-stat{font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:11px;color:var(--dsw-alias-label-caption,#888);flex:none;white-space:nowrap}',
  '.dg-file-stat .dg-add{color:var(--dsw-alias-state-success-primary,#188038);font-weight:600}',
  '.dg-file-stat .dg-del{color:var(--dsw-alias-state-error-primary,#b3261e);font-weight:600}',
  /* Expanded diff card: official DiffBlock language. */
  '.dg-diff{margin:2px 0 6px 6px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:10px;background:var(--dsw-alias-markdown-code-block,rgba(0,0,0,.04));overflow:hidden}',
  '.dg-diff-head{padding:6px 12px;font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06))}',
  '.dg-diff-body{padding:8px 12px;overflow-x:auto;font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;line-height:20px;max-height:280px;overflow-y:auto}',
  '.dg-diff-line{min-height:20px;white-space:pre;color:var(--dsw-alias-label-secondary)}',
  '.dg-diff-gap{color:var(--dsw-alias-label-caption,#aaa)}',
  '.dg-diff-del{color:var(--dsw-alias-state-error-primary,#b3261e)}',
  '.dg-diff-del::before{content:"- ";color:var(--dsw-alias-state-error-primary,#b3261e)}',
  '.dg-diff-add{color:var(--dsw-alias-state-success-primary,#188038)}',
  '.dg-diff-add::before{content:"+ ";color:var(--dsw-alias-state-success-primary,#188038)}',
  '.dg-diff-foot{padding:4px 12px 8px;font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:11px;color:var(--dsw-alias-label-caption,#999)}',
].join('')

let rootCtx = null
let rootSlots = null

function mountCss() {
  if (typeof document === 'undefined') return
  if (document.getElementById('dsh-git-style')) return
  const tag = document.createElement('style')
  tag.id = 'dsh-git-style'
  tag.textContent = CSS
  document.head.appendChild(tag)
}

async function callRemote(endpoint, args) {
  const result = await rootCtx.connection.rpc.call('/dsh-git', endpoint, { args })
  if (result.ok) return result.value
  const error = result.error || {}
  throw new Error(error.message || error.code || 'dsh-git remote call failed')
}

const state = { open: false, sessionId: null, diag: null, tailSeen: {} }
const listeners = new Set()

function emit() {
  for (const fn of listeners) fn()
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function setState(patch) {
  Object.assign(state, patch)
  emit()
}

function useStore() {
  const [, force] = React.useState(0)
  React.useEffect(() => subscribe(() => force((value) => value + 1)), [])
  return state
}

function HeaderButton(props) {
  const st = useStore()
  React.useEffect(() => {
    if (props.sessionId && state.sessionId !== props.sessionId) setState({ sessionId: props.sessionId })
  }, [props.sessionId])
  return React.createElement(
    'button',
    {
      className: 'dg-btn',
      title: 'Git 状态与操作',
      onClick: () => setState({ open: !st.open, sessionId: st.sessionId || props.sessionId }),
    },
    st.open ? 'Git ✓' : 'Git',
  )
}

function seg(title, items, mark, onPick) {
  if (!items || items.length === 0) return null
  return React.createElement(
    'div',
    null,
    React.createElement('div', { className: 'dg-sec-title' }, `${title} (${items.length})`),
    items.map((path) =>
      React.createElement(
        'div',
        { className: 'dg-status-row', key: path, onClick: () => onPick(path, mark) },
        React.createElement('span', { className: 'dg-status-path' }, path),
      )),
  )
}

/**
 * Conversation Node Definition accumulating per-turn diff facts from
 * tool/result events. Publishes no view Node; its only output is the
 * turn-scoped business data that the turn-tail chain selector reads.
 *
 * Data source (post-2026-08-25 dsh refactor): the tool/result event's
 * `meta.diffs` — the same payload the official diff-card-model consumes.
 * When meta is absent (e.g. a write whose meta carried no hunks), the
 * write/edit call arguments synthesize the hunk, mirroring the official
 * fallback in ui-tool's diff-card-model.
 *
 * NOTE: buildLocationData's returned `key` MUST equal the definition's
 * `kind` (conversation assembler enforces this), so the data key is
 * 'dsh-git-turn-diffs'.
 */
function dshGitDiffsDefinition() {
  return {
    kind: 'dsh-git-turn-diffs',
    match: function match(event) {
      if (event.type === 'turn/start') return { id: String(event.data.turn), role: 'start' }
      if (event.type === 'tool/call') return { id: String(event.data.turn), role: 'update' }
      if (event.type === 'tool/result') {
        // Only append-origin surface results count — replacement copies are
        // model-only (same filter as ui-deliverables' deliverablesDefinition).
        if (event.surfaceOp !== undefined && event.surfaceOp !== 'append') return null
        return { id: String(event.data.turn), role: 'update' }
      }
      return null
    },
    start: function start(_context, match) {
      if (match.event.type !== 'turn/start') throw new Error('dsh-git-turn-diffs start requires turn/start')
      return { turn: match.event.data.turn, calls: new Map(), diffs: [] }
    },
    update: function update(context, match) {
      if (match.event.type === 'tool/call') {
        const p = match.event.data
        if (p.name !== 'write' && p.name !== 'edit') return context.state
        let args = null
        try { args = JSON.parse(p.arguments || '{}') } catch (_) { /* malformed args: skip */ }
        const calls = new Map(context.state.calls)
        calls.set(String(p.callId), { name: p.name, args: args || {} })
        return { ...context.state, calls }
      }
      if (match.event.type !== 'tool/result') return context.state
      // Error results contribute nothing.
      const content = match.event.data.message && match.event.data.message.content
      if (content && content[0] && content[0].isError === true) return context.state
      // Applied hunks from result metadata — the official data source.
      const meta = match.event.data.meta
      if (meta && typeof meta === 'object' && !Array.isArray(meta)
        && Array.isArray(meta.diffs) && meta.diffs.length > 0) {
        return { ...context.state, diffs: [...context.state.diffs, ...meta.diffs] }
      }
      // Fallback: synthesize from the paired call arguments (write/edit).
      const callId = match.event.data.message && match.event.data.message.source
        ? String(match.event.data.message.source.callId)
        : null
      const call = callId === null ? undefined : context.state.calls.get(callId)
      if (call === undefined) return context.state
      const args = call.args || {}
      if (call.name === 'write' && typeof args.file_path === 'string' && typeof args.content === 'string') {
        return {
          ...context.state,
          diffs: [...context.state.diffs, { path: args.file_path, oldText: null, newText: args.content }],
        }
      }
      if (call.name === 'edit' && typeof args.file_path === 'string'
        && typeof args.old_string === 'string' && typeof args.new_string === 'string') {
        return {
          ...context.state,
          diffs: [...context.state.diffs, { path: args.file_path, oldText: args.old_string, newText: args.new_string }],
        }
      }
      return context.state
    },
    buildLocationData: function buildLocationData(context, scope) {
      if (scope !== 'turn' || context.state === undefined) return null
      return {
        kind: 'turn',
        turn: context.state.turn,
        key: 'dsh-git-turn-diffs',
        value: { diffs: context.state.diffs },
      }
    },
  }
}

/**
 * Chain selector: claim the turn-tail chain only when the closing turn
 * produced file mutations. Returns the raw diffs as the component's match.
 */
function selectTurnDiffs(owner) {
  const turnNumber = owner && owner.turn && owner.turn.turn
  const data = owner && owner.turn && owner.turn.data && owner.turn.data.get('dsh-git-turn-diffs')
  if (typeof turnNumber === 'number') {
    state.tailSeen[turnNumber] = true
    const diag = state.diag || {}
    diag.lastSelectorTurn = turnNumber
    diag.lastSelectorHasData = !!(data && data.diffs && data.diffs.length > 0)
    state.diag = diag
    emit()
  }
  if (!data || !data.diffs || data.diffs.length === 0) return null
  return data.diffs
}

/** Count content lines (trailing newline is a terminator, like official DiffBlock). */
function countLines(text) {
  if (text == null || text === '') return 0
  const body = text.endsWith('\n') ? text.slice(0, -1) : text
  return body.split('\n').length
}

/** Render one hunk's old/new sides as official-style diff rows. */
function hunkRows(h) {
  const rows = []
  const oldText = h.oldText
  const newText = h.newText
  const oldLines = oldText == null ? [] : (oldText === '' ? [] : (oldText.endsWith('\n') ? oldText.slice(0, -1) : oldText).split('\n'))
  const newLines = newText == null ? [] : (newText === '' ? [] : (newText.endsWith('\n') ? newText.slice(0, -1) : newText).split('\n'))
  for (let i = 0; i < oldLines.length; i++) rows.push({ kind: 'del', text: oldLines[i] })
  for (let i = 0; i < newLines.length; i++) rows.push({ kind: 'add', text: newLines[i] })
  return rows
}

/** Turn-level file-change summary in turnTail chain. */
function TurnDiffSummary(props) {
  // Chain entry props: { ...TurnTailOwnerProps, matched: selector result }
  const allDiffs = props.matched || []
  const turnNumber = props.turn && props.turn.turn
  const [open, setOpen] = React.useState({})
  const [confirmRestore, setConfirmRestore] = React.useState(false)
  const [restoring, setRestoring] = React.useState(false)
  const [agentRunning, setAgentRunning] = React.useState(false)

  // Check agent status
  React.useEffect(() => {
    if (!state.sessionId) return
    let alive = true
    callRemote('dshGit/agent.status', { sessionId: state.sessionId })
      .then((r) => { if (alive) setAgentRunning(r.running) })
      .catch(() => { if (alive) setAgentRunning(false) })
    return () => { alive = false }
  }, [state.sessionId])

  if (!allDiffs || allDiffs.length === 0) return null

  // Track which turns we've seen
  if (typeof turnNumber === 'number') { state.tailSeen[turnNumber] = true; emit() }

  // Group diffs by path and compute stats
  const byPath = {}
  for (let i = 0; i < allDiffs.length; i++) {
    const d = allDiffs[i]
    const path = d.path
    if (!byPath[path]) byPath[path] = { path, hunks: [], add: 0, del: 0 }
    byPath[path].hunks.push(d)
  }
  const files = Object.keys(byPath).sort()
  let totalAdd = 0
  let totalDel = 0
  for (let i = 0; i < files.length; i++) {
    const f = byPath[files[i]]
    for (let j = 0; j < f.hunks.length; j++) {
      const h = f.hunks[j]
      const add = countLines(h.newText)
      const del = countLines(h.oldText)
      f.add += add
      f.del += del
      totalAdd += add
      totalDel += del
    }
  }
  const plural = files.length > 1 ? '个文件' : '个文件'

  // Restore this turn's changes
  const doRestore = () => {
    if (!state.sessionId || !turnNumber || agentRunning) return
    setRestoring(true)
    callRemote('dshGit/restoreTurn', { sessionId: state.sessionId, turn: turnNumber })
      .then((r) => {
        setRestoring(false)
        setConfirmRestore(false)
        alert(`已撤销 turn ${turnNumber} 的修改，恢复了 ${r.restored.length} 个文件`)
      })
      .catch((e) => {
        setRestoring(false)
        alert('恢复失败: ' + (e.message || e))
      })
  }

  return React.createElement(
    'div',
    { className: 'dg-turn', 'data-dsh-git': 'turn-summary', 'data-turn': turnNumber },
    React.createElement('div', { className: 'dg-turn-head' },
      React.createElement('span', { className: 'dg-turn-tag' }, 'dsh-git'),
      React.createElement('span', { className: 'dg-turn-title' }, `本回合修改 ${files.length} ${plural}`),
      React.createElement('span', { className: 'dg-turn-stat' },
        React.createElement('span', { className: 'dg-add' }, `+${totalAdd}`),
        ' ',
        React.createElement('span', { className: 'dg-del' }, `−${totalDel}`)),
      // Restore button
      React.createElement('button', {
        className: 'dg-btn',
        style: { marginLeft: 8, fontSize: 11, padding: '2px 8px', opacity: agentRunning ? 0.5 : 1 },
        disabled: agentRunning || restoring,
        onClick: (e) => { e.stopPropagation(); setConfirmRestore(true) },
        title: agentRunning ? 'agent 运行中，恢复已禁用' : '撤销本回合修改',
      }, restoring ? '恢复中…' : '恢复'),
    ),
    // Confirm restore dialog
    confirmRestore
      ? React.createElement('div', {
          style: {
            margin: '6px 0',
            padding: '8px 10px',
            border: '1px solid var(--dsw-alias-border-l1)',
            borderRadius: 8,
            background: 'var(--dsw-alias-bg-base)',
          },
        },
          React.createElement('div', { className: 'dg-muted', style: { marginBottom: 6 } },
            `确认撤销 turn ${turnNumber} 的修改？将恢复 ${files.length} 个文件到修改前的状态。`),
          React.createElement('div', { className: 'dg-btn-row' },
            React.createElement('button', {
              className: 'dg-btn dg-btn-active',
              disabled: restoring,
              onClick: doRestore,
            }, restoring ? '恢复中…' : '确认撤销'),
            React.createElement('button', {
              className: 'dg-btn',
              onClick: () => setConfirmRestore(false),
            }, '取消')))
      : null,
    files.map(function (path) {
      const f = byPath[path]
      const opened = !!open[path]
      const fileRows = []
      for (let j = 0; j < f.hunks.length; j++) {
        if (j > 0) fileRows.push(React.createElement('div', { className: 'dg-diff-line dg-diff-gap', key: `gap-${j}` }, '⋯'))
        const rows = hunkRows(f.hunks[j])
        for (let k = 0; k < rows.length; k++) {
          fileRows.push(React.createElement('div', {
            className: 'dg-diff-line ' + (rows[k].kind === 'del' ? 'dg-diff-del' : 'dg-diff-add'),
            key: `h${j}-${k}`,
          }, rows[k].text))
        }
      }
      return React.createElement('div', { key: path },
        React.createElement('div', {
          className: 'dg-file' + (opened ? ' dg-file-open' : ''),
          onClick: function () { setOpen(function (o) { const n = {}; for (const k in o) n[k] = o[k]; n[path] = !n[path]; return n }) },
          title: opened ? '收起 diff' : '展开 diff',
        },
          React.createElement('span', { className: 'dg-file-chev' }, opened ? '▾' : '▸'),
          React.createElement('span', { className: 'dg-file-path' }, path),
          React.createElement('span', { className: 'dg-file-stat' },
            React.createElement('span', { className: 'dg-add' }, `+${f.add}`),
            ' ',
            React.createElement('span', { className: 'dg-del' }, `−${f.del}`)),
        ),
        opened
          ? React.createElement('div', { className: 'dg-diff' },
              React.createElement('div', { className: 'dg-diff-head' }, path),
              React.createElement('div', { className: 'dg-diff-body' }, fileRows),
              React.createElement('div', { className: 'dg-diff-foot' }, `└ +${f.add} -${f.del} · ${f.hunks.length} hunk`))
          : null)
    }),
  )
}



/** Panel-side fallback: recent turns with file changes. */
function RecentTurns(props) {
  const [turns, setTurns] = React.useState(null)
  const [open, setOpen] = React.useState({})
  const sessionId = state.sessionId
  React.useEffect(() => {
    let alive = true
    if (sessionId == null) return
    callRemote('dshGit/recentTurns', { sessionId, limit: 6 })
      .then((r) => { if (alive) setTurns(r.turns || []) })
      .catch(() => { if (alive) setTurns([]) })
    return () => { alive = false }
  }, [sessionId, state.sessionId])
  const withFiles = (turns || []).filter((t) => t.files && t.files.length > 0)
  if (withFiles.length === 0) return null
  return React.createElement(
    'div',
    { className: 'dg-turn', 'data-dsh-git': 'recent-turns' },
    React.createElement('div', { className: 'dg-turn-head' },
      React.createElement('span', { className: 'dg-turn-tag' }, 'dsh-git'),
      React.createElement('span', { className: 'dg-turn-title' }, '最近修改回合'),
      React.createElement('span', { className: 'dg-turn-stat' },
        `seen=${Object.keys(state.tailSeen || {}).slice(-6).join(',') || '无'}`)),
    withFiles.slice().reverse().map((t) => {
      const opened = !!open[t.turn]
      const add = t.files.reduce((a, f) => a + f.add, 0)
      const del = t.files.reduce((a, f) => a + f.del, 0)
      return React.createElement('div', { key: t.turn },
        React.createElement('div', {
          className: 'dg-file' + (opened ? ' dg-file-open' : ''),
          onClick: () => setOpen((o) => ({ ...o, [t.turn]: !o[t.turn] })),
        },
          React.createElement('span', { className: 'dg-file-chev' }, opened ? '▾' : '▸'),
          React.createElement('span', { className: 'dg-file-path' }, `turn ${t.turn} · ${t.files.length} 文件`),
          React.createElement('span', { className: 'dg-file-stat' },
            React.createElement('span', { className: 'dg-add' }, `+${add}`),
            ' ',
            React.createElement('span', { className: 'dg-del' }, `−${del}`))),
        opened
          ? t.files.map((f) => React.createElement('div', { key: f.path, className: 'dg-diff' },
              React.createElement('div', { className: 'dg-diff-head' }, f.path),
              React.createElement('div', { className: 'dg-diff-body' },
                f.hunks.map((hx, i) => {
                  const rows = hunkRows(hx)
                  return rows.map((row, k) => React.createElement('div', {
                    className: 'dg-diff-line ' + (row.kind === 'del' ? 'dg-diff-del' : 'dg-diff-add'),
                    key: `${i}-${k}`,
                  }, row.text))
                }))))
          : null)
    }),
  )
}

function ChangesTab(props) {
  const [data, setData] = React.useState(null)
  const [ver, setVer] = React.useState(0)
  const [out, setOut] = React.useState({ loading: true, text: '', error: null })
  React.useEffect(() => {
    if (!state.sessionId) return
    let alive = true
    callRemote('dshGit/status', { sessionId: state.sessionId }).then((r) => { if (alive) setData(r) }).catch((e) => { if (alive) setData({ error: String((e && e.message) || e) }) })
    return () => { alive = false }
  }, [state.sessionId, ver])
  React.useEffect(() => {
    if (!state.sessionId) return
    let alive = true
    setOut({ loading: true, text: '', error: null })
    const diffArgs = { sessionId: state.sessionId, staged: props.sel.staged }
    if (props.sel.path) diffArgs.path = props.sel.path
    callRemote('dshGit/diff', diffArgs).then((r) => {
      if (alive) setOut(r.error ? { loading: false, text: '', error: r.error } : { loading: false, text: r.diff, error: null })
    }).catch((e) => { if (alive) setOut({ loading: false, text: '', error: String((e && e.message) || e) }) })
    return () => { alive = false }
  }, [state.sessionId, props.sel, ver])
  return React.createElement(
    'div',
    null,
    React.createElement('div', { className: 'dg-btn-row' },
      React.createElement('span', { className: 'dg-sec-title', style: { margin: 0 } }, data ? (data.error ? '—' : `${data.branch}${data.ahead || data.behind ? ` ↑${data.ahead} ↓${data.behind}` : ''}`) : '加载中…'),
      React.createElement('button', { className: 'dg-btn', onClick: () => setVer((v) => v + 1) }, '刷新')),
    data && data.error ? React.createElement('div', { className: 'dg-err' }, data.error) : null,
    seg('已暂存', data && data.staged, 's', props.onPick),
    seg('未暂存', data && data.unstaged, 'u', props.onPick),
    seg('未跟踪', data && data.untracked, 't', props.onPick),
    React.createElement('div', { className: 'dg-btn-row' },
      React.createElement('button', { className: 'dg-btn' + (props.sel.staged ? '' : ' dg-btn-active'), onClick: () => props.onSel({ staged: false, path: props.sel.path }) }, '未暂存 diff'),
      React.createElement('button', { className: 'dg-btn' + (props.sel.staged ? ' dg-btn-active' : ''), onClick: () => props.onSel({ staged: true, path: props.sel.path }) }, '已暂存 diff'),
      React.createElement('span', { className: 'dg-muted' }, props.sel.path || '全部文件')),
    out.loading ? React.createElement('div', { className: 'dg-muted' }, '计算 diff…') : null,
    out.error ? React.createElement('div', { className: 'dg-err' }, out.error) : null,
    out.text ? React.createElement('pre', { className: 'dg-code' }, out.text) : (out.loading ? null : React.createElement('div', { className: 'dg-muted' }, '无差异')),
  )
}

function CommitTab() {
  const [msg, setMsg] = React.useState('')
  const [arm, setArm] = React.useState(false)
  const [out, setOut] = React.useState(null)
  const doCommit = () => {
    if (!state.sessionId || !msg.trim()) return
    callRemote('dshGit/commit', { sessionId: state.sessionId, message: msg })
      .then((r) => { setOut({ error: null, output: r.output }); setArm(false) })
      .catch((e) => { setOut({ error: String((e && e.message) || e), output: null }); setArm(false) })
  }
  return React.createElement('div', null,
    React.createElement('div', { className: 'dg-sec-title' }, '提交'),
    React.createElement('textarea', { className: 'dg-input', rows: 3, placeholder: 'commit message', value: msg, onChange: (e) => setMsg(e.target.value) }),
    React.createElement('div', { className: 'dg-btn-row', style: { marginTop: 6 } },
      !arm ? React.createElement('button', { className: 'dg-btn', disabled: !msg.trim(), onClick: () => setArm(true) }, '提交全部变更（add -A）') : null,
      arm ? React.createElement('button', { className: 'dg-btn dg-btn-active', onClick: doCommit }, '确认提交') : null,
      arm ? React.createElement('button', { className: 'dg-btn', onClick: () => setArm(false) }, '取消') : null),
    out ? (out.error ? React.createElement('div', { className: 'dg-err' }, out.error) : React.createElement('div', { className: 'dg-ok' }, '已提交：' + out.output)) : null)
}

function PreviewTab() {
  const [path, setPath] = React.useState('')
  const [out, setOut] = React.useState(null)
  const load = () => {
    if (!state.sessionId || !path) return
    callRemote('dshGit/readFile', { sessionId: state.sessionId, path })
      .then((r) => setOut({ error: null, text: r.text }))
      .catch((e) => setOut({ error: String((e && e.message) || e), text: null }))
  }
  return React.createElement('div', null,
    React.createElement('div', { className: 'dg-sec-title' }, '文件预览'),
    React.createElement('div', { className: 'dg-btn-row' },
      React.createElement('input', { className: 'dg-input', placeholder: '相对路径，如 src/index.js', value: path, onChange: (e) => setPath(e.target.value) }),
      React.createElement('button', { className: 'dg-btn', onClick: load }, '读取')),
    out ? (out.error ? React.createElement('div', { className: 'dg-err' }, out.error) : React.createElement('pre', { className: 'dg-code' }, out.text)) : null)
}

function Panel() {
  const st = useStore()
  const [tab, setTab] = React.useState('变更')
  const [sel, setSel] = React.useState({ staged: false, path: '' })
  if (!st.open) return null
  const pick = (path, mark) => { setSel({ staged: mark === 's', path }); setTab('变更') }
  return React.createElement(
    'div',
    { className: 'dg-panel' },
    React.createElement('div', { className: 'dg-panel-head' },
      React.createElement('span', null,
        React.createElement('span', { className: 'dg-panel-title' }, 'Git'),
        React.createElement('span', { className: 'dg-panel-build' }, `dsh-git ${BUILD_TS}`)),
      React.createElement('button', { className: 'dg-btn', onClick: () => setState({ open: false }) }, '关闭'),
    ),
    React.createElement('div', { className: 'dg-muted', style: { marginBottom: 6, fontFamily: 'var(--ds-font-family-code, ui-monospace, Menlo, monospace)', fontSize: 11 } },
      `diag: uiConv=${state.diag && state.diag.hasUiConv ? 'Y' : 'N'} events=${state.diag && state.diag.hasEvents ? 'Y' : 'N'} conn=${state.diag && state.diag.hasConnection ? 'Y' : 'N'} · selLast=${state.diag && state.diag.lastSelectorTurn != null ? state.diag.lastSelectorTurn + (state.diag.lastSelectorHasData ? '(data)' : '(empty)') : 'none'}`),
    React.createElement('div', { className: 'dg-btn-row' },
      ['变更', '提交', '预览'].map((name) =>
        React.createElement('button', { key: name, className: tab === name ? 'dg-btn dg-btn-active' : 'dg-btn', onClick: () => setTab(name) }, name))),
    tab === '变更' ? React.createElement('div', null,
      React.createElement(RecentTurns, null),
      React.createElement(ChangesTab, { sel, onSel: setSel, onPick: pick })) : null,
    tab === '提交' ? React.createElement(CommitTab, null) : null,
    tab === '预览' ? React.createElement(PreviewTab, null) : null,
  )
}

exports.inject = ['slots', 'connection', 'uiConversation']

exports.apply = function apply(ctx) {
  rootCtx = ctx
  const slots = ctx.get === undefined ? ctx.slots : (ctx.get('slots') ?? ctx.slots)
  rootSlots = slots
  if (slots === undefined) return
  // uiConversation service (provided by @deepseek-ai/dsh-client-ui-conversation).
  // Declared in `inject` like the official consumers (ui-chat / ui-deliverables)
  // so ctx.get resolves it; the service installs before this bundle row.
  const uiConversation = ctx.get === undefined ? ctx.uiConversation : ctx.get('uiConversation')
  const diag = state.diag || {}
  diag.build = BUILD_TS
  diag.hasSlots = slots !== undefined
  diag.hasUiConv = uiConversation !== undefined
  diag.hasEvents = !!(uiConversation && uiConversation.events && typeof uiConversation.events.register === 'function')
  diag.hasConnection = !!(ctx.connection)
  diag.tailSeat = 'chain'
  state.diag = diag
  emit()

  ctx.effect(() => {
    mountCss()
    const disposeHeader = slots.inject('conversation.session.header.actions', () =>
      slots.register({
        name: 'conversation.session.header.actions',
        id: 'dsh-git-toggle',
        order: 30,
        label: 'Git',
      }, HeaderButton))
    const disposePanel = slots.inject('shell.overlay', () =>
      slots.register({
        name: 'shell.overlay',
        id: 'dsh-git-panel',
        order: 100,
      }, Panel))
    // Register the per-turn diff accumulator as a Conversation Node Definition.
    // It publishes turn-scoped data under key 'dsh-git-diffs' (buildLocationData),
    // which the turn-tail chain selector reads through owner.turn.data.get().
    // No view Node is built — this definition is data-only.
    let disposeDefinition = () => undefined
    if (uiConversation && uiConversation.events && typeof uiConversation.events.register === 'function') {
      disposeDefinition = uiConversation.events.register(dshGitDiffsDefinition())
    }
    // Register turn-level diff summary in the turnTail chain.
    // Chain entries MUST carry a `select` function: it receives the
    // TurnTailOwnerProps, returns the component's `matched` value or null to
    // decline. The elected component renders inside TurnTailNodeView for ALL
    // turns (including tool-closing turns where closing === null), because
    // the chain content is rendered regardless of whether a closing assistant
    // with text exists.
    const disposeTurnTail = slots.inject('conversation.chat.turnTail', () =>
      slots.register({
        name: 'conversation.chat.turnTail',
        id: 'dsh-git-turn-diff',
        select: selectTurnDiffs,
        order: 10,
      }, TurnDiffSummary))
    return () => {
      disposeHeader()
      disposePanel()
      disposeTurnTail()
      disposeDefinition()
      rootCtx = null
      rootSlots = null
      setState({ open: false, sessionId: null })
    }
  }, 'dsh-git client')
}
