import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { FALLBACK_PNPM_VERSION } from './constants.mjs'

/**
 * The two things that reach outside the directory this package just created:
 * installing dependencies, and starting a git history.
 *
 * Both are opt-in, both are allowed to fail without failing the scaffold — the site
 * on disk is already complete and correct — and both report what happened so the
 * summary can say so. A scaffolder that exits non-zero because the caller has no
 * network, or no `git config user.email`, has thrown away a perfectly good result.
 *
 * Every function takes the `spawn` it should use, defaulting to the real one. That is
 * the only seam a test needs: what is worth asserting here is the decision made from
 * an exit status, not the exit status of a real `git commit`.
 */

function run(spawn, command, args, cwd, stdio) {
  return spawn(command, args, {
    cwd,
    stdio,
    // Windows resolves `npm`/`pnpm`/`git` through `.cmd` shims, which only a shell
    // finds. `shell: true` on POSIX would additionally reinterpret the arguments.
    shell: process.platform === 'win32'
  })
}

/**
 * The caller's own pnpm version, for the generated CI workflow.
 *
 * `pnpm/action-setup` refuses to run without a version, and a literal chosen here
 * would drift from the lock file the caller is about to commit. Detection failing is
 * not an error: it means the package manager was named by a flag on a machine that
 * does not have it, and the fallback is used.
 */
export function detectPnpmVersion(spawn = spawnSync) {
  const result = spawn('pnpm', ['--version'], {
    encoding: 'utf8',
    shell: process.platform === 'win32'
  })

  if (result.error || result.status !== 0) return FALLBACK_PNPM_VERSION

  const version = String(result.stdout ?? '').trim()
  return /^\d+\.\d+\.\d+$/.test(version) ? version : FALLBACK_PNPM_VERSION
}

export function installDependencies(dir, packageManager, spawn = spawnSync) {
  const result = run(spawn, packageManager, ['install'], dir, 'inherit')

  if (result.error) {
    return {
      ok: false,
      reason: `${packageManager} could not be run (${result.error.code ?? 'unknown'})`
    }
  }
  if (result.status !== 0) {
    return {
      ok: false,
      reason: `${packageManager} install exited with code ${result.status}`
    }
  }
  return { ok: true }
}

const COMMIT_MESSAGE = 'chore: scaffold the blog'

/**
 * `git init` plus a first commit.
 *
 * The branch name is spelled out because `init.defaultBranch` is a global setting, and
 * a scaffold that lands on `master` on one machine and `main` on another makes the
 * generated Pages workflow — which triggers on `main` — wrong half the time.
 */
export function initGit(dir, options = {}) {
  const { branch = 'main', spawn = spawnSync } = options

  const init = run(spawn, 'git', ['init', '-b', branch], dir, 'pipe')

  if (init.error) {
    return { ok: false, initialised: false, reason: 'git is not installed' }
  }

  if (init.status !== 0) {
    // `-b` needs git 2.28; older versions still initialise, just on their own branch.
    const fallback = run(spawn, 'git', ['init'], dir, 'pipe')
    if (fallback.error || fallback.status !== 0) {
      return { ok: false, initialised: false, reason: 'git init failed' }
    }
    run(spawn, 'git', ['checkout', '-b', branch], dir, 'pipe')
  }

  const add = run(spawn, 'git', ['add', '-A'], dir, 'pipe')
  if (add.error || add.status !== 0) {
    return { ok: false, initialised: true, reason: 'git add failed' }
  }

  const commit = run(
    spawn,
    'git',
    ['commit', '-m', COMMIT_MESSAGE],
    dir,
    'pipe'
  )
  if (commit.error || commit.status !== 0) {
    // The common case by far: no `user.email` configured. The repository is still
    // initialised and staged, which is the part that saves work.
    return {
      ok: false,
      initialised: true,
      reason: 'the first commit failed — set git user.name and user.email'
    }
  }

  return { ok: true, initialised: true }
}
