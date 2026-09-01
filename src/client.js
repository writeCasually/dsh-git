'use strict'

const BUILD_TS = '09-01 10:00:00'

const React = require('react')

const CSS = [
  /* ── Git Panel — Redesigned UI ────────────────────────────────── */
  '.dg-panel{position:fixed;top:56px;right:12px;width:580px;max-width:94vw;max-height:calc(100vh - 80px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#1a1a1a);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.08);z-index:2000;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;pointer-events:auto;box-sizing:border-box;overflow:hidden}',
  /* ── Header ── */
  '.dg-panel-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08));flex-shrink:0}',
  '.dg-panel-title{font-weight:700;font-size:14px;color:var(--dsw-alias-label-primary);letter-spacing:-.01em}',
  '.dg-panel-build{font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:10px;color:var(--dsw-alias-label-caption,#999);margin-left:8px;font-weight:400}',
  /* ── Body (scrollable) ── */
  '.dg-panel-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:12px 16px 16px}',
  /* ── Tabs ── */
  '.dg-tabs{display:flex;gap:2px;padding:0 16px 0;background:var(--dsw-alias-bg-base,transparent);border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06));flex-shrink:0}',
  '.dg-tab{padding:8px 14px;font-size:12px;font-weight:500;color:var(--dsw-alias-label-tertiary,#888);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;transition:color .15s,border-color .15s}',
  '.dg-tab:hover{color:var(--dsw-alias-label-secondary,#555)}',
  '.dg-tab-active{color:var(--dsw-alias-state-business-primary,#3b82f6);border-bottom-color:var(--dsw-alias-state-business-primary,#3b82f6)}',
  /* ── Buttons ── */
  '.dg-btn-row{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center}',
  '.dg-btn{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.05));border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;color:var(--dsw-alias-label-secondary,#444);transition:background .12s,color .12s;font-weight:500}',
  '.dg-btn:hover{background:var(--dsw-alias-interactive-bg-hover-solid,rgba(0,0,0,.08));color:var(--dsw-alias-label-primary)}',
  '.dg-btn:disabled{opacity:.45;cursor:default;pointer-events:none}',
  '.dg-btn-active{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b82f6) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b82f6) 30%,transparent);color:var(--dsw-alias-state-business-primary,#3b82f6)}',
  '.dg-btn-sm{padding:2px 8px;font-size:11px;border-radius:5px}',
  '.dg-btn-ghost{background:none;border-color:transparent;padding:4px 8px}',
  '.dg-btn-ghost:hover{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.05))}',
  /* ── Section titles ── */
  '.dg-sec-title{font-weight:600;margin:14px 0 6px;color:var(--dsw-alias-label-secondary,#444);font-size:11px;text-transform:uppercase;letter-spacing:.04em}',
  '.dg-sec-title:first-child{margin-top:0}',
  /* ── Branch info bar ── */
  '.dg-branch-bar{display:flex;align-items:center;gap:8px;padding:8px 0;margin-bottom:8px}',
  '.dg-branch-name{font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.04));padding:2px 8px;border-radius:4px}',
  '.dg-branch-stat{font-size:11px;color:var(--dsw-alias-label-caption,#888)}',
  '.dg-branch-stat .dg-add{color:var(--dsw-alias-state-success-primary,#188038)}',
  '.dg-branch-stat .dg-del{color:var(--dsw-alias-state-error-primary,#b3261e)}',
  /* ── File list ── */
  '.dg-file-list{margin:0;padding:0;list-style:none}',
  '.dg-file-group-title{font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary,#888);text-transform:uppercase;letter-spacing:.04em;padding:10px 0 4px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06))}',
  '.dg-file-item{display:flex;align-items:center;gap:8px;padding:5px 6px;cursor:pointer;border-radius:6px;transition:background .1s;margin:1px 0}',
  '.dg-file-item:hover{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.04))}',
  '.dg-file-item-selected{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b82f6) 8%,transparent)}',
  '.dg-file-badge{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;font-size:10px;font-weight:700;flex-shrink:0;font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace)}',
  '.dg-file-badge-m{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b82f6) 14%,transparent);color:var(--dsw-alias-state-business-primary,#3b82f6)}',
  '.dg-file-badge-a{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#188038) 14%,transparent);color:var(--dsw-alias-state-success-primary,#188038)}',
  '.dg-file-badge-d{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#b3261e) 14%,transparent);color:var(--dsw-alias-state-error-primary,#b3261e)}',
  '.dg-file-badge-u{background:color-mix(in srgb,#f59e0b 14%,transparent);color:#d97706}',
  '.dg-file-name{font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;color:var(--dsw-alias-label-secondary,#444);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}',
  '.dg-file-stat{font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:11px;color:var(--dsw-alias-label-caption,#888);flex-shrink:0;white-space:nowrap}',
  '.dg-file-stat .dg-add{color:var(--dsw-alias-state-success-primary,#188038);font-weight:600}',
  '.dg-file-stat .dg-del{color:var(--dsw-alias-state-error-primary,#b3261e);font-weight:600}',
  /* ── Diff viewer (unified, with line numbers) ── */
  '.dg-diff-viewer{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:8px;overflow:hidden;margin:8px 0;background:var(--dsw-alias-bg-base,#fff)}',
  '.dg-diff-file-header{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.03));border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06));font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.dg-diff-file-header .dg-file-badge{font-size:9px;width:16px;height:16px}',
  '.dg-diff-scroll{overflow:auto;max-height:400px}',
  '.dg-diff-table{width:100%;border-collapse:collapse;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;line-height:20px;table-layout:fixed}',
  '.dg-diff-table td{padding:0;vertical-align:top;white-space:pre;overflow:hidden;text-overflow:ellipsis}',
  /* Line number gutter */
  '.dg-dln{width:42px;min-width:42px;text-align:right;padding:0 6px 0 0 !important;color:var(--dsw-alias-label-caption,#aaa);user-select:none;border-right:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06));font-size:11px}',
  /* Diff line content */
  '.dg-dlc{padding:0 8px 0 8px !important}',
  /* Line type markers */
  '.dg-diff-add .dg-dln{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#188038) 8%,transparent);color:color-mix(in srgb,var(--dsw-alias-state-success-primary,#188038) 50%,var(--dsw-alias-label-caption,#aaa))}',
  '.dg-diff-add .dg-dlc{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#188038) 6%,transparent);color:var(--dsw-alias-state-success-primary,#188038)}',
  '.dg-diff-del .dg-dln{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#b3261e) 8%,transparent);color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#b3261e) 50%,var(--dsw-alias-label-caption,#aaa))}',
  '.dg-diff-del .dg-dlc{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#b3261e) 6%,transparent);color:var(--dsw-alias-state-error-primary,#b3261e)}',
  '.dg-diff-ctx .dg-dln{color:var(--dsw-alias-label-caption,#bbb)}',
  '.dg-diff-ctx .dg-dlc{color:var(--dsw-alias-label-tertiary,#666)}',
  /* Hunk header */
  '.dg-diff-hunk{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b82f6) 6%,transparent)}',
  '.dg-diff-hunk td{color:var(--dsw-alias-state-business-primary,#3b82f6);font-weight:500;padding:3px 8px !important;font-size:11px}',
  /* Diff footer */
  '.dg-diff-footer{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-top:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06));font-size:11px;color:var(--dsw-alias-label-caption,#999);background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.02))}',
  /* ── Turn summary card (turnTail chain) ── */
  '.dg-turn{position:relative;margin:8px 0;padding:10px 12px 10px 14px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08));border-radius:10px;background:var(--dsw-alias-bg-base,transparent)}',
  '.dg-turn::before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:2px;border-radius:1px;background:var(--dsw-alias-state-business-primary,#8ab4f8)}',
  '.dg-turn-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}',
  '.dg-turn-tag{display:inline-block;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#8ab4f8) 14%,transparent);color:var(--dsw-alias-state-business-primary,#3b6fd4);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700;line-height:16px;text-transform:uppercase;letter-spacing:.03em}',
  '.dg-turn-title{color:var(--dsw-alias-label-secondary,#444);font-size:12px;font-weight:500}',
  '.dg-turn-stat{margin-left:auto;font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;color:var(--dsw-alias-label-caption,#888);white-space:nowrap}',
  '.dg-turn-stat .dg-add{color:var(--dsw-alias-state-success-primary,#188038)}',
  '.dg-turn-stat .dg-del{color:var(--dsw-alias-state-error-primary,#b3261e)}',
  /* ── Expandable file in turn summary ── */
  '.dg-file-toggle{display:flex;align-items:center;gap:6px;padding:4px 6px;cursor:pointer;border-radius:5px;transition:background .1s;margin:1px 0}',
  '.dg-file-toggle:hover{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.04))}',
  '.dg-file-chev{color:var(--dsw-alias-label-caption,#aaa);font-size:10px;flex-shrink:0;transition:transform .15s ease;width:12px;text-align:center}',
  '.dg-file-open .dg-file-chev{transform:rotate(90deg)}',
  /* ── Status rows (staged/unstaged/untracked lists) ── */
  '.dg-status-row{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:5px;cursor:pointer;transition:background .1s;margin:1px 0}',
  '.dg-status-row:hover{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.04))}',
  '.dg-status-path{font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;color:var(--dsw-alias-label-secondary,#444)}',
  /* ── Inputs ── */
  '.dg-input{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:6px;padding:6px 8px;font-size:12px;font-family:inherit;background:var(--dsw-alias-bg-base,transparent);color:var(--dsw-alias-label-primary);transition:border-color .15s}',
  '.dg-input:focus{outline:none;border-color:var(--dsw-alias-state-business-primary,#3b82f6);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b82f6) 12%,transparent)}',
  '.dg-textarea{resize:vertical;min-height:60px}',
  /* ── Utility ── */
  '.dg-err{color:var(--dsw-alias-state-error-primary,#b3261e);white-space:pre-wrap;font-size:12px;padding:6px 8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#b3261e) 6%,transparent);border-radius:6px;margin:4px 0}',
  '.dg-ok{color:var(--dsw-alias-state-success-primary,#188038);white-space:pre-wrap;font-size:12px;padding:6px 8px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#188038) 6%,transparent);border-radius:6px;margin:4px 0}',
  '.dg-muted{color:var(--dsw-alias-label-tertiary,#888);font-size:12px}',
  '.dg-empty{text-align:center;padding:24px 16px;color:var(--dsw-alias-label-caption,#aaa);font-size:12px}',
  '.dg-empty-icon{font-size:28px;margin-bottom:8px;opacity:.4}',
  /* ── Confirm dialog ── */
  '.dg-confirm{margin:8px 0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:8px;background:var(--dsw-alias-bg-base,#fff)}',
  '.dg-confirm-msg{font-size:12px;color:var(--dsw-alias-label-secondary,#444);margin-bottom:8px;line-height:1.5}',
  /* ── Loading spinner ── */
  '.dg-loading{display:flex;align-items:center;justify-content:center;padding:20px;color:var(--dsw-alias-label-caption,#aaa);font-size:12px;gap:8px}',
  '.dg-spinner{width:14px;height:14px;border:2px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));border-top-color:var(--dsw-alias-state-business-primary,#3b82f6);border-radius:50%;animation:dg-spin .6s linear infinite}',
  '@keyframes dg-spin{to{transform:rotate(360deg)}}',
  /* ── Scrollbar styling ── */
  '.dg-panel-body::-webkit-scrollbar,.dg-diff-scroll::-webkit-scrollbar{width:6px;height:6px}',
  '.dg-panel-body::-webkit-scrollbar-track,.dg-diff-scroll::-webkit-scrollbar-track{background:transparent}',
  '.dg-panel-body::-webkit-scrollbar-thumb,.dg-diff-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:3px}',
  '.dg-panel-body::-webkit-scrollbar-thumb:hover,.dg-diff-scroll::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-border-l1,rgba(0,0,0,.2))}',
].join('\n')

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

