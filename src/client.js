'use strict'

const BUILD_TS = '08-22 22:01'

const React = require('react')

const CSS = '.gp{position:fixed;top:64px;right:16px;width:480px;max-width:94vw;max-height:calc(100vh - 96px);overflow:auto;background:rgba(255,255,255,0.97);color:#1a1a1a;border:1px solid rgba(0,0,0,0.15);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.25);z-index:2000;padding:14px;font:13px/1.5 system-ui,sans-serif;pointer-events:auto;box-sizing:border-box}.gt{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-weight:600}.gr{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center}.gb{background:rgba(0,0,0,0.07);border:1px solid rgba(0,0,0,0.12);border-radius:8px;padding:3px 9px;cursor:pointer;font-size:12px}.gb:disabled{opacity:0.5;cursor:default}.go{background:rgba(0,0,0,0.16)}.gs{font-weight:600;margin:10px 0 6px;color:#444}.gw{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(0,0,0,0.08);cursor:pointer}.gw:hover{background:rgba(0,0,0,0.04)}.pw{white-space:pre-wrap;word-break:break-all;background:rgba(0,0,0,0.06);border-radius:6px;padding:8px;margin:4px 0;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;max-height:340px;overflow:auto}.er{color:#b3261e;white-space:pre-wrap}.mt{color:#666;font-size:12px}.inp{width:100%;box-sizing:border-box;border:1px solid rgba(0,0,0,0.15);border-radius:8px;padding:6px;font-size:12px;font-family:inherit}.ok{color:#188038;white-space:pre-wrap}.dshgit-card{border-color:#8ab4f8!important}.dshgit-tag{display:inline-block;background:#8ab4f8;color:#fff;border-radius:4px;padding:0 5px;font-size:11px;margin-right:4px}.ta{margin:4px 0;border:1px solid rgba(0,0,0,.1);border-radius:8px;padding:6px 8px;background:rgba(0,0,0,.02)}.tm{color:#666;font-size:12px;margin-bottom:4px}.td{display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding:3px 0;font-family:ui-monospace,Menlo,monospace;font-size:12px}.ad{color:#188038;font-weight:600}.dl{color:#b3261e;font-weight:600}.tl{margin:2px 0}.px{white-space:pre-wrap;word-break:break-all;margin:2px 0;padding:6px;background:rgba(0,0,0,.04);border-radius:6px;font:12px/1.4 ui-monospace,Menlo,monospace;max-height:260px;overflow:auto}'

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
  const result = await rootCtx.connection.rpc.call('/api', endpoint, { args })
  if (result.ok) return result.value
  const error = result.error || {}
  throw new Error(error.message || error.code || 'dsh-git remote call failed')
}

const state = { open: false, sessionId: null, diag: null }
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
      className: 'gb',
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
    React.createElement('div', { className: 'gs' }, `${title} (${items.length})`),
    items.map((path) =>
      React.createElement(
        'div',
        { className: 'gw', key: path, onClick: () => onPick(path, mark) },
        React.createElement('span', null, path),
      )),
  )
}

function hunkText(h) {
  const lines = []
  if (h.oldText != null) {
    for (const l of h.oldText.split('\n')) lines.push('- ' + l)
  }
  if (h.newText != null) {
    for (const l of h.newText.split('\n')) lines.push('+ ' + l)
  }
  return lines.join('\n')
}

