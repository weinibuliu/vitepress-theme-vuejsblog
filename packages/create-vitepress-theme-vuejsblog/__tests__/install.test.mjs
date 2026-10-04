import { describe, expect, it } from 'vitest'
import {
  detectPnpmVersion,
  initGit,
  installDependencies
} from '../src/install.mjs'
import { FALLBACK_PNPM_VERSION } from '../src/constants.mjs'

/**
 * A fake `spawnSync` that answers in order and remembers what it was asked to do.
 *
 * The interesting behaviour is all in the branch taken after a status comes back —
 * "did a missing pnpm become a fallback version", "did a failed commit leave the
 * repository initialised" — so the test supplies statuses and reads the transcript.
 */
function fakeSpawn(results) {
  const calls = []
  const spawn = (command, args, options) => {
    calls.push({ command, args, options })
    return (
      results[Math.min(calls.length - 1, results.length - 1)] ?? { status: 0 }
    )
  }
  return { spawn, calls }
}

describe('detectPnpmVersion', () => {
  it('reads the version pnpm reports', () => {
    const { spawn } = fakeSpawn([{ status: 0, stdout: '9.15.0\n' }])
    expect(detectPnpmVersion(spawn)).toBe('9.15.0')
  })

  it('falls back when pnpm is missing', () => {
    const { spawn } = fakeSpawn([{ error: { code: 'ENOENT' } }])
    expect(detectPnpmVersion(spawn)).toBe(FALLBACK_PNPM_VERSION)
  })

  it('falls back on a failed run or an answer that is not a version', () => {
    expect(detectPnpmVersion(fakeSpawn([{ status: 1 }]).spawn)).toBe(
      FALLBACK_PNPM_VERSION
    )
    expect(
      detectPnpmVersion(fakeSpawn([{ status: 0, stdout: 'v9\n' }]).spawn)
    ).toBe(FALLBACK_PNPM_VERSION)
  })
})

describe('installDependencies', () => {
  it('runs the package manager the Site was written for', () => {
    const { spawn, calls } = fakeSpawn([{ status: 0 }])

    expect(installDependencies('/site', 'pnpm', spawn)).toEqual({ ok: true })
    expect(calls[0].command).toBe('pnpm')
    expect(calls[0].args).toEqual(['install'])
    expect(calls[0].options.cwd).toBe('/site')
  })

  it('reports a failure rather than throwing, so the scaffold still stands', () => {
    expect(
      installDependencies('/site', 'npm', fakeSpawn([{ status: 1 }]).spawn)
    ).toEqual({
      ok: false,
      reason: 'npm install exited with code 1'
    })

    const missing = installDependencies(
      '/site',
      'npm',
      fakeSpawn([{ error: { code: 'ENOENT' } }]).spawn
    )
    expect(missing.ok).toBe(false)
    expect(missing.reason).toContain('ENOENT')
  })
})

describe('initGit', () => {
  it('initialises on main, stages everything, and commits', () => {
    const { spawn, calls } = fakeSpawn([{ status: 0 }])

    expect(initGit('/site', { spawn })).toEqual({ ok: true, initialised: true })
    expect(calls.map((call) => call.args)).toEqual([
      ['init', '-b', 'main'],
      ['add', '-A'],
      ['commit', '-m', 'chore: scaffold the blog']
    ])
  })

  it('still initialises on a git too old for -b', () => {
    const { spawn, calls } = fakeSpawn([{ status: 129 }, { status: 0 }])

    expect(initGit('/site', { spawn }).ok).toBe(true)
    expect(calls.map((call) => call.args)).toEqual([
      ['init', '-b', 'main'],
      ['init'],
      ['checkout', '-b', 'main'],
      ['add', '-A'],
      ['commit', '-m', 'chore: scaffold the blog']
    ])
  })

  it('reports a missing git', () => {
    const { spawn } = fakeSpawn([{ error: { code: 'ENOENT' } }])
    expect(initGit('/site', { spawn })).toEqual({
      ok: false,
      initialised: false,
      reason: 'git is not installed'
    })
  })

  it('says the repository survived a failed first commit', () => {
    // The usual cause is an unset user.email. The work is not lost, and the summary
    // should say so rather than implying the whole step failed.
    const { spawn } = fakeSpawn([{ status: 0 }, { status: 0 }, { status: 1 }])

    const result = initGit('/site', { spawn })
    expect(result.ok).toBe(false)
    expect(result.initialised).toBe(true)
    expect(result.reason).toContain('user.name')
  })
})