const state = { open: false, sessionId: null, tailSeen: {} }
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

/* ── Unified Diff Parser ─────────────────────────────────────────── */

/**
 * Parse raw unified diff text into structured file entries.
 * Returns: [{ path, status, hunks: [{ header, oldStart, newStart, lines: [{ kind, oldNum, newNum, text }] }] }]
 */
function parseUnifiedDiff(diffText) {
  if (!diffText || typeof diffText !== 'string') return []
  const lines = diffText.split('\n')
  const files = []
  let currentFile = null
  let currentHunk = null
  let oldLine = 0
  let newLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // File header: diff --git a/path b/path
    if (line.startsWith('diff --git ')) {
      if (currentFile) files.push(currentFile)
      const match = line.match(/^diff --git a\/(.+) b\/(.+)$/)
      const path = match ? match[2] : line.slice(11)
      currentFile = { path, status: 'M', hunks: [] }
      currentHunk = null
      continue
    }

    // New file
    if (line.startsWith('new file mode')) {
      if (currentFile) currentFile.status = 'A'
      continue
    }

    // Deleted file
    if (line.startsWith('deleted file mode')) {
      if (currentFile) currentFile.status = 'D'
      continue
    }

    // Rename
    if (line.startsWith('rename from ')) {
      if (currentFile) currentFile.status = 'R'
      continue
    }

    // Skip index/--- /+++ lines
    if (line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) continue

    // Hunk header: @@ -old,count +new,count @@ optional context
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/)
    if (hunkMatch) {
      if (!currentFile) {
        currentFile = { path: '(unknown)', status: 'M', hunks: [] }
      }
      oldLine = parseInt(hunkMatch[1], 10)
      newLine = parseInt(hunkMatch[3], 10)
      currentHunk = {
        header: line,
        context: (hunkMatch[5] || '').trim(),
        lines: [],
      }
      currentFile.hunks.push(currentHunk)
      continue
    }

    // Diff content lines
    if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({ kind: 'add', oldNum: null, newNum: newLine, text: line.slice(1) })
        newLine++
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({ kind: 'del', oldNum: oldLine, newNum: null, text: line.slice(1) })
        oldLine++
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.lines.push({ kind: 'ctx', oldNum: oldLine, newNum: newLine, text: line.startsWith(' ') ? line.slice(1) : '' })
        oldLine++
        newLine++
      } else if (line.startsWith('\\')) {
        // "\ No newline at end of file"
        currentHunk.lines.push({ kind: 'info', oldNum: null, newNum: null, text: line })
      }
    }
  }

  if (currentFile) files.push(currentFile)
  return files
}

