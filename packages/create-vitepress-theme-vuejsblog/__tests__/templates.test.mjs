import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createFiles } from '../src/files.mjs'

/**
 * The template directory and the generated tree, kept in step.
 *
 * `files.test.mjs` reads the generated text; this reads the arrangement. The two
 * mistakes worth catching here are a template that no scaffold writes (content kept
 * alive for nothing) and a generated file with no template (which would only show up
 * as a missing-file error at runtime). The third check is the packaging trap below.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const templates = path.join(root, 'templates')

const ANSWERS = {
  targetDir: 'my-blog',
  packageName: 'my-blog',
  title: 'My Blog',
  description: 'Notes on things I build.',
  author: 'Evan You',
  baseUrl: 'https://example.com',
  lang: 'en',
  preset: 'default',
  deploy: true,
  install: false,
  git: false,
  packageManager: 'npm',
  themeVersion: '^0.1.0'
}

/** Every `.tpl` under `templates/`, as a path relative to it. */
function templateFiles(dir = templates, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name
    return entry.isDirectory()
      ? templateFiles(path.join(dir, entry.name), name)
      : entry.name.endsWith('.tpl')
        ? [name]
        : []
  })
}

describe('the template directory', () => {
  it('has one template for every file a scaffold writes', () => {
    const files = createFiles(ANSWERS, { today: new Date(2024, 8, 1) })

    for (const name of Object.keys(files)) {
      expect(existsSync(path.join(templates, `${name}.tpl`)), name).toBe(true)
    }
  })

  it('has no template that no scaffold writes', () => {
    const files = createFiles(ANSWERS, { today: new Date(2024, 8, 1) })
    const wanted = new Set(Object.keys(files).map((name) => `${name}.tpl`))
    const orphans = templateFiles()
      .filter((name) => !name.startsWith('partials/'))
      .filter((name) => !wanted.has(name))

    expect(orphans).toEqual([])
  })

  it('ships the templates, by listing them in the package manifest', () => {
    // The failure this guards passes every other test in the repository: the templates
    // are on disk, the scaffold works, and the tarball contains none of them.
    const manifest = JSON.parse(
      readFileSync(path.join(root, 'package.json'), 'utf8')
    )

    expect(manifest.files).toContain('templates')
  })

  it('names the gitignore template with a suffix, because npm drops the bare name', () => {
    // `npm pack` leaves a file called `.gitignore` out of the tarball entirely — not
    // renamed, absent — so a template carrying that name would work in the repository
    // and fail for everyone who installed the package. This is the regression guard.
    expect(existsSync(path.join(templates, '.gitignore.tpl'))).toBe(true)
    expect(existsSync(path.join(templates, '.gitignore'))).toBe(false)
  })
})
