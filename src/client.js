'use strict'

const BUILD_TS = '09-18 18:06:00'

const React = require('react')

/** `state.sessionId` is captured by the header button; the hover popover addresses the host RPC with it. */

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
  /* ── Diff viewer (side-by-side, one table so both panes stay aligned) ── */
  '.dg-diff-viewer{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:8px;overflow:hidden;margin:8px 0;background:var(--dsw-alias-bg-base,#fff)}',
  '.dg-diff-file-header{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.03));border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06));font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.dg-diff-file-header .dg-file-badge{font-size:9px;width:16px;height:16px}',
  '.dg-diff-scroll{overflow:auto;max-height:400px}',
  '.dg-diff-table{width:100%;border-collapse:collapse;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;line-height:20px;table-layout:fixed}',
  '.dg-diff-table td{padding:0;vertical-align:top;white-space:pre;overflow:hidden;text-overflow:ellipsis}',
  /* Side-by-side columns: [old n°][mark][old code] │ [new n°][mark][new code]
     The gutters are fixed px and the two code columns split whatever is left
     equally; the table itself carries a `min-width` derived from the file's
     longest line (see SPLIT_SIDE_PX), so a wide line widens both panes and the
     scroll box pans the pair instead of clipping either one. */
  '.dg-diff-split{tab-size:4}',
  /* Wrap mode (the hover popover): the table is exactly the container's width
     and a long line wraps inside its own pane, so both sides are fully readable
     without horizontal panning. Rows still start on the same line because the
     panes share one table row; only the wrapped cell grows taller. */
  '.dg-diff-wrap{table-layout:fixed;width:100%}',
  '.dg-diff-wrap td{white-space:pre-wrap;overflow-wrap:anywhere;text-overflow:clip;overflow:visible}',
  '.dg-diff-wrap .dg-ds-num,.dg-diff-wrap .dg-ds-mark{white-space:nowrap;overflow:hidden}',
  /* VSCode-style scroll mode (the popover's ⇄ 滚动): one table per side, each in
     its own horizontal scroll box with a permanently visible scrollbar; the two
     are mirrored by script. `table-layout: fixed` + a shared per-side min-width
     keeps both scroll ranges identical, so the mirrored offset keeps a row's two
     halves in the same column. */
  '.dg-panes{display:flex;align-items:flex-start;width:100%}',
  '.dg-pane{flex:1 1 50%;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l1,rgba(0,0,0,.32)) transparent}',
  '.dg-pane+.dg-pane{border-left:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12))}',
  '.dg-pane-table{table-layout:fixed}',
  '.dg-pane::-webkit-scrollbar{height:11px}',
  '.dg-pane::-webkit-scrollbar-track{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.04))}',
  '.dg-pane::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l1,rgba(0,0,0,.32));border-radius:6px;border:2px solid transparent;background-clip:padding-box}',
  '.dg-pane::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-label-tertiary,#888);background-clip:padding-box}',
  /* Horizontal panning must not take the gutter with it: the line-number and
     sign columns stay pinned at the pane's left edge (VSCode does the same), so
     a scrolled row still shows which lines it is. Sticky cells need an OPAQUE
     background or the code slides underneath them; the row-state tints are
     translucent by design, so the pinned cells re-mix that tint over the
     popover's own fill instead of over `transparent`. */
  '.dg-pane .dg-ds-num,.dg-pane .dg-ds-mark{position:sticky;z-index:2;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base,#fff))}',
  '.dg-pane .dg-ds-num{left:0}',
  '.dg-pane .dg-ds-mark{left:44px;box-shadow:1px 0 0 var(--dsw-alias-border-l1,rgba(0,0,0,.12))}',
  '.dg-pane .dg-ds-del.dg-ds-num,.dg-pane .dg-ds-del.dg-ds-mark{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#b3261e) 9%,var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base,#fff)))}',
  '.dg-pane .dg-ds-add.dg-ds-num,.dg-pane .dg-ds-add.dg-ds-mark{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#188038) 9%,var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base,#fff)))}',
  '.dg-pane .dg-ds-void.dg-ds-num,.dg-pane .dg-ds-void.dg-ds-mark{background:color-mix(in srgb,#000 4%,var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base,#fff)))}',
  '.dg-ds-num{width:44px;text-align:right;padding:0 6px 0 0 !important;color:var(--dsw-alias-label-caption,#aaa);user-select:none;font-size:11px}',
  '.dg-ds-mark{width:13px;text-align:center;color:var(--dsw-alias-label-caption,#bbb);user-select:none;font-size:11px}',
  '.dg-ds-code{padding:0 8px 0 8px !important;color:var(--dsw-alias-label-tertiary,#666)}',
  /* Pane divider + the "no line on this side" filler */
  '.dg-ds-div{border-left:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12))}',
  '.dg-ds-void{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.035))}',
  /* Per-cell line state (a modified row is del on the left, add on the right) */
  '.dg-ds-del{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#b3261e) 6%,transparent)}',
  '.dg-ds-del.dg-ds-num,.dg-ds-del.dg-ds-mark{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#b3261e) 9%,transparent);color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#b3261e) 55%,var(--dsw-alias-label-caption,#aaa))}',
  '.dg-ds-del.dg-ds-code{color:var(--dsw-alias-state-error-primary,#b3261e)}',
  '.dg-ds-add{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#188038) 6%,transparent)}',
  '.dg-ds-add.dg-ds-num,.dg-ds-add.dg-ds-mark{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#188038) 9%,transparent);color:color-mix(in srgb,var(--dsw-alias-state-success-primary,#188038) 55%,var(--dsw-alias-label-caption,#aaa))}',
  '.dg-ds-add.dg-ds-code{color:var(--dsw-alias-state-success-primary,#188038)}',
  /* Hunk header */
  '.dg-diff-hunk{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b82f6) 6%,transparent)}',
  '.dg-diff-hunk td{color:var(--dsw-alias-state-business-primary,#3b82f6);font-weight:500;padding:3px 8px !important;font-size:11px}',
  /* Diff footer */
  '.dg-diff-footer{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-top:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06));font-size:11px;color:var(--dsw-alias-label-caption,#999);background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.02))}',
  /* ── Recent-turns list in the panel (fold-out per-file diffs) ── */
  '.dg-turn{position:relative;margin:8px 0;padding:10px 12px 10px 14px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08));border-radius:10px;background:var(--dsw-alias-bg-base,transparent)}',
  '.dg-turn::before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:2px;border-radius:1px;background:var(--dsw-alias-state-business-primary,#8ab4f8)}',
  '.dg-turn-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}',
  '.dg-turn-tag{display:inline-block;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#8ab4f8) 14%,transparent);color:var(--dsw-alias-state-business-primary,#3b6fd4);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700;line-height:16px;text-transform:uppercase;letter-spacing:.03em}',
  '.dg-turn-title{color:var(--dsw-alias-label-secondary,#444);font-size:12px;font-weight:500}',
  '.dg-turn-stat{margin-left:auto;font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;color:var(--dsw-alias-label-caption,#888);white-space:nowrap}',
  '.dg-turn-stat .dg-add{color:var(--dsw-alias-state-success-primary,#188038)}',
  '.dg-turn-stat .dg-del{color:var(--dsw-alias-state-error-primary,#b3261e)}',
  '.dg-file-toggle{display:flex;align-items:center;gap:6px;padding:4px 6px;cursor:pointer;border-radius:5px;transition:background .1s;margin:1px 0}',
  '.dg-file-toggle:hover{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.04))}',
  '.dg-file-chev{color:var(--dsw-alias-label-caption,#aaa);font-size:10px;flex-shrink:0;transition:transform .15s ease;width:12px;text-align:center}',
  '.dg-file-open .dg-file-chev{transform:rotate(90deg)}',
  /* ── Hover diff popover (official 「本轮文件改动」 chips) ──────────
     Raised from the chat's `shell.overlay` seat and positioned against the
     hovered chip's viewport rect, so no ancestor's `overflow` can clip it.
     The head stays put while both diff panes scroll together underneath. */
  '.dg-diff-pop{position:fixed;z-index:2100;box-sizing:border-box;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:10px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base,#fff));box-shadow:0 12px 32px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.08);overflow:hidden;color:var(--dsw-alias-label-primary,#1a1a1a);font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;pointer-events:auto}',
  '.dg-diff-pop-head{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.03));border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06));font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;font-weight:600;flex-shrink:0}',
  '.dg-diff-pop-head .dg-file-badge{font-size:9px;width:16px;height:16px}',
  '.dg-diff-pop-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.dg-diff-pop-turn{font-weight:400;font-size:11px;color:var(--dsw-alias-label-caption,#999);flex-shrink:0}',
  '.dg-diff-pop-stat{font-weight:400;font-size:11px;color:var(--dsw-alias-label-caption,#888);flex-shrink:0;white-space:nowrap}',
  '.dg-diff-pop-stat .dg-add{color:var(--dsw-alias-state-success-primary,#188038)}',
  '.dg-diff-pop-stat .dg-del{color:var(--dsw-alias-state-error-primary,#b3261e)}',
  '.dg-diff-pop-toggle{flex-shrink:0;font-family:inherit;font-size:11px;line-height:16px;padding:1px 7px;border-radius:5px;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.04));color:var(--dsw-alias-label-secondary,#555)}',
  '.dg-diff-pop-toggle:hover{color:var(--dsw-alias-label-primary,#1a1a1a);background:var(--dsw-alias-interactive-bg-hover-solid,rgba(0,0,0,.08))}',
  /* The body is the popover's only scroll box (the inner viewer box is
     neutralised below). Keep a real, permanently visible scrollbar rather than
     the OS overlay kind, so "there is more diff to the right" is never a guess. */
  '.dg-diff-pop-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l1,rgba(0,0,0,.28)) transparent}',
  '.dg-diff-pop-body::-webkit-scrollbar{width:10px;height:10px}',
  '.dg-diff-pop-body::-webkit-scrollbar-track{background:var(--dsw-alias-interactive-bg,rgba(0,0,0,.03))}',
  '.dg-diff-pop-body::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l1,rgba(0,0,0,.28));border-radius:5px;border:2px solid transparent;background-clip:padding-box}',
  '.dg-diff-pop-body::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-label-tertiary,#888);background-clip:padding-box}',
  /* Inside the popover the outer body is the single scroll box: drop the
     viewer chrome and let a wide line pan BOTH panes inside it. */
  '.dg-diff-pop .dg-diff-viewer{margin:0;border:none;border-radius:0;background:transparent}',
  '.dg-diff-pop .dg-diff-scroll{max-height:none;overflow:visible}',
  '.dg-diff-pop .dg-empty{padding:16px}',
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
  '.dg-panel-body::-webkit-scrollbar,.dg-diff-scroll::-webkit-scrollbar,.dg-diff-pop-body::-webkit-scrollbar{width:6px;height:6px}',
  '.dg-panel-body::-webkit-scrollbar-track,.dg-diff-scroll::-webkit-scrollbar-track,.dg-diff-pop-body::-webkit-scrollbar-track{background:transparent}',
  '.dg-panel-body::-webkit-scrollbar-thumb,.dg-diff-scroll::-webkit-scrollbar-thumb,.dg-diff-pop-body::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:3px}',
  '.dg-panel-body::-webkit-scrollbar-thumb:hover,.dg-diff-scroll::-webkit-scrollbar-thumb:hover,.dg-diff-pop-body::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-border-l1,rgba(0,0,0,.2))}',
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