/* ── Diff Viewer Component ───────────────────────────────────────── */

function DiffViewer(props) {
  const files = props.files || []
  if (files.length === 0) return React.createElement('div', { className: 'dg-empty' },
    React.createElement('div', { className: 'dg-empty-icon' }, '📄'),
    React.createElement('div', null, '无差异'))

  return React.createElement('div', null, files.map(function (file, fi) {
    const totalAdd = file.hunks.reduce(function (s, h) { return s + h.lines.filter(function (l) { return l.kind === 'add' }).length }, 0)
    const totalDel = file.hunks.reduce(function (s, h) { return s + h.lines.filter(function (l) { return l.kind === 'del' }).length }, 0)
    const badgeClass = file.status === 'A' ? 'dg-file-badge-a' : file.status === 'D' ? 'dg-file-badge-d' : 'dg-file-badge-m'

    const rows = []
    for (let hi = 0; hi < file.hunks.length; hi++) {
      const hunk = file.hunks[hi]
      // Hunk separator
      if (hi > 0) {
        rows.push(React.createElement('tr', { key: 'sep-' + hi, className: 'dg-diff-hunk' },
          React.createElement('td', { colSpan: 3 }, '⋯')))
      }
      // Hunk header
      if (hunk.context) {
        rows.push(React.createElement('tr', { key: 'hk-' + hi, className: 'dg-diff-hunk' },
          React.createElement('td', { colSpan: 3 }, hunk.context)))
      }
      for (let li = 0; li < hunk.lines.length; li++) {
        const line = hunk.lines[li]
        const cls = line.kind === 'add' ? 'dg-diff-add' : line.kind === 'del' ? 'dg-diff-del' : 'dg-diff-ctx'
        rows.push(React.createElement('tr', { key: hi + '-' + li, className: cls },
          React.createElement('td', { className: 'dg-dln' }, line.oldNum != null ? line.oldNum : ''),
          React.createElement('td', { className: 'dg-dln' }, line.newNum != null ? line.newNum : ''),
          React.createElement('td', { className: 'dg-dlc' }, line.text)))
      }
    }

    return React.createElement('div', { key: file.path + fi, className: 'dg-diff-viewer' },
      React.createElement('div', { className: 'dg-diff-file-header' },
        React.createElement('span', { className: 'dg-file-badge ' + badgeClass }, file.status),
        React.createElement('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, file.path),
        React.createElement('span', { style: { fontWeight: 400, fontSize: 11, color: 'var(--dsw-alias-label-caption,#888)' } },
          React.createElement('span', { className: 'dg-add' }, '+' + totalAdd),
          ' ',
          React.createElement('span', { className: 'dg-del' }, '−' + totalDel))),
      React.createElement('div', { className: 'dg-diff-scroll' },
        React.createElement('table', { className: 'dg-diff-table' },
          React.createElement('tbody', null, rows))),
      React.createElement('div', { className: 'dg-diff-footer' },
        React.createElement('span', null, file.hunks.length + ' hunk' + (file.hunks.length > 1 ? 's' : '')),
        React.createElement('span', null, '+' + totalAdd + ' −' + totalDel)))
  }))
}

/* ── Header Button ───────────────────────────────────────────────── */

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

/* ── File list item with status badge ────────────────────────────── */

function FileItem(props) {
  const path = props.path
  const badge = props.badge || 'M'
  const badgeClass = badge === 'A' ? 'dg-file-badge-a' : badge === 'D' ? 'dg-file-badge-d' : badge === '?' ? 'dg-file-badge-u' : 'dg-file-badge-m'
  const selected = props.selected
  return React.createElement('div', {
    className: 'dg-file-item' + (selected ? ' dg-file-item-selected' : ''),
    onClick: props.onClick,
    title: path,
  },
    React.createElement('span', { className: 'dg-file-badge ' + badgeClass }, badge),
    React.createElement('span', { className: 'dg-file-name' }, path))
}

/* ── Conversation Node Definition (data layer, unchanged) ────────── */

function dshGitDiffsDefinition() {
  return {
    kind: 'dsh-git-turn-diffs',
    match: function match(event) {
      if (event.type === 'turn/start') return { id: String(event.data.turn), role: 'start' }
      if (event.type === 'tool/call') return { id: String(event.data.turn), role: 'update' }
      if (event.type === 'tool/result') {
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
        try { args = JSON.parse(p.arguments || '{}') } catch (_) { /* skip */ }
        const calls = new Map(context.state.calls)
        calls.set(String(p.callId), { name: p.name, args: args || {} })
        return { ...context.state, calls }
      }
      if (match.event.type !== 'tool/result') return context.state
      const content = match.event.data.message && match.event.data.message.content
      if (content && content[0] && content[0].isError === true) return context.state
      const meta = match.event.data.meta
      if (meta && typeof meta === 'object' && !Array.isArray(meta)
        && Array.isArray(meta.diffs) && meta.diffs.length > 0) {
        return { ...context.state, diffs: [...context.state.diffs, ...meta.diffs] }
      }
      const callId = match.event.data.message && match.event.data.message.source
        ? String(match.event.data.message.source.callId)
        : null
      const call = callId === null ? undefined : context.state.calls.get(callId)
      if (call === undefined) return context.state
      const args = call.args || {}
      if (call.name === 'write' && typeof args.file_path === 'string' && typeof args.content === 'string') {
        return { ...context.state, diffs: [...context.state.diffs, { path: args.file_path, oldText: null, newText: args.content }] }
      }
      if (call.name === 'edit' && typeof args.file_path === 'string'
        && typeof args.old_string === 'string' && typeof args.new_string === 'string') {
        return { ...context.state, diffs: [...context.state.diffs, { path: args.file_path, oldText: args.old_string, newText: args.new_string }] }
      }
      return context.state
    },
    buildLocationData: function buildLocationData(context, scope) {
      if (scope !== 'turn' || context.state === undefined) return null
      return { kind: 'turn', turn: context.state.turn, key: 'dsh-git-turn-diffs', value: { diffs: context.state.diffs } }
    },
  }
}

function selectTurnDiffs(owner) {
  const turnNumber = owner && owner.turn && owner.turn.turn
  const data = owner && owner.turn && owner.turn.data && owner.turn.data.get('dsh-git-turn-diffs')
  if (typeof turnNumber === 'number') {
    state.tailSeen[turnNumber] = true
    emit()
  }
  if (!data || !data.diffs || data.diffs.length === 0) return null
  return data.diffs
}

function countLines(text) {
  if (text == null || text === '') return 0
  const body = text.endsWith('\n') ? text.slice(0, -1) : text
  return body.split('\n').length
}

/* ── Turn Diff Summary (turnTail chain) ──────────────────────────── */

function TurnDiffSummary(props) {
  const allDiffs = props.matched || []
  const turnNumber = props.turn && props.turn.turn
  const [open, setOpen] = React.useState({})
  const [confirmRestore, setConfirmRestore] = React.useState(false)
  const [restoring, setRestoring] = React.useState(false)
  const [agentRunning, setAgentRunning] = React.useState(false)

  React.useEffect(() => {
    if (!state.sessionId) return
    let alive = true
    callRemote('dshGit/agent.status', { sessionId: state.sessionId })
      .then((r) => { if (alive) setAgentRunning(r.running) })
      .catch(() => { if (alive) setAgentRunning(false) })
    return () => { alive = false }
  }, [state.sessionId])

  if (!allDiffs || allDiffs.length === 0) return null
  if (typeof turnNumber === 'number') { state.tailSeen[turnNumber] = true; emit() }

  // Group diffs by path
  const byPath = {}
  for (let i = 0; i < allDiffs.length; i++) {
    const d = allDiffs[i]
    if (!byPath[d.path]) byPath[d.path] = { path: d.path, hunks: [], add: 0, del: 0 }
    byPath[d.path].hunks.push(d)
  }
  const files = Object.keys(byPath).sort()
  let totalAdd = 0, totalDel = 0
  for (let i = 0; i < files.length; i++) {
    const f = byPath[files[i]]
    for (let j = 0; j < f.hunks.length; j++) {
      const a = countLines(f.hunks[j].newText), d = countLines(f.hunks[j].oldText)
      f.add += a; f.del += d; totalAdd += a; totalDel += d
    }
  }

  const doRestore = () => {
    if (!state.sessionId || !turnNumber || agentRunning) return
    setRestoring(true)
    callRemote('dshGit/restoreTurn', { sessionId: state.sessionId, turn: turnNumber })
      .then((r) => {
        setRestoring(false)
        setConfirmRestore(false)
        const turnsReverted = r.turnsReverted || [turnNumber]
        alert(`已恢复到 turn ${turnNumber} 之前的状态，撤销了 ${turnsReverted.length} 个回合的修改，恢复了 ${r.restored.length} 个文件`)
      })
      .catch((e) => { setRestoring(false); alert('恢复失败: ' + (e.message || e)) })
  }

  return React.createElement('div', { className: 'dg-turn', 'data-dsh-git': 'turn-summary', 'data-turn': turnNumber },
    React.createElement('div', { className: 'dg-turn-head' },
      React.createElement('span', { className: 'dg-turn-tag' }, 'dsh-git'),
      React.createElement('span', { className: 'dg-turn-title' }, `本回合修改 ${files.length} 个文件`),
      React.createElement('span', { className: 'dg-turn-stat' },
        React.createElement('span', { className: 'dg-add' }, '+' + totalAdd), ' ',
        React.createElement('span', { className: 'dg-del' }, '−' + totalDel)),
      React.createElement('button', {
        className: 'dg-btn dg-btn-sm',
        style: { marginLeft: 6, opacity: agentRunning ? 0.5 : 1 },
        disabled: agentRunning || restoring,
        onClick: (e) => { e.stopPropagation(); setConfirmRestore(true) },
        title: agentRunning ? 'agent 运行中，恢复已禁用' : '恢复到此回合之前的状态（撤销此回合及之后的所有修改）',
      }, restoring ? '恢复中…' : '恢复到此')),
    confirmRestore ? React.createElement('div', { className: 'dg-confirm' },
      React.createElement('div', { className: 'dg-confirm-msg' }, `确认恢复到 turn ${turnNumber} 之前的状态？将撤销此回合及之后的所有修改。`),
      React.createElement('div', { className: 'dg-btn-row' },
        React.createElement('button', { className: 'dg-btn dg-btn-active', disabled: restoring, onClick: doRestore }, restoring ? '恢复中…' : '确认恢复'),
        React.createElement('button', { className: 'dg-btn', onClick: () => setConfirmRestore(false) }, '取消'))) : null,
    files.map(function (path) {
      const f = byPath[path]
      const opened = !!open[path]
      // Build structured diff for this file
      const fileDiffs = []
      for (let j = 0; j < f.hunks.length; j++) {
        const h = f.hunks[j]
        const oldLines = h.oldText == null ? [] : (h.oldText === '' ? [] : (h.oldText.endsWith('\n') ? h.oldText.slice(0, -1) : h.oldText).split('\n'))
        const newLines = h.newText == null ? [] : (h.newText === '' ? [] : (h.newText.endsWith('\n') ? h.newText.slice(0, -1) : h.newText).split('\n'))
        const hunkLines = []
        for (let k = 0; k < oldLines.length; k++) hunkLines.push({ kind: 'del', oldNum: k + 1, newNum: null, text: oldLines[k] })
        for (let k = 0; k < newLines.length; k++) hunkLines.push({ kind: 'add', oldNum: null, newNum: k + 1, text: newLines[k] })
        fileDiffs.push({ header: '', context: '', lines: hunkLines })
      }
      const status = (f.hunks.length > 0 && f.hunks[0].oldText === null) ? 'A' : 'M'
      return React.createElement('div', { key: path },
        React.createElement('div', {
          className: 'dg-file-toggle' + (opened ? ' dg-file-open' : ''),
          onClick: function(e) {
            e.stopPropagation()
            setOpen(function(o) {
              const n = {}
              for (const k in o) n[k] = o[k]
              n[path] = !n[path]
              return n
            })
          },
          style: { cursor: 'pointer', userSelect: 'none' },
        },
          React.createElement('span', { className: 'dg-file-chev' }, opened ? '▾' : '▸'),
          React.createElement('span', { className: 'dg-file-badge ' + (status === 'A' ? 'dg-file-badge-a' : 'dg-file-badge-m') }, status),
          React.createElement('span', { className: 'dg-file-name' }, path),
          React.createElement('span', { className: 'dg-file-stat' },
            React.createElement('span', { className: 'dg-add' }, '+' + f.add), ' ',
            React.createElement('span', { className: 'dg-del' }, '−' + f.del))),
        opened ? React.createElement('div', { style: { margin: '4px 0 8px 20px' } },
          React.createElement(DiffViewer, { files: [{ path, status, hunks: fileDiffs }] })) : null)
    }))
}

/* ── Recent Turns (panel fallback) ───────────────────────────────── */

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
  }, [sessionId])
  const withFiles = (turns || []).filter((t) => t.files && t.files.length > 0)
  if (withFiles.length === 0) return null

  return React.createElement('div', { className: 'dg-turn', 'data-dsh-git': 'recent-turns' },
    React.createElement('div', { className: 'dg-turn-head' },
      React.createElement('span', { className: 'dg-turn-tag' }, 'history'),
      React.createElement('span', { className: 'dg-turn-title' }, '最近修改回合')),
    withFiles.slice().reverse().map((t) => {
      const opened = !!open[t.turn]
      const add = t.files.reduce((a, f) => a + f.add, 0)
      const del = t.files.reduce((a, f) => a + f.del, 0)
      return React.createElement('div', { key: t.turn },
        React.createElement('div', {
          className: 'dg-file-toggle' + (opened ? ' dg-file-open' : ''),
          onClick: () => setOpen((o) => ({ ...o, [t.turn]: !o[t.turn] })),
        },
          React.createElement('span', { className: 'dg-file-chev' }, '▸'),
          React.createElement('span', { className: 'dg-file-name' }, 'Turn ' + t.turn + ' · ' + t.files.length + ' 文件'),
          React.createElement('span', { className: 'dg-file-stat' },
            React.createElement('span', { className: 'dg-add' }, '+' + add), ' ',
            React.createElement('span', { className: 'dg-del' }, '−' + del))),
        opened ? React.createElement('div', { style: { margin: '4px 0 4px 18px' } },
          t.files.map((f) => {
            const fileDiffs = f.hunks.map((hx) => {
              const oldLines = hx.oldText == null ? [] : (hx.oldText === '' ? [] : (hx.oldText.endsWith('\n') ? hx.oldText.slice(0, -1) : hx.oldText).split('\n'))
              const newLines = hx.newText == null ? [] : (hx.newText === '' ? [] : (hx.newText.endsWith('\n') ? hx.newText.slice(0, -1) : hx.newText).split('\n'))
              const hunkLines = []
              for (let k = 0; k < oldLines.length; k++) hunkLines.push({ kind: 'del', oldNum: k + 1, newNum: null, text: oldLines[k] })
              for (let k = 0; k < newLines.length; k++) hunkLines.push({ kind: 'add', oldNum: null, newNum: k + 1, text: newLines[k] })
              return { header: '', context: '', lines: hunkLines }
            })
            return React.createElement(DiffViewer, { key: f.path, files: [{ path: f.path, status: 'M', hunks: fileDiffs }] })
          })) : null)
    }))
}

