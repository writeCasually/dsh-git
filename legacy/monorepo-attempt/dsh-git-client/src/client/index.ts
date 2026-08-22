/**
 * dsh-git browser half: session-header Git button plus the overlay panel
 * (变更 / 提交 / 预览). All git work happens in the host GitService; the
 * client only renders and calls the generated `remote.dshGit` face.
 * @module dsh-git-client/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the generated Remote API and ctx.remote merge.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the ui-conversation SlotMap merge (header actions seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the shell overlay seat merge (ui-layout).
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
// Type-only: pulls the generated dshGit remote face + TypertClientRemote merge.
import type {} from 'dsh-git/remote'

import { HeaderButtonView, PanelView, setGitRemote } from './PanelView.tsx'

export { HeaderButtonView, PanelView, setGitRemote } from './PanelView.tsx'
export type { GitRemote } from './PanelView.tsx'

export const inject = ['slots', 'remote', 'remote.dshGit']

/** Register both seats; everything is owned by this Client fiber. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    setGitRemote(ctx.remote.dshGit)
    const disposeHeader = ctx.slots.inject('conversation.session.header.actions', () =>
      ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'dsh-git-toggle',
        order: 30,
        label: 'Git',
      }, HeaderButtonView))
    const disposePanel = ctx.slots.inject('shell.overlay', () =>
      ctx.slots.register({
        name: 'shell.overlay',
        id: 'dsh-git-panel',
        order: 100,
      }, PanelView))
    return () => {
      disposeHeader()
      disposePanel()
      setGitRemote(null)
    }
  })
}