/* ── Diff Viewer Component (side-by-side) ────────────────────────── */

/** Columns of the split table: old n° / mark / code │ new n° / mark / code. */
const SPLIT_COL_COUNT = 6
/** Fixed width of one side's gutters (line-number column + sign column), in px. */
const SPLIT_GUTTER_PX = 57
/** Code-cell horizontal padding, in px (8px each side). */
const SPLIT_PADDING_PX = 16
/** Everything one side spends besides code: gutters plus padding, in px. */
const SPLIT_SIDE_PX = SPLIT_GUTTER_PX + SPLIT_PADDING_PX
/** Code points that occupy two cells in a monospace run (CJK, fullwidth forms). */
const SPLIT_WIDE_RE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/

/** Badge class for one file status letter (shared by every surface). */
function statusBadgeClass(status) {
  return status === 'A' ? 'dg-file-badge-a'
    : status === 'D' ? 'dg-file-badge-d'
      : status === '?' ? 'dg-file-badge-u'
        : 'dg-file-badge-m'
}

/**
 * Display width of one diff line in `ch` units: a tab expands to four cells and
 * a wide (CJK/fullwidth) code point to two, matching how a monospace run lays
 * that text out.
 * @param text - one line of code.
 * @returns its width in `ch`.
 */
function splitLineWidth(text) {
  if (typeof text !== 'string' || text === '') return 0
  let width = 0
  for (const ch of text) width += ch === '\t' ? 4 : SPLIT_WIDE_RE.test(ch) ? 2 : 1
  return width
}