/* ── Changes Tab ─────────────────────────────────────────────────── */

function ChangesTab(props) {
  const [data, setData] = React.useState(null)
  const [ver, setVer] = React.useState(0)
  const [out, setOut] = React.useState({ loading: true, text: '', error: null })
  const [parsedFiles, setParsedFiles] = React.useState([])

  React.useEffect(() => {
    if (!state.sessionId) return
    let alive = true
    callRemote('dshGit/status', { sessionId: state.sessionId })
      .then((r) => { if (alive) setData(r) })
      .catch((e) => { if (alive) setData({ error: String((e && e.message) || e) }) })
    return () => { alive = false }
  }, [state.sessionId, ver])

  React.useEffect(() => {
    if (!state.sessionId) return
    let alive = true
    setOut({ loading: true, text: '', error: null })
    setParsedFiles([])
    const diffArgs = { sessionId: state.sessionId, staged: props.sel.staged }
    if (props.sel.path) diffArgs.path = props.sel.path
    callRemote('dshGit/diff', diffArgs).then((r) => {
      if (!alive) return
      if (r.error) {
        setOut({ loading: false, text: '', error: r.error })
      } else {
        setOut({ loading: false, text: r.diff, error: null })
        setParsedFiles(parseUnifiedDiff(r.diff))
      }
    }).catch((e) => { if (alive) setOut({ loading: false, text: '', error: String((e && e.message) || e) }) })
    return () => { alive = false }
  }, [state.sessionId, props.sel, ver])

  const staged = data && data.staged || []
  const unstaged = data && data.unstaged || []
  const untracked = data && data.untracked || []
  const hasFiles = staged.length + unstaged.length + untracked.length > 0

  return React.createElement('div', null,
    // Branch info bar
    React.createElement('div', { className: 'dg-branch-bar' },
      React.createElement('span', { className: 'dg-branch-name' }, data ? (data.error ? '—' : data.branch) : '…'),
      data && (data.ahead || data.behind) ? React.createElement('span', { className: 'dg-branch-stat' },
        data.ahead ? React.createElement('span', { className: 'dg-add' }, '↑' + data.ahead + ' ') : null,
        data.behind ? React.createElement('span', { className: 'dg-del' }, '↓' + data.behind) : null) : null,
      React.createElement('span', { style: { flex: 1 } }),
      React.createElement('button', { className: 'dg-btn dg-btn-sm dg-btn-ghost', onClick: () => setVer((v) => v + 1) }, '↻ 刷新')),

    data && data.error ? React.createElement('div', { className: 'dg-err' }, data.error) : null,

    // File lists
    staged.length > 0 ? React.createElement('div', null,
      React.createElement('div', { className: 'dg-file-group-title' }, '已暂存 · ' + staged.length),
      staged.map((path) => React.createElement(FileItem, {
        key: 's-' + path, path, badge: 'M',
        selected: props.sel.staged && props.sel.path === path,
        onClick: () => props.onPick(path, 's'),
      }))) : null,

    unstaged.length > 0 ? React.createElement('div', null,
      React.createElement('div', { className: 'dg-file-group-title' }, '未暂存 · ' + unstaged.length),
      unstaged.map((path) => React.createElement(FileItem, {
        key: 'u-' + path, path, badge: 'M',
        selected: !props.sel.staged && props.sel.path === path,
        onClick: () => props.onPick(path, 'u'),
      }))) : null,

    untracked.length > 0 ? React.createElement('div', null,
      React.createElement('div', { className: 'dg-file-group-title' }, '未跟踪 · ' + untracked.length),
      untracked.map((path) => React.createElement(FileItem, {
        key: 't-' + path, path, badge: '?',
        selected: false,
        onClick: () => {},
      }))) : null,

    !hasFiles && data && !data.error ? React.createElement('div', { className: 'dg-empty' },
      React.createElement('div', { className: 'dg-empty-icon' }, '✓'),
      React.createElement('div', null, '工作区干净，无变更')) : null,

    // Diff toggle + filter
    hasFiles ? React.createElement('div', { style: { margin: '12px 0 8px', display: 'flex', alignItems: 'center', gap: 6 } },
      React.createElement('button', { className: 'dg-btn dg-btn-sm' + (props.sel.staged ? '' : ' dg-btn-active'), onClick: () => props.onSel({ staged: false, path: props.sel.path }) }, '未暂存 diff'),
      React.createElement('button', { className: 'dg-btn dg-btn-sm' + (props.sel.staged ? ' dg-btn-active' : ''), onClick: () => props.onSel({ staged: true, path: props.sel.path }) }, '已暂存 diff'),
      props.sel.path ? React.createElement('span', { className: 'dg-muted', style: { marginLeft: 4 } }, props.sel.path) : null,
      props.sel.path ? React.createElement('button', { className: 'dg-btn dg-btn-sm dg-btn-ghost', onClick: () => props.onSel({ staged: props.sel.staged, path: '' }) }, '× 全部') : null) : null,

    // Diff viewer
    out.loading ? React.createElement('div', { className: 'dg-loading' },
      React.createElement('div', { className: 'dg-spinner' }),
      '计算 diff…') : null,
    out.error ? React.createElement('div', { className: 'dg-err' }, out.error) : null,
    !out.loading && !out.error ? React.createElement(DiffViewer, { files: parsedFiles }) : null)
}

