/**
 * dsh-git panel views: shared UI store, the Remote face, and the two Slot
 * components (header button + overlay panel with 变更/提交/预览 tabs).
 * @module dsh-git-client/client/PanelView
 */

import { useCallback, useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { GitRemote } from './remote.ts'
import { call } from './remote.ts'
import css from './Panel.module.css'

export type { GitRemote } from './remote.ts'

/** Session-scoped selection inside the panel. */
interface DiffSel {
  staged: boolean
  path: string
}

interface GitUiState {
  open: boolean
  sessionId: string | null
  remote: GitRemote | null
  listeners: Set<() => void>
}

const store: GitUiState = { open: false, sessionId: null, remote: null, listeners: new Set() }

function emit(): void {
  for (const fn of store.listeners) fn()
}

/** Set the Remote face once the Client context is ready (apply time). */
export function setGitRemote(remote: GitRemote | null): void {
  store.remote = remote
  emit()
}

function subscribe(fn: () => void): () => void {
  store.listeners.add(fn)
  return () => store.listeners.delete(fn)
}

function useStore(): GitUiState {
  const [, force] = useState(0)
  useEffect(() => subscribe(() => force((v) => v + 1)), [])
  return store
}

/** One Remote call unwrapped: reject on the `ok: false` branch. */
async function useRemote(): Promise<GitRemote> {
  if (store.remote === null) throw new Error('dsh-git remote not ready')
  return store.remote
}

type StatusTab = { branch: string; ahead: number; behind: number; staged: readonly string[]; unstaged: readonly string[]; untracked: readonly string[]; cwd: string }

function StatusBlock(props: { data: StatusTab | null; error: string | null; onPick: (p: string, g: 's' | 'u' | 't') => void }): JSX.Element {
  const { data, error, onPick } = props
  const seg = (title: string, items: readonly string[] | undefined, mark: 's' | 'u' | 't') => {
    if (!items || items.length === 0) return null
    return (
      <div>
        <div className={css.sec}>{title} ({items.length})</div>
        {items.map((p) => (
          <div key={p} className={css.row} onClick={() => onPick(p, mark)}>
            <span>{p}</span>
          </div>
        ))}
      </div>
    )
  }
  const branchLine = data
    ? data.branch + (data.ahead || data.behind ? ` ↑${data.ahead} ↓${data.behind}` : '')
    : '加载中…'
  return (
    <div>
      <div className={css.row}>
        <span>{error ? '—' : branchLine}</span>
      </div>
      {error && <div className={css.err}>{error}</div>}
      {seg('已暂存', data?.staged, 's')}
      {seg('未暂存', data?.unstaged, 'u')}
      {seg('未跟踪', data?.untracked, 't')}
    </div>
  )
}

function DiffBlock(props: { sel: DiffSel; onSel: (s: DiffSel) => void }): JSX.Element {
  const [out, setOut] = useState<{ loading: boolean; text: string; error: string | null }>({ loading: true, text: '', error: null })
  const { sel, onSel } = props
  useEffect(() => {
    let alive = true
    setOut({ loading: true, text: '', error: null })
    useRemote()
      .then((remote) => {
        const args: Parameters<GitRemote['diff']>[0] = { sessionId: (store.sessionId ?? '') as SessionId, staged: sel.staged }
        if (sel.path) args.path = sel.path
        return remote.diff(args)
      })
      .then(call)
      .then((r) => { if (alive) setOut({ loading: false, text: r.diff, error: null }) })
      .catch((e: unknown) => { if (alive) setOut({ loading: false, text: '', error: String((e as Error)?.message ?? e) }) })
    return () => { alive = false }
  }, [store.sessionId, sel.staged, sel.path])
  return (
    <div>
      <div className={css.bar}>
        <button className={sel.staged ? css.btn : css.btnOn} onClick={() => onSel({ staged: false, path: sel.path })}>未暂存 diff</button>
        <button className={sel.staged ? css.btnOn : css.btn} onClick={() => onSel({ staged: true, path: sel.path })}>已暂存 diff</button>
        <span className={css.meta}>{sel.path || '全部文件'}</span>
      </div>
      {out.loading && <div className={css.meta}>计算 diff…</div>}
      {out.error && <div className={css.err}>{out.error}</div>}
      {out.text ? <pre className={css.pre}>{out.text}</pre> : out.loading ? null : <div className={css.meta}>无差异</div>}
    </div>
  )
}

function CommitBlock(): JSX.Element {
  const [msg, setMsg] = useState('')
  const [arm, setArm] = useState(false)
  const [out, setOut] = useState<{ error: string | null; output: string | null }>({ error: null, output: null })
  const doCommit = useCallback(() => {
    void useRemote()
      .then((remote) => remote.commit({ sessionId: (store.sessionId ?? '') as SessionId, message: msg }))
      .then(call)
      .then((r) => { setOut({ error: null, output: r.output }) })
      .catch((e: unknown) => { setOut({ error: String((e as Error)?.message ?? e), output: null }) })
    setArm(false)
  }, [msg])
  return (
    <div>
      <div className={css.sec}>提交</div>
      <textarea className={css.input} rows={3} placeholder="commit message" value={msg} onChange={(e) => setMsg(e.target.value)} />
      <div className={css.bar}>
        {!arm && <button className={css.btn} disabled={!msg.trim()} onClick={() => setArm(true)}>提交全部变更（add -A）</button>}
        {arm && <button className={css.btnOn} onClick={doCommit}>确认提交</button>}
        {arm && <button className={css.btn} onClick={() => setArm(false)}>取消</button>}
      </div>
      {out.error && <div className={css.err}>{out.error}</div>}
      {out.output && <div className={css.ok}>已提交：{out.output}</div>}
    </div>
  )
}

function PreviewBlock(): JSX.Element {
  const [path, setPath] = useState('')
  const [out, setOut] = useState<{ error: string | null; text: string | null }>({ error: null, text: null })
  const load = useCallback(() => {
    if (!path) return
    void useRemote()
      .then((remote) => remote.readFile({ sessionId: (store.sessionId ?? '') as SessionId, path }))
      .then(call)
      .then((r) => { setOut({ error: null, text: r.text }) })
      .catch((e: unknown) => { setOut({ error: String((e as Error)?.message ?? e), text: null }) })
  }, [path])
  return (
    <div>
      <div className={css.sec}>文件预览</div>
      <div className={css.bar}>
        <input className={css.input} placeholder="相对路径，如 p0/host.js" value={path} onChange={(e) => setPath(e.target.value)} />
        <button className={css.btn} onClick={load}>读取</button>
      </div>
      {out.error && <div className={css.err}>{out.error}</div>}
      {out.text && <pre className={css.pre}>{out.text}</pre>}
    </div>
  )
}

type Tab = '变更' | '提交' | '预览'

/** Session-header entry: toggles the overlay panel. */
export function HeaderButtonView(props: { sessionId: string }): JSX.Element {
  const st = useStore()
  return (
    <button
      className={css.btn}
      title="Git 状态与操作"
      onClick={() => {
        store.sessionId = st.sessionId ?? props.sessionId
        store.open = !st.open
        emit()
      }}
    >
      {st.open ? 'Git ✓' : 'Git'}
    </button>
  )
}

/** Overlay panel: 变更 / 提交 / 预览. */
export function PanelView(): JSX.Element | null {
  const st = useStore()
  const [tab, setTab] = useState<Tab>('变更')
  const [sel, setSel] = useState<DiffSel>({ staged: false, path: '' })
  const [status, setStatus] = useState<{ data: StatusTab | null; error: string | null; ver: number }>({ data: null, error: null, ver: 0 })
  if (!st.open) return null
  useEffect(() => {
    let alive = true
    void useRemote()
      .then((remote) => remote.status({ sessionId: (store.sessionId ?? '') as SessionId }))
      .then(call)
      .then((r) => { if (alive) setStatus({ data: r, error: null, ver: status.ver }) })
      .catch((e: unknown) => { if (alive) setStatus({ data: null, error: String((e as Error)?.message ?? e), ver: status.ver }) })
    return () => { alive = false }
  }, [st.sessionId, status.ver])
  const pick = (p: string, g: 's' | 'u' | 't'): void => { setSel({ staged: g === 's', path: p }); setTab('变更') }
  return (
    <div className={css.panel}>
      <div className={css.head}>
        <span>Git · dsh-git</span>
        <button className={css.btn} onClick={() => { store.open = false; emit() }}>关闭</button>
      </div>
      <div className={css.bar}>
        {(['变更', '提交', '预览'] as const).map((t) => (
          <button key={t} className={tab === t ? css.btnOn : css.btn} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className={css.bar}>
        <button className={css.btn} onClick={() => setStatus((s) => ({ ...s, ver: s.ver + 1 }))}>刷新</button>
      </div>
      {tab === '变更' && (
        <>
          <StatusBlock data={status.data} error={status.error} onPick={pick} />
          <DiffBlock sel={sel} onSel={setSel} />
        </>
      )}
      {tab === '提交' && <CommitBlock />}
      {tab === '预览' && <PreviewBlock />}
    </div>
  )
}
