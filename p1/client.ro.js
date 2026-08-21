return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return
    ctx.effect(() => styles.insert('.gp{position:fixed;top:64px;right:16px;width:470px;max-width:94vw;max-height:calc(100vh - 96px);overflow:auto;background:rgba(255,255,255,0.97);color:#1a1a1a;border:1px solid rgba(0,0,0,0.15);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.25);z-index:2000;padding:14px;font:13px/1.5 system-ui,sans-serif;pointer-events:auto;box-sizing:border-box}.gt{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-weight:600}.gr{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center}.gb{background:rgba(0,0,0,0.07);border:1px solid rgba(0,0,0,0.12);border-radius:8px;padding:3px 9px;cursor:pointer;font-size:12px}.go{background:rgba(0,0,0,0.16)}.gs{font-weight:600;margin:10px 0 6px;color:#444}.gw{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(0,0,0,0.08);cursor:pointer}.gw:hover{background:rgba(0,0,0,0.04)}.gp2{background:rgba(0,0,0,0.06);border-radius:6px;padding:8px;white-space:pre-wrap;word-break:break-all;margin:4px 0;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;max-height:340px;overflow:auto}.ge{color:#b3261e;white-space:pre-wrap}.gm{color:#666;font-size:12px}'))

    const state = { open: false, sessionId: null }
    const listeners = new Set()
    function emit() { for (const fn of listeners) fn() }
    function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }
    function setState(p) { Object.assign(state, p); emit() }
    function useStore() {
      const [, force] = React.useState(0)
      React.useEffect(() => subscribe(() => force((x) => x + 1)), [])
      return state
    }

    function HeaderButton(props) {
      const st = useStore()
      return React.createElement('button', { className: 'gb', onClick: () => setState({ open: !st.open, sessionId: st.sessionId || props.sessionId }), title: 'Git 状态与 diff' }, st.open ? 'Git ✓' : 'Git')
    }

    function Panel() {
      const st = useStore()
      const [sel, setSel] = React.useState({ staged: false, path: '' })
      if (!st.open) return null
      const pick = (p, g) => setSel({ staged: g === 's', path: p })
      return React.createElement('div', { className: 'gp' },
        React.createElement('div', { className: 'gt' },
          React.createElement('span', null, 'Git · dsh-git'),
          React.createElement('button', { className: 'gb', onClick: () => setState({ open: false }) }, '关闭')),
        React.createElement(ChangesTab, { sel: sel, onSel: setSel, onPick: pick }))
    }

    function ChangesTab(props) {
      const [data, setData] = React.useState(null)
      const [ver, setVer] = React.useState(0)
      const [out, setOut] = React.useState({ loading: true, text: '', error: null })
      React.useEffect(() => {
        if (!state.sessionId) return
        let alive = true
        host.call('p0.status', { sessionId: state.sessionId }).then((r) => { if (alive) setData(r) }).catch((e) => { if (alive) setData({ error: String((e && e.message) || e) }) })
        return () => { alive = false }
      }, [state.sessionId, ver])
      React.useEffect(() => {
        if (!state.sessionId) return
        let alive = true
        setOut({ loading: true, text: '', error: null })
        const diffArgs = { sessionId: state.sessionId, staged: props.sel.staged }
        if (props.sel.path) diffArgs.path = props.sel.path
        host.call('p0.diff', diffArgs).then((r) => {
          if (alive) setOut(r.error ? { loading: false, text: '', error: r.error } : { loading: false, text: r.diff, error: null })
        }).catch((e) => { if (alive) setOut({ loading: false, text: '', error: String((e && e.message) || e) }) })
        return () => { alive = false }
      }, [state.sessionId, props.sel, ver])
      return React.createElement('div', null,
        React.createElement('div', { className: 'gr' },
          React.createElement('span', null, data ? (data.error ? '—' : data.branch + (data.ahead || data.behind ? ' ↑' + data.ahead + ' ↓' + data.behind : '')) : '加载中…'),
          React.createElement('button', { className: 'gb', onClick: () => setVer((v) => v + 1) }, '刷新')),
        data && data.error ? React.createElement('div', { className: 'ge' }, data.error) : null,
        seg('已暂存', data && data.staged, 's', props.onPick),
        seg('未暂存', data && data.unstaged, 'u', props.onPick),
        seg('未跟踪', data && data.untracked, 't', props.onPick),
        React.createElement('div', { className: 'gr' },
          React.createElement('button', { className: 'gb' + (props.sel.staged ? '' : ' go'), onClick: () => props.onSel({ staged: false, path: props.sel.path }) }, '未暂存 diff'),
          React.createElement('button', { className: 'gb' + (props.sel.staged ? ' go' : ''), onClick: () => props.onSel({ staged: true, path: props.sel.path }) }, '已暂存 diff'),
          React.createElement('span', { className: 'gm' }, props.sel.path || '全部文件')),
        out.loading ? React.createElement('div', { className: 'gm' }, '计算 diff…') : null,
        out.error ? React.createElement('div', { className: 'ge' }, out.error) : null,
        out.text ? React.createElement('div', { className: 'gp2' }, out.text) : (out.loading ? null : React.createElement('div', { className: 'gm' }, '无差异')))
    }

    function seg(title, items, mark, onPick) {
      if (!items || items.length === 0) return null
      return React.createElement('div', null,
        React.createElement('div', { className: 'gs' }, title + ' (' + items.length + ')'),
        items.map((p) => React.createElement('div', { className: 'gw', key: p, onClick: () => onPick(p, mark) }, React.createElement('span', null, p))))
    }

    slots.inject('conversation.session.header.actions', () => slots.register(
      { name: 'conversation.session.header.actions', id: 'dsh-git-toggle', order: 30, label: 'Git' },
      (props) => React.createElement(HeaderButton, props)))
    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'dsh-git-panel', order: 100 },
      () => React.createElement(Panel, null)))
  },
}