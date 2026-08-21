return {
apply(ctx) {
const slots = ctx.get('slots')
if (slots === undefined) return
ctx.effect(() => styles.insert('.dsh-git-panel{position:fixed;top:64px;right:16px;width:440px;max-width:92vw;max-height:calc(100vh - 96px);overflow:auto;background:rgba(255,255,255,0.96);color:#1a1a1a;border:1px solid rgba(0,0,0,0.15);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.25);z-index:2000;padding:14px;font:13px/1.5 system-ui,sans-serif;pointer-events:auto;box-sizing:border-box}.dsh-git-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-weight:600}.dsh-git-sec{font-weight:600;margin:10px 0 6px;color:#444}.dsh-git-row{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.08)}.dsh-git-pre{background:rgba(0,0,0,0.06);border-radius:6px;padding:8px;white-space:pre-wrap;word-break:break-all;margin:4px 0;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}.dsh-git-btn{background:rgba(0,0,0,0.07);border:1px solid rgba(0,0,0,0.12);border-radius:8px;padding:4px 10px;cursor:pointer;font-size:12px}.dsh-git-err{color:#b3261e;white-space:pre-wrap}.dsh-git-meta{color:#666;font-size:12px}'))
const state = { open: false, sessionId: null }
const listeners = new Set()
function emit() { for (const fn of listeners) fn() }
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }
function setState(patch) { Object.assign(state, patch); emit() }
function useStore() {
const [, force] = React.useState(0)
React.useEffect(() => subscribe(() => force((x) => x + 1)), [])
return state
}
function HeaderButton(props) {
const st = useStore()
return React.createElement('button', {
className: 'dsh-git-btn',
onClick: () => setState({ open: !st.open, sessionId: st.sessionId || props.sessionId }),
title: 'Git 状态与修改记录',
}, st.open ? 'Git ✓' : 'Git')
}
function Panel() {
const st = useStore()
if (!st.open) return null
return React.createElement('div', { className: 'dsh-git-panel' },
React.createElement('div', { className: 'dsh-git-head' },
React.createElement('span', null, 'Git · dsh-git'),
React.createElement('button', { className: 'dsh-git-btn', onClick: () => setState({ open: false }) }, '关闭')),
React.createElement(StatusView, null),
React.createElement(ModView, null))
}
function StatusView() {
const [data, setData] = React.useState(null)
const load = React.useCallback(async () => {
if (!state.sessionId) return
try { setData(await host.call('p0.status', { sessionId: state.sessionId })) } catch (e) { setData({ error: String((e && e.message) || e) }) }
}, [])
React.useEffect(() => { load() }, [state.sessionId])
if (!data) return React.createElement('div', { className: 'dsh-git-meta' }, '加载状态中…')
if (data.error) return React.createElement('div', { className: 'dsh-git-err' }, 'git: ' + data.error)
return React.createElement('div', null,
React.createElement('div', { className: 'dsh-git-sec' }, 'git status'),
React.createElement('div', { className: 'dsh-git-pre' }, data.raw))
}
function ModView() {
const [mods, setMods] = React.useState(null)
const load = React.useCallback(async () => {
if (!state.sessionId) return
try { setMods(await host.call('p0.modifications', { sessionId: state.sessionId })) } catch (e) { setMods({ error: String((e && e.message) || e) }) }
}, [])
React.useEffect(() => { load() }, [state.sessionId])
if (!mods) return React.createElement('div', { className: 'dsh-git-meta' }, '加载修改记录…')
if (mods.error) return React.createElement('div', { className: 'dsh-git-err' }, 'mods: ' + mods.error)
if (!mods.modifications.length) return React.createElement('div', { className: 'dsh-git-meta' }, '本会话暂无 write/edit 记录')
return React.createElement('div', null,
React.createElement('div', { className: 'dsh-git-sec' }, '会话修改记录 (' + mods.count + ')'),
mods.modifications.slice().reverse().map((m, i) =>
React.createElement('div', { className: 'dsh-git-row', key: i },
React.createElement('span', null, 'turn ' + m.turn + ' · ' + m.name + ' · ' + (m.path || '?') + ' · ' + m.diffs.length + ' hunk'))))
}
slots.inject('conversation.session.header.actions', () => slots.register(
{ name: 'conversation.session.header.actions', id: 'dsh-git-toggle', order: 30, label: 'Git' },
(props) => React.createElement(HeaderButton, props)))
slots.inject('shell.overlay', () => slots.register(
{ name: 'shell.overlay', id: 'dsh-git-panel', order: 100 },
() => React.createElement(Panel, null)))
},
}