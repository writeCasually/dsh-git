/**
 * Remote face + envelope helpers for the dsh-git host service. The generated
 * `remote.dshGit` (from dsh-git/remote) matches these shapes.
 * @module dsh-git-client/client/remote
 */

import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Alias mirroring the generated envelope. */
export type RemoteEnvelope<T> = RemoteResult<T>

export interface StatusResult {
  branch: string
  ahead: number
  behind: number
  staged: readonly string[]
  unstaged: readonly string[]
  untracked: readonly string[]
  cwd: string
}

export interface DiffResult { diff: string }
export interface CommitResult { output: string }
export interface ReadResult { text: string }

/** The dsh-git Remote face as called from the client (matches the generated namespace). */
export interface GitRemote {
  status: (args: { sessionId: SessionId }) => Promise<RemoteResult<StatusResult>>
  diff: (args: { sessionId: SessionId; staged?: boolean; path?: string }) => Promise<RemoteResult<DiffResult>>
  commit: (args: { sessionId: SessionId; message: string }) => Promise<RemoteResult<CommitResult>>
  readFile: (args: { sessionId: SessionId; path: string }) => Promise<RemoteResult<ReadResult>>
}

/** Unwrap one Remote envelope; reject on the `ok: false` branch. */
export async function call<T>(envelope: Promise<RemoteResult<T>> | RemoteResult<T>): Promise<T> {
  const result = await envelope
  if (result.ok) return result.value
  throw new Error(result.error.message ?? result.error.code ?? 'remote call failed')
}
