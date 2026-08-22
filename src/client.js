'use strict'

const React = require('react')

const CSS = '.gp{position:fixed;top:64px;right:16px;width:480px;max-width:94vw;max-height:calc(100vh - 96px);overflow:auto;background:rgba(255,255,255,0.97);color:#1a1a1a;border:1px solid rgba(0,0,0,0.15);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.25);z-index:2000;padding:14px;font:13px/1.5 system-ui,sans-serif;pointer-events:auto;box-sizing:border-box}.gt{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-weight:600}.gr{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center}.gb{background:rgba(0,0,0,0.07);border:1px solid rgba(0,0,0,0.12);border-radius:8px;padding:3px 9px;cursor:pointer;font-size:12px}.gb:disabled{opacity:0.5;cursor:default}.go{background:rgba(0,0,0,0.16)}.gs{font-weight:600;margin:10px 0 6px;color:#444}.gw{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(0,0,0,0.08);cursor:pointer}.gw:hover{background:rgba(0,0,0,0.04)}.pw{white-space:pre-wrap;word-break:break-all;background:rgba(0,0,0,0.06);border-radius:6px;padding:8px;margin:4px 0;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;max-height:340px;overflow:auto}.er{color:#b3261e;white-space:pre-wrap}.mt{color:#666;font-size:12px}.inp{width:100%;box-sizing:border-box;border:1px solid rgba(0,0,0,0.15);border-radius:8px;padding:6px;font-size:12px;font-family:inherit}.ok{color:#188038;white-space:pre-wrap}'

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

const state = { open: false, sessionId: null }
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

function ChangesTab(props) {
  const [data, setData] = React.useState(null)
  const [ver, setVer] = React.useState(0)
  const [out, setOut] = React.useState({ loading: true, text: '', error: null })

  React.useEffect(() => {
    if (!state.sessionId) return
    let alive = true
    callRemote('dshGit/status', { sessionId: state.sessionId })
      .then((value) => { if (alive) setData(value) })
      .catch((error) => { if (alive) setData({ error: error.message }) })
    return () => { alive = false }
  }, [state.sessionId, ver])

  React.useEffect(() => {
    if (!state.sessionId) return
    let alive = true
    setOut({ loading: true, text: '', error: null })
    const diffArgs = { sessionId: state.sessionId, staged: props.sel.staged }
    if (props.sel.path) diffArgs.path = props.sel.path
    callRemote('dshGit/diff', diffArgs)
      .then((value) => { if (alive) setOut({ loading: false, text: value.diff, error: null }) })
      .catch((error) => { if (alive) setOut({ loading: false, text: '', error: error.message }) })
    return () => { alive = false }
  }, [state.sessionId, props.sel, ver])

  const branch = data
    ? data.branch + (data.ahead || data.behind ? ` ↑${data.ahead} ↓${data.behind}` : '')
    : '加载中…'
  return React.createElement(
    'div',
    null,
    React.createElement('div', { className: 'gr' },
      React.createElement('span', null, data && data.error ? '—' : branch),
      React.createElement('button', { className: 'gb', onClick: () => setVer((value) => value + 1) }, '刷新'),
    ),
    data && data.error ? React.createElement('div', { className: 'er' }, data.error) : null,
    seg('已暂存', data && data.staged, 's', props.onPick),
    seg('未暂存', data && data.unstaged, 'u', props.onPick),
    seg('未跟踪', data && data.untracked, 't', props.onPick),
    React.createElement('div', { className: 'gr' },
      React.createElement('button', {
        className: 'gb' + (props.sel.staged ? '' : ' go'),
        onClick: () => props.onSel({ staged: false, path: props.sel.path }),
      }, '未暂存 diff'),
      React.createElement('button', {
        className: 'gb' + (props.sel.staged ? ' go' : ''),
        onClick: () => props.onSel({ staged: true, path: props.sel.path }),
      }, '已暂存 diff'),
      React.createElement('span', { className: 'mt' }, props.sel.path || '全部文件'),
    ),
    out.loading ? React.createElement('div', { className: 'mt' }, '计算 diff…') : null,
    out.error ? React.createElement('div', { className: 'er' }, out.error) : null,
    out.text ? React.createElement('div', { className: 'pw' }, out.text)
      : (out.loading ? null : React.createElement('div', { className: 'mt' }, '无差异')),
  )
}

