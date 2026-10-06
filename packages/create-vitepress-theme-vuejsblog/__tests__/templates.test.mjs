import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scaffold } from '../src/init.mjs'

/**
 * The template directory and the generated tree, kept in step.
 *
 * `scaffold.test.mjs` reads the generated text; this reads the arrangement. The two
 * mistakes worth catching here are a template that no scaffold writes (content kept
 * alive for nothing) and a generated file with no template (which would only show up
 * as a missing-file error at runtime). The third check is the packaging trap below.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const templates = path.join(root, 'templates')

const ANSWERS = {
  title: 'My Blog',
  description: 'Notes on things I build.',
  author: 'Evan You',
  origin: 'https://example.com',
  lang: 'en',
  preset: 'default',
  deploy: true,
  packageName: 'my-blog',
  packageManager: 'npm',
  themeVersion: '^0.1.0',
  today: new Date(2024, 8, 1)
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

let target

beforeEach(() => {
  target = mkdtempSync(path.join(os.tmpdir(), 'templates-'))
})

afterEach(() => {
  rmSync(target, { recursive: true, force: true })
})

/** The templates the scaffold reaches for, as `.tpl` paths relative to `templates/`. */
async function wantedTemplates() {
  const written = await scaffold({ ...ANSWERS, target })
  return new Set(written.map((name) => `${name}.tpl`))
}

describe('the template directory', () => {
  it('has one template for every file a scaffold writes', async () => {
    for (const name of await wantedTemplates()) {
      expect(existsSync(path.join(templates, name)), name).toBe(true)
    }
  })

  it('has no template that no scaffold writes', async () => {
    const wanted = await wantedTemplates()
    const orphans = templateFiles().filter((name) => !wanted.has(name))

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
