import { describe, expect, it } from 'vitest'
import { parseArgs } from '../src/args.mjs'
import {
  collectAnswers,
  detectPackageManager,
  packageNameFromDirectory,
  titleFromDirectory
} from '../src/questions.mjs'
import { PACKAGE_MANAGERS } from '../src/constants.mjs'

/**
 * `collectAnswers` is the seam between "what the caller said" and "what the file set
 * is built from", and the tests below are mostly about the second half: that a flag,
 * a prompt and a default all arrive as the same value.
 *
 * Nothing here can prompt — vitest has no TTY — so these are also the tests of the
 * non-interactive path, which is the one CI takes.
 */

const answersFor = (argv) => collectAnswers(parseArgs(argv))

describe('titleFromDirectory', () => {
  it('turns a directory name into something worth putting in a heading', () => {
    expect(titleFromDirectory('my-blog')).toBe('My Blog')
    expect(titleFromDirectory('notes_on_vue')).toBe('Notes On Vue')
    expect(titleFromDirectory('/home/me/Code/the.blog')).toBe('The Blog')
  })

  it('falls back to a name rather than an empty heading', () => {
    expect(titleFromDirectory('/')).toBe('My Blog')
  })
})

describe('packageNameFromDirectory', () => {
  it('produces something npm would accept', () => {
    expect(packageNameFromDirectory('My Blog')).toBe('my-blog')
    expect(packageNameFromDirectory('.blog')).toBe('blog')
    expect(packageNameFromDirectory('a/b/My Notes')).toBe('my-notes')
  })

  it('never returns an empty name', () => {
    expect(packageNameFromDirectory('...')).toBe('my-blog')
    expect(packageNameFromDirectory('/')).toBe('my-blog')
  })
})

describe('detectPackageManager', () => {
  it('reads the user agent every package manager sets', () => {
    expect(
      detectPackageManager('pnpm/12.8.1 npm/? node/v22.22.1 linux x64')
    ).toBe('pnpm')
    expect(detectPackageManager('npm/9.2.0 node/v22.22.1 linux x64')).toBe(
      'npm'
    )
    expect(detectPackageManager('yarn/1.22.22 npm/? node/v22.22.1')).toBe(
      'yarn'
    )
    expect(detectPackageManager('bun/1.1.0 npm/? node/v22.22.1')).toBe('bun')
  })

  it('falls back to npm rather than to nothing', () => {
    // An empty string, not `undefined`: `undefined` re-triggers the default parameter, which
    // reads `process.env.npm_config_user_agent`. Under `pnpm test` that is pnpm itself, so
    // this assertion passed when vitest was run directly and failed under the repo's own gate.
    expect(detectPackageManager('')).toBe('npm')
    expect(detectPackageManager('something-else/1.0')).toBe('npm')
  })
})

describe('collectAnswers', () => {
  it('derives what it can from the directory and defaults the rest', async () => {
    const answers = await answersFor(['my-notes'])

    expect(answers.targetDir).toBe('my-notes')
    expect(answers.title).toBe('My Notes')
    expect(answers.packageName).toBe('my-notes')
    expect(answers.lang).toBe('en')
    expect(answers.preset).toBe('default')
    expect(answers.deploy).toBe(true)
    expect(answers.author).toBe('')
    expect(answers.baseUrl).toBe('')
    expect(PACKAGE_MANAGERS).toContain(answers.packageManager)
  })

  it('takes every flag over its default', async () => {
    const answers = await answersFor([
      'site',
      '--title',
      'The Vue Point',
      '--description',
      'Notes on Vue.',
      '--author',
      'Evan You',
      '--base-url',
      'https://blog.vuejs.org',
      '--lang',
      'zh-CN',
      '--preset',
      'violet',
      '--package-manager',
      'pnpm'
    ])

    expect(answers).toMatchObject({
      title: 'The Vue Point',
      description: 'Notes on Vue.',
      author: 'Evan You',
      baseUrl: 'https://blog.vuejs.org',
      lang: 'zh-CN',
      preset: 'violet',
      packageManager: 'pnpm'
    })
  })

  it('strips a trailing slash from the base url', async () => {
    // Otherwise every absolute link the Feed writes has a doubled slash in it.
    const answers = await answersFor([
      'site',
      '--base-url',
      'https://example.com/'
    ])
    expect(answers.baseUrl).toBe('https://example.com')
  })

  it('does not install or touch git unless it was asked to', async () => {
    const answers = await answersFor(['site'])
    expect(answers.install).toBe(false)
    expect(answers.git).toBe(false)
  })

  it('honours --install and --git', async () => {
    const answers = await answersFor([
      'site',
      '--install',
      '--git',
      '--no-deploy'
    ])
    expect(answers.install).toBe(true)
    expect(answers.git).toBe(true)
    expect(answers.deploy).toBe(false)
  })

  it('carries a theme version override through', async () => {
    const answers = await answersFor([
      'site',
      '--theme-version',
      'file:../theme'
    ])
    expect(answers.themeVersion).toBe('file:../theme')
  })

  it('defaults the directory when the caller named none', async () => {
    const answers = await answersFor([])
    expect(answers.targetDir).toBe('my-blog')
    expect(answers.title).toBe('My Blog')
  })
})
