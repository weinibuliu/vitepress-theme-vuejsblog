import process from 'node:process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { manifest, run } from '../../cli/index.mjs'

/**
 * The command dispatcher.
 *
 * What matters at this level is only which command a set of words selects, and what a
 * word that is not a command does. The scaffold `init` performs is tested through
 * `scaffold` and `collectAnswers`, so these tests stop at the boundary: help and
 * version write to the stdout they are handed and never prompt, and an unknown command
 * is refused rather than treated as a directory.
 */

/** A stdout stand-in that keeps what was written instead of printing it. */
function recorder() {
  const chunks = []
  return {
    stdout: { write: (text) => chunks.push(text) },
    output: () => chunks.join('')
  }
}

const previousExitCode = process.exitCode

afterEach(() => {
  process.exitCode = previousExitCode
  vi.restoreAllMocks()
})

describe('run', () => {
  it('prints the programme help when no command was given', async () => {
    const { stdout, output } = recorder()

    const result = await run([], { stdout })

    expect(result).toEqual({ ok: true, help: true })
    expect(output()).toContain('init [directory]')
  })

  it('treats --help and --version as the programme’s own', async () => {
    const help = recorder()
    await run(['--help'], { stdout: help.stdout })
    expect(help.output()).toContain('Commands')

    const version = recorder()
    const result = await run(['--version'], { stdout: version.stdout })
    expect(result).toEqual({ ok: true, version: true })
    expect(version.output()).toBe(`${manifest.version}\n`)
  })

  it('hands init its own help rather than the programme’s', async () => {
    const { stdout, output } = recorder()

    const result = await run(['init', '--help'], { stdout })

    expect(result).toEqual({ ok: true, help: true })
    expect(output()).toContain('init [directory] [options]')
    expect(output()).toContain('--package-manager')
  })

  it('refuses a word that is not a command instead of scaffolding it', async () => {
    // The old interface took the directory as the first word. It no longer does, and
    // silently treating `my-blog` as a directory would be the one compatibility that
    // matters — it would scaffold where the caller did not ask.
    const { stdout } = recorder()
    // The refusal is printed by @clack, on the real stream; silenced so the suite's
    // output stays the suite's.
    vi.spyOn(process.stdout, 'write').mockReturnValue(true)

    const result = await run(['my-blog'], { stdout })

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Unknown command "my-blog"')
  })
})
