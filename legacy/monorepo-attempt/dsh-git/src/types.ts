/**
 * Public boundary types for the dsh-git Remote service. Kept on a dedicated
 * `./types` subpath (mirrors @deepseek-ai/dsh-message-feedback) because the
 * typert analyzer requires @Remote boundary types to be exported from a
 * public non-root type subpath.
 * @module dsh-git/types
 */

import type { SessionId } from '@deepseek-ai/dsh-session/types'

export interface StatusResult {
  branch: string
  ahead: number
  behind: number
  staged: readonly string[]
  unstaged: readonly string[]
  untracked: readonly string[]
  cwd: string
}

export interface DiffArgs {
  sessionId: SessionId
  staged?: boolean
  path?: string
}

export interface DiffResult {
  diff: string
}

export interface CommitArgs {
  sessionId: SessionId
  message: string
}

export interface CommitResult {
  output: string
}

export interface ReadArgs {
  sessionId: SessionId
  path: string
}

export interface ReadResult {
  text: string
}