/**
 * Width of a file's longest line, in `ch` units. The split columns are sized
 * from it so that every line is readable instead of being clipped.
 * @param file - `{ hunks }`.
 * @returns the widest line, in `ch`.
 */
function splitContentWidth(file) {
  let width = 0
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      const lineWidth = splitLineWidth(line.text)
      if (lineWidth > width) width = lineWidth
    }
  }
  return width
}

/**
 * Pair one hunk's lines into aligned left/right rows.
 *
 * Unified output already writes a change block as "every deletion, then every
 * addition", so zipping those two runs index-wise reproduces the usual
 * side-by-side pairing: the shorter run leaves `null` on that side and the row
 * renders dimmed filler cells there, which is what keeps the two panes on the
 * same line. Context lines occupy both panes; `info` lines
 * (e.g. "\ No newline at end of file") span the whole row.
 * @param lines - parsed hunk lines.
 * @returns rows of `{ left, right, kind }`, or `{ info }`.
 */
function splitRows(lines) {
  const rows = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.kind === 'ctx') {
      rows.push({ left: line, right: line, kind: 'ctx' })
      i++
      continue
    }
    if (line.kind === 'info') {
      rows.push({ info: line })
      i++
      continue
    }
    const dels = []
    const adds = []
    while (i < lines.length && (lines[i].kind === 'del' || lines[i].kind === 'add')) {
      if (lines[i].kind === 'del') dels.push(lines[i])
      else adds.push(lines[i])
      i++
    }
    const height = Math.max(dels.length, adds.length)
    for (let k = 0; k < height; k++) {
      const left = dels[k] || null
      const right = adds[k] || null
      rows.push({ left, right, kind: left === null ? 'add' : right === null ? 'del' : 'change' })
    }
  }
  return rows
}

/**
 * The three cells of one side of a split row: line number, sign, code. A `null`
 * line means this side has no counterpart on that row, so every cell is a
 * dimmed placeholder instead.
 * @param line - the line, or null for the empty side.
 * @param side - 'left' (old numbers) or 'right' (new numbers).
 * @param kind - 'del', 'add' or 'ctx' (ignored when `line` is null).
 * @param extra - extra classes for this side's cells.
 */
function splitCells(line, side, kind, extra) {
  const state = line === null ? 'dg-ds-void' : kind === 'del' ? 'dg-ds-del' : kind === 'add' ? 'dg-ds-add' : ''
  const num = line === null ? null : (side === 'left' ? line.oldNum : line.newNum)
  const sign = line === null ? '' : kind === 'del' ? '−' : kind === 'add' ? '+' : ''
  const suffix = ' ' + state + (extra || '')
  return [
    React.createElement('td', { key: side + '-n', className: 'dg-ds-num' + suffix }, num != null ? num : ''),
    React.createElement('td', { key: side + '-m', className: 'dg-ds-mark' + suffix }, sign),
    React.createElement('td', { key: side + '-c', className: 'dg-ds-code' + suffix }, line === null ? '' : line.text),
  ]
}

