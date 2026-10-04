import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  TargetError,
  resolveInside,
  targetState,
  writeFiles
} from '../src/write.mjs'

/**
 * The filesystem half, against a real temporary directory.
 *
 * Faking `node:fs` here would only test the fake: what is worth asserting is that a
 * directory is created where one is missing, that an existing file is reported as
 * such, and that nothing is ever handed a path outside the target.
 */

let root

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'create-vp-vuejsblog-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('targetState', () => {
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

describe('resolveInside', () => {
  it('resolves a nested path', () => {
    expect(resolveInside(root, path.join('a', 'b.md'))).toBe(
      path.join(root, 'a', 'b.md')
    )
  })

  it('refuses to climb out of the target', () => {
    expect(() => resolveInside(root, path.join('..', 'escape.md'))).toThrow(
      TargetError
    )
    expect(() =>
      resolveInside(root, path.join('..', '..', 'etc', 'passwd'))
    ).toThrow(TargetError)
  })

  it('refuses the target itself, which is not a file to write', () => {
    expect(() => resolveInside(root, '.')).toThrow(TargetError)
  })
})

describe('writeFiles', () => {
  it('creates the directories a nested file needs', () => {
    writeFiles(root, {
      'package.json': '{}\n',
      '.vitepress/theme/index.ts': 'export default {}\n'
    })

    expect(readFileSync(path.join(root, 'package.json'), 'utf8')).toBe('{}\n')
    expect(existsSync(path.join(root, '.vitepress', 'theme', 'index.ts'))).toBe(
      true
    )
  })

  it('reports what it created and what it replaced', () => {
    writeFileSync(path.join(root, 'index.md'), 'old')

    const written = writeFiles(root, {
      'index.md': 'new',
      'posts/first.md': 'post'
    })

    expect(written).toEqual([
      { path: 'index.md', existed: true },
      { path: 'posts/first.md', existed: false }
    ])
    expect(readFileSync(path.join(root, 'index.md'), 'utf8')).toBe('new')
  })

  it('leaves files it did not generate alone', () => {
    // `--force` is documented as overwriting only its own files, so a stray file in
    // the directory has to survive a run.
    writeFileSync(path.join(root, 'notes.md'), 'mine')

    writeFiles(root, { 'package.json': '{}\n' })

    expect(readFileSync(path.join(root, 'notes.md'), 'utf8')).toBe('mine')
  })
})