/** Codex-style summary under the turn reply: current turn's file changes (turnTail chain). */
function TurnTailCard(props) {
  const turn = props.matched && props.matched.turn
  const sessionId = state.sessionId
  const [data, setData] = React.useState(null)
  const [open, setOpen] = React.useState({})
  React.useEffect(() => {
    let alive = true
    setData(null)
    setOpen({})
    if (sessionId == null || turn == null) return
    callRemote('dshGit/turnDiff', { sessionId, turn })
      .then((r) => { if (alive) setData(r ? (r.files || []) : []) })
      .catch(() => { if (alive) setData([]) })
    return () => { alive = false }
  }, [sessionId, turn, state.sessionId])
  if (!data || data.length === 0) return null
  const totalAdd = data.reduce((sum, f) => sum + f.add, 0)
  const totalDel = data.reduce((sum, f) => sum + f.del, 0)
  return React.createElement(
    'div',
    { className: 'ta dshgit-card', 'data-dsh-git': 'turn-summary' },
    React.createElement('div', { className: 'tm' },
      React.createElement('span', { className: 'dshgit-tag' }, 'dsh-git'),
      ` 本回合修改 ${data.length} 个文件 · +${totalAdd} −${totalDel}`),
    data.map((f) => {
      const opened = !!open[f.path]
      return React.createElement(
        'div',
        { key: f.path },
        React.createElement(
          'div',
          { className: 'td', onClick: () => setOpen((o) => ({ ...o, [f.path]: !o[f.path] })) },
          React.createElement('span', null, f.path),
          React.createElement(
            'span',
            null,
            React.createElement('span', { className: 'ad' }, `+${f.add}`),
            ' ',
            React.createElement('span', { className: 'dl' }, `−${f.del}`),
          ),
        ),
        opened && f.hunks.length
          ? React.createElement(
              'div',
              { className: 'tl' },
              f.hunks.map((hx, i) => React.createElement('pre', { className: 'px', key: i }, hunkText(hx))),
            )
          : null,
      )
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
    { className: 'ta dshgit-card', 'data-dsh-git': 'recent-turns' },
    React.createElement('div', { className: 'tm' },
      React.createElement('span', { className: 'dshgit-tag' }, 'dsh-git'),
      ' 最近修改回合'),
    withFiles.slice().reverse().map((t) =>
      React.createElement('div', { key: t.turn },
        React.createElement('div', { className: 'td', onClick: () => setOpen((o) => ({ ...o, [t.turn]: !o[t.turn] })) },
          React.createElement('span', null, `turn ${t.turn} · ${t.files.length} 文件`),
          React.createElement('span', null,
            React.createElement('span', { className: 'ad' }, `+${t.files.reduce((a, f) => a + f.add, 0)}`),
            ' ',
            React.createElement('span', { className: 'dl' }, `−${t.files.reduce((a, f) => a + f.del, 0)}`))),
        open[t.turn]
          ? t.files.map((f) => React.createElement('div', { key: f.path, className: 'tl' },
              React.createElement('div', { className: 'tm' }, f.path),
              f.hunks.map((hx, i) => React.createElement('pre', { className: 'px', key: i }, hunkText(hx)))))
          : null))
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
    React.createElement('div', { className: 'gr' },
      React.createElement('span', null, data ? (data.error ? '—' : data.branch + (data.ahead || data.behind ? ` ↑${data.ahead} ↓${data.behind}` : '')) : '加载中…'),
      React.createElement('button', { className: 'gb', onClick: () => setVer((v) => v + 1) }, '刷新')),
    data && data.error ? React.createElement('div', { className: 'er' }, data.error) : null,
    seg('已暂存', data && data.staged, 's', props.onPick),
    seg('未暂存', data && data.unstaged, 'u', props.onPick),
    seg('未跟踪', data && data.untracked, 't', props.onPick),
    React.createElement('div', { className: 'gr' },
      React.createElement('button', { className: 'gb' + (props.sel.staged ? '' : ' go'), onClick: () => props.onSel({ staged: false, path: props.sel.path }) }, '未暂存 diff'),
      React.createElement('button', { className: 'gb' + (props.sel.staged ? ' go' : ''), onClick: () => props.onSel({ staged: true, path: props.sel.path }) }, '已暂存 diff'),
      React.createElement('span', { className: 'mt' }, props.sel.path || '全部文件')),
    out.loading ? React.createElement('div', { className: 'mt' }, '计算 diff…') : null,
    out.error ? React.createElement('div', { className: 'er' }, out.error) : null,
    out.text ? React.createElement('pre', { className: 'pw' }, out.text) : (out.loading ? null : React.createElement('div', { className: 'mt' }, '无差异')),
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
    React.createElement('div', { className: 'gs' }, '提交'),
    React.createElement('textarea', { className: 'inp', rows: 3, placeholder: 'commit message', value: msg, onChange: (e) => setMsg(e.target.value) }),
    React.createElement('div', { className: 'gr' },
      !arm ? React.createElement('button', { className: 'gb', disabled: !msg.trim(), onClick: () => setArm(true) }, '提交全部变更（add -A）') : null,
      arm ? React.createElement('button', { className: 'gb go', onClick: doCommit }, '确认提交') : null,
      arm ? React.createElement('button', { className: 'gb', onClick: () => setArm(false) }, '取消') : null),
    out ? (out.error ? React.createElement('div', { className: 'er' }, out.error) : React.createElement('div', { className: 'ok' }, '已提交：' + out.output)) : null)
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
    React.createElement('div', { className: 'gs' }, '文件预览'),
    React.createElement('div', { className: 'gr' },
      React.createElement('input', { className: 'inp', placeholder: '相对路径，如 src/index.js', value: path, onChange: (e) => setPath(e.target.value) }),
      React.createElement('button', { className: 'gb', onClick: load }, '读取')),
    out ? (out.error ? React.createElement('div', { className: 'er' }, out.error) : React.createElement('pre', { className: 'pw' }, out.text)) : null)
}

function Panel() {
  const st = useStore()
  const [tab, setTab] = React.useState('变更')
  const [sel, setSel] = React.useState({ staged: false, path: '' })
  if (!st.open) return null
  const pick = (path, mark) => { setSel({ staged: mark === 's', path }); setTab('变更') }
  return React.createElement(
    'div',
    { className: 'gp' },
    React.createElement('div', { className: 'gt' },
      React.createElement('span', null, `Git · dsh-git · ${BUILD_TS}`),
      React.createElement('button', { className: 'gb', onClick: () => setState({ open: false }) }, '关闭'),
    ),
    React.createElement('div', { className: 'gr' },
      ['变更', '提交', '预览'].map((name) =>
        React.createElement('button', { key: name, className: tab === name ? 'gb go' : 'gb', onClick: () => setTab(name) }, name))),
    tab === '变更' ? React.createElement('div', null,
      React.createElement(RecentTurns, null),
      React.createElement(ChangesTab, { sel, onSel: setSel, onPick: pick })) : null,
    tab === '提交' ? React.createElement(CommitTab, null) : null,
    tab === '预览' ? React.createElement(PreviewTab, null) : null,
  )
}

exports.inject = ['slots', 'connection']

exports.apply = function apply(ctx) {
  rootCtx = ctx
  const slots = ctx.get === undefined ? ctx.slots : (ctx.get('slots') ?? ctx.slots)
  rootSlots = slots
  if (slots === undefined) return

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
    const disposeTail = slots.inject('conversation.chat.turnTail', () => {
      try {
        return slots.register({
          name: 'conversation.chat.turnTail',
          select: (owner) => {
            const n = owner && owner.turn && owner.turn.turn
            return (typeof n === 'number') ? { turn: n } : null
          },
        }, TurnTailCard)
      } catch (error) {
        if (typeof console !== 'undefined' && console.error) console.error('[dsh-git] turnTail register failed', error)
        return () => undefined
      }
    })
    return () => {
      disposeHeader()
      disposePanel()
      disposeTail()
      rootCtx = null
      rootSlots = null
      setState({ open: false, sessionId: null })
    }
  }, 'dsh-git client')
}