/**
 * Flatten one file's parsed hunks into the row descriptors both layouts draw:
 * `{ kind: 'hunk', text }` for separators/context/info rows, and
 * `{ kind: 'change', left, right, contextual }` for a paired code row. Keeping
 * one descriptor list is what lets the single-table and two-pane layouts stay
 * row-for-row identical.
 */
function diffRowDescriptors(file) {
  const rows = []
  for (let hi = 0; hi < file.hunks.length; hi++) {
    const hunk = file.hunks[hi]
    if (hi > 0) rows.push({ kind: 'hunk', text: '⋯' })
    if (hunk.context) rows.push({ kind: 'hunk', text: hunk.context })
    const split = splitRows(hunk.lines)
    for (const row of split) {
      if (row.info) {
        rows.push({ kind: 'hunk', text: row.info.text })
        continue
      }
      rows.push({ kind: 'change', left: row.left, right: row.right, contextual: row.kind === 'ctx' })
    }
  }
  return rows
}

/** Columns of one side's own table: [line n°][sign][code]. */
const PANE_COLUMNS = [
  React.createElement('col', { key: 'n', style: { width: 44 } }),
  React.createElement('col', { key: 'm', style: { width: 13 } }),
  React.createElement('col', { key: 'c' }),
]

/** One row of a single-side pane table. */
function paneRow(row, side, index) {
  if (row.kind === 'hunk') {
    return React.createElement('tr', { key: index, className: 'dg-diff-hunk' },
      React.createElement('td', { colSpan: 3 }, row.text))
  }
  const line = side === 'left' ? row.left : row.right
  const kind = row.contextual ? 'ctx' : side === 'left' ? 'del' : 'add'
  return React.createElement('tr', { key: index, className: 'dg-diff-row' }, splitCells(line, side, kind))
}

/**
 * VSCode-style scroll mode: the old and new sides become two tables, each in
 * its own horizontal scroll box with its own permanently visible scrollbar, and
 * a scroll on either side mirrors onto the other so the two halves of a row stay
 * column-aligned. Both panes take the SAME `min-width` (the widest line across
 * both sides), so their scroll ranges are identical and an absolute scrollLeft
 * mirror keeps the columns in step. Vertical scrolling stays with the popover
 * body, which owns both panes.
 */
function SplitPanes(props) {
  const leftRef = React.useRef(null)
  const rightRef = React.useRef(null)
  const lock = React.useRef(false)
  const mirror = (from, to) => {
    if (from === null || to === null || lock.current || to.scrollLeft === from.scrollLeft) return
    lock.current = true
    to.scrollLeft = from.scrollLeft
    const release = () => { lock.current = false }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(release)
    else setTimeout(release, 0)
  }
  const pane = (ref, side, onScroll) => React.createElement('div', { className: 'dg-pane', ref, onScroll },
    React.createElement('table', { className: 'dg-diff-table dg-pane-table', style: { minWidth: props.minWidth } },
      React.createElement('colgroup', null, PANE_COLUMNS),
      React.createElement('tbody', null, props.rows.map((row, index) => paneRow(row, side, index)))))
  return React.createElement('div', { className: 'dg-panes' },
    pane(leftRef, 'left', () => mirror(leftRef.current, rightRef.current)),
    pane(rightRef, 'right', () => mirror(rightRef.current, leftRef.current)))
}

/**
 * Render file diffs as aligned side-by-side panes (old on the left, new on the
 * right).
 *
 * @param props.files - `FileDiff[]`, each `{ path, status, hunks }`.
 * @param props.hideHeader - drop the per-file header; used when the caller's
 *   own row already shows the badge, path and ± counts (the hover popover's
 *   head does, as did the old turn card's file rows).
 * @param props.wrap - wrap long code lines inside their own column of the single
 *   table, so both sides fit the container at once (the popover's default).
 * @param props.panes - draw the two synced per-side scroll panes instead of the
 *   single six-column table (the popover's scroll mode).
 */