/* ── Commit Tab ──────────────────────────────────────────────────── */

function CommitTab() {
  const [msg, setMsg] = React.useState('')
  const [arm, setArm] = React.useState(false)
  const [out, setOut] = React.useState(null)
  const doCommit = () => {
    if (!state.sessionId || !msg.trim()) return
    callRemote('dshGit/commit', { sessionId: state.sessionId, message: msg })
      .then((r) => { setOut({ error: null, output: r.output }); setArm(false); setMsg('') })
      .catch((e) => { setOut({ error: String((e && e.message) || e), output: null }); setArm(false) })
  }
  return React.createElement('div', null,
    React.createElement('div', { className: 'dg-sec-title' }, '提交变更'),
    React.createElement('textarea', { className: 'dg-input dg-textarea', rows: 3, placeholder: '输入 commit message…', value: msg, onChange: (e) => setMsg(e.target.value) }),
    React.createElement('div', { className: 'dg-btn-row', style: { marginTop: 8 } },
      !arm ? React.createElement('button', { className: 'dg-btn', disabled: !msg.trim(), onClick: () => setArm(true) }, 'git add -A && commit') : null,
      arm ? React.createElement('button', { className: 'dg-btn dg-btn-active', onClick: doCommit }, '确认提交') : null,
      arm ? React.createElement('button', { className: 'dg-btn', onClick: () => setArm(false) }, '取消') : null),
    out ? (out.error ? React.createElement('div', { className: 'dg-err' }, out.error) : React.createElement('div', { className: 'dg-ok' }, '已提交：' + out.output)) : null)
}

