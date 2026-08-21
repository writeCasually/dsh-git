return {
  apply(ctx) {
    async function runGit(cwd, args) {
      const sub = ctx.get('subprocess')
      if (sub === undefined) return { error: 'subprocess service unavailable' }
      const handle = sub.spawn({
        argv: ['git', ...args],
        cwd,
        stdio: {
          stdin: 'ignore',
          stdout: { maxBytes: 2 * 1024 * 1024 },
          stderr: { maxBytes: 256 * 1024 },
        },
        graceMs: 10000,
      })
      const outcome = await handle.done
      const out = handle.collected.stdout ? handle.collected.stdout.readFrom(0).text : ''
      const err = handle.collected.stderr ? handle.collected.stderr.readFrom(0).text : ''
      if (outcome.exitCode !== 0) {
        return { error: 'git ' + args[0] + ' failed (' + outcome.exitCode + '): ' + err.slice(0, 500) }
      }
      return { out }
    }

    async function loadSession(sessionId) {
      const sq = ctx.get('sessionQuery')
      if (sq === undefined) return { error: 'sessionQuery service unavailable' }
      try {
        return { snap: await sq.readSession(sessionId) }
      } catch (e) {
        return { error: String((e && e.message) || e) }
      }
    }

    async function cwdOf(args) {
      const sessionId = args && args.sessionId
      if (typeof sessionId !== 'string') return { error: 'sessionId required' }
      const loaded = await loadSession(sessionId)
      if (loaded.error || !loaded.snap) return loaded
      const cwd = loaded.snap.session.cwd
      if (typeof cwd !== 'string') return { error: 'session has no cwd' }
      return { cwd }
    }

    function parseStatus(out) {
      const lines = out.split('\n').filter((l) => l.length > 0)
      const branchLine = lines.find((l) => l.indexOf('## ') === 0) || ''
      const branch = branchLine.length > 3 ? branchLine.slice(3).split(' ')[0] : '(detached)'
      let ahead = 0
      let behind = 0
      const br = branchLine.indexOf('[')
      if (br >= 0) {
        const seg = branchLine.slice(br)
        const ai = seg.indexOf('ahead ')
        if (ai >= 0) ahead = parseInt(seg.slice(ai + 6), 10) || 0
        const bi = seg.indexOf('behind ')
        if (bi >= 0) behind = parseInt(seg.slice(bi + 7), 10) || 0
      }
      const staged = []
      const unstaged = []
      const untracked = []
      for (const l of lines) {
        if (l.indexOf('## ') === 0) continue
        const code = l.slice(0, 2)
        const path = l.slice(3)
        if (code === '??') {
          untracked.push(path)
        } else {
          if (code[0] !== ' ' && code[0] !== '?') staged.push(path)
          if (code[1] !== ' ' && code[1] !== '?') unstaged.push(path)
        }
      }
      return { branch, ahead, behind, staged, unstaged, untracked }
    }

    harness.handle('p0.status', async (args) => {
      try {
        const got = await cwdOf(args)
        if (got.error || !got.cwd) return got
        const res = await runGit(got.cwd, ['status', '--porcelain=v1', '-b'])
        if (res.error) return { error: res.error, cwd: got.cwd }
        return Object.assign({ cwd: got.cwd }, parseStatus(res.out))
      } catch (e) {
        return { error: String((e && e.message) || e) }
      }
    })

    harness.handle('p0.diff', async (args) => {
      try {
        const got = await cwdOf(args)
        if (got.error || !got.cwd) return got
        const argv = ['diff', '--no-color']
        if (args && args.staged) argv.push('--cached')
        const path = args && args.path
        if (typeof path === 'string' && path.length > 0) argv.push('--', path)
        const res = await runGit(got.cwd, argv)
        if (res.error) return res
        return { diff: res.out }
      } catch (e) {
        return { error: String((e && e.message) || e) }
      }
    })

    harness.handle('p0.readfile', async (args) => {
      try {
        const got = await cwdOf(args)
        if (got.error || !got.cwd) return got
        const path = args && args.path
        if (typeof path !== 'string' || path.length === 0) return { error: 'path required' }
        const fs = ctx.get('fs')
        if (fs === undefined) return { error: 'fs service unavailable' }
        const target = await fs.resolve(path, { cwd: got.cwd })
        const text = await fs.readText(target)
        return { text: text.slice(0, 60000) }
      } catch (e) {
        return { error: String((e && e.message) || e) }
      }
    })

    harness.handle('p0.commit', async (args) => {
      try {
        const got = await cwdOf(args)
        if (got.error || !got.cwd) return got
        const message = args && args.message
        if (typeof message !== 'string' || message.trim().length === 0) return { error: 'commit message required' }
        const add = await runGit(got.cwd, ['add', '-A'])
        if (add.error) return add
        const res = await runGit(got.cwd, ['commit', '-m', message])
        if (res.error) return res
        return { ok: true, output: res.out }
      } catch (e) {
        return { error: String((e && e.message) || e) }
      }
    })
  },
}