/**
 * dsh-git host service: git operations over the session workspace, exposed to
 * the web client through the Remote gateway.
 *
 * NOTE (draft for build iteration): the @Remote decoration and RemoteResult
 * envelope shape mirror @deepseek-ai/dsh-message-feedback; verify against the
 * typert build before release.
 * @module @deepseek-ai/dsh-git
 */

import { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
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

/** Parse `git status --porcelain=v1 -b` into grouped file lists. */
function parseStatus(out: string): Omit<StatusResult, 'cwd'> {
  const lines = out.split('\n').filter((line) => line.length > 0)
  const branchLine = lines.find((line) => line.startsWith('## ')) ?? ''
  const branch = branchLine.length > 3 ? branchLine.slice(3).split(' ')[0] : '(detached)'
  let ahead = 0
  let behind = 0
  const bracket = branchLine.indexOf('[')
  if (bracket >= 0) {
    const seg = branchLine.slice(bracket)
    const ai = seg.indexOf('ahead ')
    if (ai >= 0) ahead = Number.parseInt(seg.slice(ai + 6), 10) || 0
    const bi = seg.indexOf('behind ')
    if (bi >= 0) behind = Number.parseInt(seg.slice(bi + 7), 10) || 0
  }
  const staged: string[] = []
  const unstaged: string[] = []
  const untracked: string[] = []
  for (const line of lines) {
    if (line.startsWith('## ')) continue
    const code = line.slice(0, 2)
    const path = line.slice(3)
    if (code === '??') {
      untracked.push(path)
    } else {
      if (code[0] !== ' ' && code[0] !== '?') staged.push(path)
      if (code[1] !== ' ' && code[1] !== '?') unstaged.push(path)
    }
  }
  return { branch, ahead, behind, staged, unstaged, untracked }
}

/** The dsh-git Remote service. Loaded as a host composition row. */
export class GitService extends TypertRemoteService {
  static inject = ['subprocess', 'sessionQuery', 'fs']

  constructor(ctx: Context) {
    super(ctx, 'dshGit')
  }

  /** Resolve the session's workspace directory from its durable header. */
  private async cwdOf(sessionId: SessionId): Promise<string> {
    const snap = await this.ctx.sessionQuery.readSession(sessionId)
    const cwd = snap.session.cwd
    if (typeof cwd !== 'string') throw new Error('session has no cwd')
    return cwd
  }

  /** Run one git command parameterized (never shell-interpreted). */
  private async runGit(cwd: string, argv: string[]): Promise<string> {
    const handle = this.ctx.subprocess.spawn({
      argv: ['git', ...argv],
      cwd,
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes: 2 * 1024 * 1024 },
        stderr: { maxBytes: 256 * 1024 },
      },
      graceMs: 10_000,
    })
    const outcome = await handle.done
    const out = handle.collected.stdout ? handle.collected.stdout.readFrom(0).text : ''
    const err = handle.collected.stderr ? handle.collected.stderr.readFrom(0).text : ''
    if (outcome.exitCode !== 0) {
      throw new Error(`git ${argv[0]} failed (${outcome.exitCode}): ${err.slice(0, 500)}`)
    }
    return out
  }

  @Remote('status')
  async status(args: { sessionId: SessionId }): Promise<StatusResult> {
    const cwd = await this.cwdOf(args.sessionId)
    const out = await this.runGit(cwd, ['status', '--porcelain=v1', '-b'])
    return { ...parseStatus(out), cwd }
  }

  @Remote('diff')
  async diff(args: DiffArgs): Promise<DiffResult> {
    const cwd = await this.cwdOf(args.sessionId)
    const argv = ['diff', '--no-color']
    if (args.staged) argv.push('--cached')
    const path = args.path
    if (typeof path === 'string' && path.length > 0) argv.push('--', path)
    const out = await this.runGit(cwd, argv)
    return { diff: out }
  }

  @Remote('commit')
  async commit(args: CommitArgs): Promise<CommitResult> {
    const message = args.message.trim()
    if (message.length === 0) throw new Error('commit message required')
    const cwd = await this.cwdOf(args.sessionId)
    await this.runGit(cwd, ['add', '-A'])
    const out = await this.runGit(cwd, ['commit', '-m', message])
    return { output: out }
  }

  @Remote('readFile')
  async readFile(args: ReadArgs): Promise<ReadResult> {
    const cwd = await this.cwdOf(args.sessionId)
    const target = await this.ctx.fs.resolve(args.path, { cwd })
    const text = await this.ctx.fs.readText(target)
    return { text: text.slice(0, 60_000) }
  }
}

export default GitService