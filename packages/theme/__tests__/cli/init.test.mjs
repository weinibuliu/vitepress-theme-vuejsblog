import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseArgs } from '../../cli/args.mjs'
import { collectAnswers, targetState } from '../../cli/init.mjs'
import { PACKAGE_MANAGERS } from '../../cli/constants.mjs'

/**
 * The seam between "what the caller said" and "what the Site is built from".
 *
 * `collectAnswers` is tested with `interactive: false`, which is also the path CI
 * takes: vitest has no TTY, and under `--yes` every question answers from the default
 * it was given. What matters is that a flag, a prompt and a default all arrive as the
 * same value, so the file set never has to know which way it was told.
 */

const answersFor = (argv) => collectAnswers(parseArgs(argv), false)

describe('collectAnswers without a terminal', () => {
  it('derives what it can from the directory and defaults the rest', async () => {
    const answers = await answersFor(['my-notes'])

    expect(answers.targetDir).toBe('my-notes')
    expect(answers.title).toBe('My Notes')
    expect(answers.packageName).toBe('my-notes')
    expect(answers.lang).toBe('en')
    expect(answers.preset).toBe('default')
    expect(answers.deploy).toBe(true)
    expect(answers.author).toBe('')
    expect(answers.origin).toBe('')
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
      origin: 'https://blog.vuejs.org',
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
    expect(answers.origin).toBe('https://example.com')
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

describe('targetState', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'create-vp-vuejsblog-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('reports a directory that is not there', () => {
    expect(targetState(path.join(root, 'nope'))).toBe('absent')
  })

  it('reports an empty directory', () => {
    const dir = path.join(root, 'empty')
    mkdirSync(dir)
    expect(targetState(dir)).toBe('empty')
  })

  it('reports a directory with anything in it', () => {
    const dir = path.join(root, 'full')
    mkdirSync(dir)
    writeFileSync(path.join(dir, 'notes.md'), 'hello')
    expect(targetState(dir)).toBe('occupied')
  })

  it('reports a file where a directory was expected', () => {
    const file = path.join(root, 'a-file')
    writeFileSync(file, '')
    expect(targetState(file)).toBe('not-a-directory')
  })
})