function DiffViewer(props) {
  const files = props.files || []
  const showHeader = props.hideHeader !== true
  const wrap = props.wrap === true
  const panes = props.panes === true && wrap !== true
  if (files.length === 0) return React.createElement('div', { className: 'dg-empty' },
    React.createElement('div', { className: 'dg-empty-icon' }, '📄'),
    React.createElement('div', null, '无差异'))

  return React.createElement('div', null, files.map(function (file, fi) {
    const totalAdd = file.hunks.reduce(function (s, h) { return s + h.lines.filter(function (l) { return l.kind === 'add' }).length }, 0)
    const totalDel = file.hunks.reduce(function (s, h) { return s + h.lines.filter(function (l) { return l.kind === 'del' }).length }, 0)
    const badgeClass = statusBadgeClass(file.status)

    // In the single table the two code columns are deliberately unspecified:
    // under `table-layout: fixed` they split whatever the gutters leave, in
    // equal halves. `min-width` keeps each half wide enough for the file's
    // longest line when wrapping is off; wrap mode drops the floor entirely.
    const columns = []
    for (let ci = 0; ci < SPLIT_COL_COUNT; ci++) {
      const narrow = ci === 1 || ci === 4
      const gutter = ci === 0 || ci === 3
      columns.push(React.createElement('col', {
        key: ci,
        style: narrow ? { width: 13 } : gutter ? { width: 44 } : null,
      }))
    }
    // `ch` is the monospace advance, so the content half needs no pixel
    // measuring; the +1ch covers rounding, the px half the gutters and padding.
    const minWidth = 'calc(' + (2 * (splitContentWidth(file) + 1)) + 'ch + '
      + (2 * SPLIT_SIDE_PX) + 'px)'
    // One pane is half the pair, so its floor is one side's worth of the same
    // widest line — identical on both sides, which is what keeps the mirrored
    // scrollLeft column-aligned.
    const paneMinWidth = 'calc(' + (splitContentWidth(file) + 1) + 'ch + ' + SPLIT_SIDE_PX + 'px)'

    const descriptors = diffRowDescriptors(file)
    const rows = descriptors.map(function (row, index) {
      if (row.kind === 'hunk') {
        return React.createElement('tr', { key: index, className: 'dg-diff-hunk' },
          React.createElement('td', { colSpan: SPLIT_COL_COUNT }, row.text))
      }
      const cells = splitCells(row.left, 'left', row.contextual ? 'ctx' : 'del')
        .concat(splitCells(row.right, 'right', row.contextual ? 'ctx' : 'add', ' dg-ds-div'))
      return React.createElement('tr', { key: index, className: 'dg-diff-row' }, cells)
    })

    // The header carries the ± totals; without it (caller already shows them)
    // the footer only reports how many separate edits the block contains.
    const footer = showHeader
      ? React.createElement('div', { className: 'dg-diff-footer' },
          React.createElement('span', null, file.hunks.length + ' hunk' + (file.hunks.length > 1 ? 's' : '')),
          React.createElement('span', null, '+' + totalAdd + ' −' + totalDel))
      : (file.hunks.length > 1
          ? React.createElement('div', { className: 'dg-diff-footer' },
              React.createElement('span', null, '共 ' + file.hunks.length + ' 处修改'))
          : null)

    const body = panes
      ? React.createElement(SplitPanes, { rows: descriptors, minWidth: paneMinWidth })
      : React.createElement('div', { className: 'dg-diff-scroll' },
          React.createElement('table', {
            className: 'dg-diff-table dg-diff-split' + (wrap ? ' dg-diff-wrap' : ''),
            style: wrap ? null : { minWidth },
          },
            React.createElement('colgroup', null, columns),
            React.createElement('tbody', null, rows)))

    return React.createElement('div', { key: file.path + fi, className: 'dg-diff-viewer' },
      showHeader ? React.createElement('div', { className: 'dg-diff-file-header' },
        React.createElement('span', { className: 'dg-file-badge ' + badgeClass }, file.status),
        React.createElement('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, file.path),
        React.createElement('span', { style: { fontWeight: 400, fontSize: 11, color: 'var(--dsw-alias-label-caption,#888)' } },
          React.createElement('span', { className: 'dg-add' }, '+' + totalAdd),
          ' ',
          React.createElement('span', { className: 'dg-del' }, '−' + totalDel))) : null,
      body,
      footer)
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
  const selected = props.selected
  return React.createElement('div', {
    className: 'dg-file-item' + (selected ? ' dg-file-item-selected' : ''),
    onClick: props.onClick,
    title: path,
  },
    React.createElement('span', { className: 'dg-file-badge ' + statusBadgeClass(badge) }, badge),
    React.createElement('span', { className: 'dg-file-name' }, path))
}

/* ── Hover diff popover (official 「本轮文件改动」 chips) ────────────
 *
 * The official `ui-deliverables` row owns `conversation.chat.turnTail` (a
 * single-winner chain slot) and is left exactly as shipped. This plugin adds
 * NO chain entry: it only watches pointer events on that row's chips
 * (`[data-produced-files-row] button`) and raises a diff popover from its own
 * `shell.overlay` seat.
 *
 * Chip → fact mapping is read from the official DOM contract:
 *   - the chip's `title` carries the produced path;
 *   - the turn number comes from the enclosing `[data-turn-tail]` wrapper,
 *     falling back to the chat seat's `[data-chat-turn]` — a tool-only turn
 *     (`closing === null`) renders the produced row WITHOUT the former;
 *   - the viewed session id comes from `state.sessionId` (the header button
 *     captures it for the whole plugin).
 *
 * The per-file diff is fetched once per session+turn (`dshGit/turnDiff`) and
 * cached for the page's lifetime; a turn's recorded diffs never change after
 * it is finalized.
 */

/** Delay before a hovered chip raises its popover (filters pass-over). */
const HOVER_OPEN_DELAY_MS = 140
/** Grace period after leaving a chip/popover, so moving between them is seamless. */
const HOVER_CLOSE_DELAY_MS = 180
/** Widest popover, in px (clamped to the viewport). The two code panes sit side
 * by side, so the popover spans nearly the whole window rather than the chat
 * column: a narrow popover halves each pane and clips real code. */
const POPOVER_MAX_WIDTH = 1180
/** Viewport gutter kept clear on either side of the popover, in px. */
const POPOVER_VIEWPORT_MARGIN = 32
/** Vertical room below the chip that keeps the popover below it. */
const POPOVER_MIN_SPACE_BELOW = 260
/** Tallest popover, in px. */
const POPOVER_MAX_HEIGHT = 560
/** Marks the popover so the hover delegation leaves its own events alone. */
const POPOVER_ATTR = 'hover-diff'
/** Fallback attribute holding a chip's path while its native tooltip is muted. */
const CHIP_PATH_ATTR = 'data-dsh-git-path'

const hoverListeners = new Set()
/** Active popover target, or null when nothing is open. */
let hoverActive = null
let openTimer = null
let closeTimer = null
/** The chip whose `title` is temporarily muted (its popover already shows the path). */
let mutedChip = null

function hoverEmit() {
  for (const fn of hoverListeners) fn()
}

function subscribeHover(fn) {
  hoverListeners.add(fn)
  return () => hoverListeners.delete(fn)
}

function useHover() {
  const [, force] = React.useState(0)
  React.useEffect(() => subscribeHover(() => force((value) => value + 1)), [])
  return hoverActive
}

function setHover(next) {
  hoverActive = next
  hoverEmit()
}

/** Last path segment; used to match a chip against the host's recorded diff entries. */
function baseName(path) {
  const index = path.lastIndexOf('/')
  return index === -1 ? path : path.slice(index + 1)
}

/**
 * Mute the hovered chip's native tooltip while its popover is open: the
 * popover head already prints the full path, and the browser's own tooltip
 * would otherwise pop over the diff a second later. The path is moved to a
 * fallback data attribute so the same chip is still recognized when the
 * pointer leaves and comes back.
 */
function muteChipTitle(chip) {
  if (mutedChip === chip) return
  restoreChipTitle()
  const title = chip.getAttribute('title')
  if (title === null) return
  chip.setAttribute(CHIP_PATH_ATTR, title)
  chip.removeAttribute('title')
  mutedChip = chip
}

function restoreChipTitle() {
  if (mutedChip !== null) {
    const path = mutedChip.getAttribute(CHIP_PATH_ATTR)
    if (path !== null && mutedChip.isConnected) {
      mutedChip.setAttribute('title', path)
      mutedChip.removeAttribute(CHIP_PATH_ATTR)
    }
  }
  mutedChip = null
}

/** The produced-file chips in the official row can open a diff from cache. */
const turnDiffCache = new Map()

function loadTurnDiff(sessionId, turn) {
  const key = sessionId + '\0' + turn
  let pending = turnDiffCache.get(key)
  if (pending === undefined) {
    pending = callRemote('dshGit/turnDiff', { sessionId, turn }).catch((error) => {
      turnDiffCache.delete(key) // a failed probe may be retried on the next hover
      throw error
    })
    turnDiffCache.set(key, pending)
  }
  return pending
}

/** Split a hunk side into its lines (a trailing newline terminates, not adds). */
function splitTextLines(text) {
  if (text == null || text === '') return []
  return (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n')
}

/**
 * Convert one host-side file record (`hunks: [{ oldText, newText, oldStart?,
 * newStart? }]`) into the `FileDiff` shape `DiffViewer` consumes: each hunk
 * becomes "every old line, then every new line", which `splitRows` pairs
 * left/right.
 *
 * The host anchors each hunk in the file on disk and stamps `oldStart`/
 * `newStart`, so the gutter shows REAL file line numbers (each side of a hunk is
 * one contiguous run of its file version, so numbering from the start is
 * enough). Without an anchor — unreadable file, or a later edit to the same
 * lines — the gutter stays blank rather than inventing a position: a hunk-local
 * 1..N sequence reads as real line numbers and points at the wrong place.
 */
function fileDiffFromHunks(path, hunks) {
  const list = Array.isArray(hunks) ? hunks : []
  const parts = []
  for (const hunk of list) {
    const oldLines = splitTextLines(hunk.oldText)
    const newLines = splitTextLines(hunk.newText)
    const oldStart = Number.isInteger(hunk.oldStart) ? hunk.oldStart : null
    const newStart = Number.isInteger(hunk.newStart) ? hunk.newStart : null
    const lines = []
    for (let k = 0; k < oldLines.length; k++) {
      lines.push({ kind: 'del', oldNum: oldStart === null ? null : oldStart + k, newNum: null, text: oldLines[k] })
    }
    for (let k = 0; k < newLines.length; k++) {
      lines.push({ kind: 'add', oldNum: null, newNum: newStart === null ? null : newStart + k, text: newLines[k] })
    }
    parts.push({ header: '', context: '', lines })
  }
  const creates = list.length > 0 && list.every((hunk) => hunk.oldText == null)
  const deletes = !creates && list.length > 0 && list.every((hunk) => hunk.newText == null || hunk.newText === '')
  return { path, status: creates ? 'A' : deletes ? 'D' : 'M', hunks: parts }
}

/** `{ add, del }` totals of one prepared `FileDiff`. */
function diffStats(file) {
  let add = 0
  let del = 0
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.kind === 'add') add++
      else if (line.kind === 'del') del++
    }
  }
  return { add, del }
}

/**
 * Resolve the hovered chip from a pointer event, or null when the pointer is
 * not on a produced-file chip (or is inside the plugin's own popover).
 */
function chipTarget(event) {
  const node = event.target
  if (node === null || node === undefined || typeof node.closest !== 'function') return null
  if (node.closest('[data-dsh-git="' + POPOVER_ATTR + '"]') !== null) return null
  const chip = node.closest('[data-produced-files-row] button')
  if (chip === null) return null
  const path = chip.getAttribute('title') || chip.getAttribute(CHIP_PATH_ATTR)
  if (path === null || path === '') return null
  // Prefer the turn-tail wrapper; a tool-only turn (closing === null) renders
  // the produced row through a bare div instead, so fall back to the chat seat.
  const tail = chip.closest('[data-turn-tail]')
  let rawTurn = tail === null ? null : tail.getAttribute('data-turn-tail')
  if (rawTurn === null || rawTurn === '') {
    const seat = chip.closest('[data-chat-turn]')
    rawTurn = seat === null ? null : seat.getAttribute('data-chat-turn')
  }
  const turn = rawTurn === null || rawTurn === '' || !Number.isFinite(Number(rawTurn)) ? null : Number(rawTurn)
  const rect = chip.getBoundingClientRect()
  return {
    chip,
    path,
    turn,
    rect: { left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width },
  }
}

function sameTarget(active, target) {
  return active !== null
    && active.path === target.path
    && active.turn === target.turn
    && active.rect.left === target.rect.left
    && active.rect.top === target.rect.top
}

/**
 * Open (or refresh) the popover for one chip, then resolve that file's diff.
 * The host records write/edit results per turn, so one fetch covers every chip
 * of the same turn.
 */
function openPopover(target) {
  muteChipTitle(target.chip)
  const sessionId = state.sessionId
  const next = {
    path: target.path,
    turn: target.turn,
    rect: target.rect,
    sessionId,
    status: 'loading',
    file: null,
    error: null,
  }
  setHover(next)
  if (sessionId == null || target.turn === null) {
    setHover({
      ...next,
      status: 'unavailable',
      error: sessionId == null ? '未定位到当前会话' : '未定位到该回合',
    })
    return
  }
  loadTurnDiff(sessionId, target.turn).then((result) => {
    if (hoverActive === null || hoverActive.path !== target.path || hoverActive.turn !== target.turn) return
    const files = result && Array.isArray(result.files) ? result.files : []
    const match = files.find((file) => file && file.path === target.path)
      ?? files.find((file) => file && baseName(file.path) === baseName(target.path))
    if (match === undefined) {
      setHover({ ...hoverActive, status: 'empty' })
      return
    }
    setHover({ ...hoverActive, status: 'ready', file: fileDiffFromHunks(match.path, match.hunks) })
  }).catch((error) => {
    if (hoverActive === null || hoverActive.path !== target.path || hoverActive.turn !== target.turn) return
    setHover({ ...hoverActive, status: 'error', error: String((error && error.message) || error) })
  })
}

function cancelHoverOpen() {
  if (openTimer !== null) {
    clearTimeout(openTimer)
    openTimer = null
  }
}

function cancelHoverClose() {
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function scheduleHoverClose(delay) {
  cancelHoverOpen()
  cancelHoverClose()
  closeTimer = setTimeout(() => {
    closeTimer = null
    setHover(null)
    restoreChipTitle()
  }, delay)
}

function scheduleHoverOpen(target) {
  cancelHoverOpen()
  cancelHoverClose()
  openTimer = setTimeout(() => {
    openTimer = null
    openPopover(target)
  }, HOVER_OPEN_DELAY_MS)
}

function onHoverOver(event) {
  if (event.target !== null && event.target !== undefined
    && typeof event.target.closest === 'function'
    && event.target.closest('[data-dsh-git="' + POPOVER_ATTR + '"]') !== null) {
    cancelHoverClose()
    return
  }
  const target = chipTarget(event)
  if (target === null) {
    // Leaving a chip for anywhere but the popover closes it after the grace
    // period. Schedule at most one pending close: pointer movement keeps firing
    // `mouseover` on child elements, and re-arming the timer on each one would
    // let the popover live as long as the cursor keeps moving.
    if (hoverActive !== null && closeTimer === null) scheduleHoverClose(HOVER_CLOSE_DELAY_MS)
    return
  }
  if (sameTarget(hoverActive, target)) {
    cancelHoverClose()
    return
  }
  scheduleHoverOpen(target)
}

/** Closing immediately when the pointer leaves the window (no element to enter). */
function onHoverOut(event) {
  if (event.relatedTarget === null && hoverActive !== null) scheduleHoverClose(0)
}

/** Any scroll that is not the popover's own moves the chip away; drop it. */
function onHoverScroll(event) {
  const node = event.target
  if (node !== null && node !== undefined && typeof node.closest === 'function'
    && node.closest('[data-dsh-git="' + POPOVER_ATTR + '"]') !== null) return
  if (hoverActive !== null) scheduleHoverClose(0)
}

function onHoverResize() {
  if (hoverActive !== null) scheduleHoverClose(0)
}

function onHoverKey(event) {
  if (event.key === 'Escape' && hoverActive !== null) scheduleHoverClose(0)
}

/** Install the delegated hover plumbing; returns its disposer. */
function installHoverListeners() {
  if (typeof document === 'undefined') return () => undefined
  document.addEventListener('mouseover', onHoverOver, true)
  document.addEventListener('mouseout', onHoverOut, true)
  document.addEventListener('keydown', onHoverKey, true)
  window.addEventListener('scroll', onHoverScroll, true)
  window.addEventListener('resize', onHoverResize, true)
  return () => {
    document.removeEventListener('mouseover', onHoverOver, true)
    document.removeEventListener('mouseout', onHoverOut, true)
    document.removeEventListener('keydown', onHoverKey, true)
    window.removeEventListener('scroll', onHoverScroll, true)
    window.removeEventListener('resize', onHoverResize, true)
    cancelHoverOpen()
    cancelHoverClose()
    restoreChipTitle()
    hoverActive = null
    hoverEmit()
  }
}

/**
 * Viewport-aware fixed placement: below the chip, or above when there is no
 * room. The popover is intentionally as wide as the window allows (it may
 * cover a side panel) so both code panes get real width; it is only clamped
 * back inside the viewport.
 */
function popoverStyle(rect) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const width = Math.max(360, Math.min(POPOVER_MAX_WIDTH, viewportWidth - POPOVER_VIEWPORT_MARGIN))
  const left = Math.max(POPOVER_VIEWPORT_MARGIN / 2, Math.min(rect.left, viewportWidth - width - POPOVER_VIEWPORT_MARGIN / 2))
  const spaceBelow = viewportHeight - rect.bottom - 16
  const spaceAbove = rect.top - 16
  const below = spaceBelow >= POPOVER_MIN_SPACE_BELOW || spaceBelow >= spaceAbove
  const style = {
    left,
    width,
    maxHeight: Math.max(180, Math.min(below ? spaceBelow : spaceAbove, POPOVER_MAX_HEIGHT)),
  }
  if (below) style.top = rect.bottom + 10
  else style.bottom = viewportHeight - rect.top + 10
  return style
}

/**
 * The one popover instance, mounted in `shell.overlay`. Renders nothing while
 * no chip is hovered.
 *
 * The body offers both ways to read a wide diff, and the choice sticks across
 * hovers: `wrap` (default) folds long lines inside their own pane so both sides
 * are visible at once, while the toggle swaps in the table's `min-width` floor
 * and pans the pair with an always-visible horizontal scrollbar.
 */
function DiffHoverPopover() {
  const active = useHover()
  const [wrap, setWrap] = React.useState(true)
  if (active === null) return null
  if (typeof window === 'undefined') return null
  const file = active.file
  const stats = file === null ? null : diffStats(file)
  return React.createElement('div', {
    className: 'dg-diff-pop',
    'data-dsh-git': POPOVER_ATTR,
    style: popoverStyle(active.rect),
    onMouseEnter: cancelHoverClose,
    onMouseLeave: () => scheduleHoverClose(HOVER_CLOSE_DELAY_MS),
  },
    React.createElement('div', { className: 'dg-diff-pop-head' },
      file !== null ? React.createElement('span', { className: 'dg-file-badge ' + statusBadgeClass(file.status) }, file.status) : null,
      React.createElement('span', { className: 'dg-diff-pop-path', title: active.path }, active.path),
      active.turn !== null ? React.createElement('span', { className: 'dg-diff-pop-turn' }, 'turn ' + active.turn) : null,
      stats !== null ? React.createElement('span', { className: 'dg-diff-pop-stat' },
        React.createElement('span', { className: 'dg-add' }, '+' + stats.add), ' ',
        React.createElement('span', { className: 'dg-del' }, '−' + stats.del)) : null,
      file !== null ? React.createElement('button', {
        type: 'button',
        className: 'dg-diff-pop-toggle',
        title: wrap
          ? '当前：长行折行显示（左右都看得全）。点击改为左右各自横向滚动（两侧联动）。'
          : '当前：左右各自横向滚动（滚动其中一侧，另一侧跟着滚）。点击改为折行显示。',
        onClick: () => setWrap((value) => !value),
      }, wrap ? '⇄ 滚动' : '↵ 折行') : null),
    React.createElement('div', { className: 'dg-diff-pop-body' },
      active.status === 'loading'
        ? React.createElement('div', { className: 'dg-loading' },
            React.createElement('div', { className: 'dg-spinner' }),
            '读取改动…')
        : null,
      active.status === 'ready' && file !== null
        ? React.createElement(DiffViewer, { files: [file], hideHeader: true, wrap, panes: !wrap })
        : null,
      active.status === 'empty'
        ? React.createElement('div', { className: 'dg-empty' },
            React.createElement('div', { className: 'dg-empty-icon' }, '📄'),
            React.createElement('div', null, '该回合没有记录这个文件的改动'))
        : null,
      active.status === 'unavailable' || active.status === 'error'
        ? React.createElement('div', { className: 'dg-err' }, active.error || '读取改动失败')
        : null))
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
          t.files.map((f) => React.createElement(DiffViewer, {
            key: f.path,
            files: [fileDiffFromHunks(f.path, f.hunks)],
          }))) : null)
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

exports.inject = ['slots', 'connection']

exports.apply = function apply(ctx) {
  rootCtx = ctx
  const slots = ctx.get === undefined ? ctx.slots : (ctx.get('slots') ?? ctx.slots)
  rootSlots = slots
  if (slots === undefined) return

  ctx.effect(() => {
    mountCss()
    /**
     * Chat surfaces are read-only from here on: the official ui-deliverables
     * entry owns `conversation.chat.turnTail`, and no dsh-git entry competes
     * for it (nor for `conversation.chat.assistant-actions`). The per-turn
     * diff lives in a hover popover raised from `shell.overlay` instead — see
     * `installHoverListeners` / `DiffHoverPopover`.
     */
    const disposeHover = installHoverListeners()
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
    // List slot: additive, so the panel and the popover coexist. The popover is
    // a bare fixed layer (it renders nothing until a chip is hovered) and waits
    // its turn behind the panel in paint order while staying above it.
    const disposePopover = slots.inject('shell.overlay', () =>
      slots.register({
        name: 'shell.overlay',
        id: 'dsh-git-diff-hover',
        order: 90,
      }, DiffHoverPopover))
    return () => {
      disposeHover()
      disposeHeader()
      disposePanel()
      disposePopover()
      rootCtx = null
      rootSlots = null
      setState({ open: false, sessionId: null })
    }
  }, 'dsh-git client')
}
