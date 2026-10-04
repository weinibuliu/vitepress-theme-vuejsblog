import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { isExcluded } from '../src/lib/exclude.js'
import { scanExcluded } from '../src/lib/scanExcluded.js'

describe('isExcluded', () => {
  it('accepts the literal boolean true', () => {
    expect(isExcluded({ exclude: true })).toBe(true)
  })

  it('rejects every other spelling, the tolerance draft is read with', () => {
    // A quoted `'true'`, a number, or a word all state nothing, rather than crashing a
    // build or quietly excluding a file the author did not mean to.
    for (const value of ['true', 1, 'yes', false, null, undefined]) {
      expect(isExcluded({ exclude: value })).toBe(false)
    }
  })

  it('rejects missing or non-object frontmatter', () => {
    expect(isExcluded({})).toBe(false)
    expect(isExcluded(undefined)).toBe(false)
    expect(isExcluded(null)).toBe(false)
    expect(isExcluded('exclude: true')).toBe(false)
  })
})

describe('scanExcluded', () => {
  let root: string | undefined

  function site(files: Record<string, string>): string {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-exclude-'))
    for (const [file, source] of Object.entries(files)) {
      const full = path.join(root, file)
      fs.mkdirSync(path.dirname(full), { recursive: true })
      fs.writeFileSync(full, source)
    }
    return root
  }

  afterEach(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true })
    root = undefined
  })

  it('returns every excluded file as an absolute path, in any subdirectory', () => {
    const dir = site({
      'index.md': '---\nlayout: home\n---\n',
      'docs/demo/exclude.md': '---\ntitle: Gone\nexclude: true\n---\n',
      'posts/keep.md': '---\ntitle: Keep\ndate: 2024-01-01\n---\n'
    })
    expect(scanExcluded(dir)).toEqual([path.join(dir, 'docs/demo/exclude.md')])
  })

  it('applies only the literal boolean', () => {
    const dir = site({
      'a.md': '---\nexclude: "true"\n---\n',
      'b.md': '---\nexclude: 1\n---\n',
      'c.md': '---\nexclude: yes\n---\n'
    })
    expect(scanExcluded(dir)).toEqual([])
  })

  it('leaves files without frontmatter alone', () => {
    const dir = site({ 'plain.md': 'no frontmatter here\n' })
    expect(scanExcluded(dir)).toEqual([])
  })

  it('never descends into node_modules or dist', () => {
    // The scan starts at the Site root and is not told where the content lives, so these
    // are the two directories a dependency's Markdown would otherwise come in through.
    const dir = site({
      'node_modules/dep/README.md': '---\nexclude: true\n---\n',
      'dist/built.md': '---\nexclude: true\n---\n',
      'content.md': '---\nexclude: true\n---\n'
    })
    expect(scanExcluded(dir)).toEqual([path.join(dir, 'content.md')])
  })

  it('ignores only Markdown', () => {
    const dir = site({
      'notes.txt': '---\nexclude: true\n---\n',
      'picture.md.png': '---\nexclude: true\n---\n'
    })
    expect(scanExcluded(dir)).toEqual([])
  })

  it('skips a file it cannot parse instead of failing the config load', () => {
    const dir = site({
      'broken.md': '---\nexclude: [unclosed\n---\n',
      'fine.md': '---\nexclude: true\n---\n'
    })
    expect(scanExcluded(dir)).toEqual([path.join(dir, 'fine.md')])
  })

  it('answers an empty list for a root with nothing to exclude', () => {
    expect(scanExcluded(site({ 'a.md': '# a\n' }))).toEqual([])
  })

  it('answers an empty list for a root that does not exist', () => {
    expect(
      scanExcluded(path.join(os.tmpdir(), 'theme-exclude-missing'))
    ).toEqual([])
  })
})