/* ── Preview Tab ─────────────────────────────────────────────────── */

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
      React.createElement('input', { className: 'dg-input', placeholder: '相对路径，如 src/index.js', value: path, onChange: (e) => setPath(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') load() } }),
      React.createElement('button', { className: 'dg-btn', onClick: load }, '读取')),
    out ? (out.error ? React.createElement('div', { className: 'dg-err' }, out.error) : React.createElement('div', { className: 'dg-diff-viewer', style: { marginTop: 8 } },
      React.createElement('div', { className: 'dg-diff-scroll', style: { maxHeight: 500 } },
        React.createElement('pre', { style: { margin: 0, padding: '8px 12px', fontFamily: 'var(--ds-font-family-code,ui-monospace,Menlo,monospace)', fontSize: 12, lineHeight: '20px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--dsw-alias-label-secondary,#444)' } }, out.text)))) : null)
}

/* ── Main Panel ──────────────────────────────────────────────────── */

function Panel() {
  const st = useStore()
  const [tab, setTab] = React.useState('变更')
  const [sel, setSel] = React.useState({ staged: false, path: '' })
  if (!st.open) return null
  const pick = (path, mark) => { setSel({ staged: mark === 's', path }); setTab('变更') }

  return React.createElement('div', { className: 'dg-panel' },
    // Header
    React.createElement('div', { className: 'dg-panel-head' },
      React.createElement('span', null,
        React.createElement('span', { className: 'dg-panel-title' }, 'Git'),
        React.createElement('span', { className: 'dg-panel-build' }, BUILD_TS)),
      React.createElement('button', { className: 'dg-btn dg-btn-sm', onClick: () => setState({ open: false }) }, '✕')),

    // Tabs
    React.createElement('div', { className: 'dg-tabs' },
      ['变更', '提交', '预览'].map((name) =>
        React.createElement('button', { key: name, className: 'dg-tab' + (tab === name ? ' dg-tab-active' : ''), onClick: () => setTab(name) }, name))),

    // Body
    React.createElement('div', { className: 'dg-panel-body' },
      tab === '变更' ? React.createElement('div', null,
        React.createElement(RecentTurns, null),
        React.createElement(ChangesTab, { sel, onSel: setSel, onPick: pick })) : null,
      tab === '提交' ? React.createElement(CommitTab, null) : null,
      tab === '预览' ? React.createElement(PreviewTab, null) : null))
}

/* ── Plugin Registration ─────────────────────────────────────────── */

exports.inject = ['slots', 'connection', 'uiConversation']

exports.apply = function apply(ctx) {
  rootCtx = ctx
  const slots = ctx.get === undefined ? ctx.slots : (ctx.get('slots') ?? ctx.slots)
  rootSlots = slots
  if (slots === undefined) return
  const uiConversation = ctx.get === undefined ? ctx.uiConversation : ctx.get('uiConversation')

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
    let disposeDefinition = () => undefined
    if (uiConversation && uiConversation.events && typeof uiConversation.events.register === 'function') {
      disposeDefinition = uiConversation.events.register(dshGitDiffsDefinition())
    }
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