function CommitTab() {
  const [msg, setMsg] = React.useState('')
  const [arm, setArm] = React.useState(false)
  const [out, setOut] = React.useState(null)

  const doCommit = async () => {
    if (!state.sessionId || !msg.trim()) return
    try {
      const value = await callRemote('dshGit/commit', { sessionId: state.sessionId, message: msg })
      setOut({ error: null, output: value.output })
    } catch (error) {
      setOut({ error: error.message, output: null })
    }
    setArm(false)
  }

  return React.createElement(
    'div',
    null,
    React.createElement('div', { className: 'gs' }, '提交'),
    React.createElement('textarea', {
      className: 'inp',
      rows: 3,
      placeholder: 'commit message',
      value: msg,
      onChange: (event) => setMsg(event.target.value),
    }),
    React.createElement('div', { className: 'gr' },
      !arm
        ? React.createElement('button', {
            className: 'gb',
            disabled: !msg.trim(),
            onClick: () => setArm(true),
          }, '提交全部变更（add -A）')
        : null,
      arm ? React.createElement('button', { className: 'gb go', onClick: doCommit }, '确认提交') : null,
      arm ? React.createElement('button', { className: 'gb', onClick: () => setArm(false) }, '取消') : null,
    ),
    out && out.error ? React.createElement('div', { className: 'er' }, out.error) : null,
    out && out.output ? React.createElement('div', { className: 'ok' }, `已提交：${out.output}`) : null,
  )
}

function PreviewTab() {
  const [path, setPath] = React.useState('')
  const [out, setOut] = React.useState({ error: null, text: null })

  const load = async () => {
    if (!path) return
    try {
      const value = await callRemote('dshGit/readFile', { sessionId: state.sessionId, path })
      setOut({ error: null, text: value.text })
    } catch (error) {
      setOut({ error: error.message, text: null })
    }
  }

  return React.createElement(
    'div',
    null,
    React.createElement('div', { className: 'gs' }, '文件预览'),
    React.createElement('div', { className: 'gr' },
      React.createElement('input', {
        className: 'inp',
        placeholder: '相对路径，如 p0/host.js',
        value: path,
        onChange: (event) => setPath(event.target.value),
      }),
      React.createElement('button', { className: 'gb', onClick: load }, '读取'),
    ),
    out.error ? React.createElement('div', { className: 'er' }, out.error) : null,
    out.text ? React.createElement('div', { className: 'pw' }, out.text) : null,
  )
}

function Panel() {
  const st = useStore()
  const [tab, setTab] = React.useState('变更')
  const [sel, setSel] = React.useState({ staged: false, path: '' })
  if (!st.open) return null

  const pick = (path, mark) => {
    setSel({ staged: mark === 's', path })
    setTab('变更')
  }

  return React.createElement(
    'div',
    { className: 'gp' },
    React.createElement('div', { className: 'gt' },
      React.createElement('span', null, 'Git · dsh-git'),
      React.createElement('button', { className: 'gb', onClick: () => setState({ open: false }) }, '关闭'),
    ),
    React.createElement('div', { className: 'gr' },
      ['变更', '提交', '预览'].map((name) =>
        React.createElement('button', {
          key: name,
          className: tab === name ? 'gb go' : 'gb',
          onClick: () => setTab(name),
        }, name)),
    ),
    tab === '变更' ? React.createElement(ChangesTab, { sel, onSel: setSel, onPick: pick }) : null,
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
    return () => {
      disposeHeader()
      disposePanel()
      rootCtx = null
      rootSlots = null
      setState({ open: false, sessionId: null })
    }
  }, 'dsh-git client')
}
