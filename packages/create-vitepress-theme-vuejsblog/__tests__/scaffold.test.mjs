import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scaffold } from '../src/init.mjs'

/**
 * The Site, as text on disk.
 *
 * `scaffold` renders each template and writes it, so these tests write into a real
 * temporary directory and read the files back — the same path a caller takes, minus
 * the terminal. These are the tests that catch the mistakes a scaffolder makes
 * quietly: a config that will not parse because a title had an apostrophe in it, a
 * Feed link that is offered when there is no Feed, a deploy workflow that would run
 * the wrong package manager. A build test proves the common path works; only these
 * can say why the uncommon one would not.
 */

const TODAY = new Date(2024, 8, 1)

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
  today: TODAY
}

let root

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'scaffold-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

async function build(overrides = {}) {
  const written = await scaffold({ ...ANSWERS, target: root, ...overrides })
  return {
    written,
    read: (name) => readFileSync(path.join(root, name), 'utf8'),
    has: (name) => existsSync(path.join(root, name))
  }
}

/** The block between the first two `---` fences. */
const frontmatterOf = (markdown) => markdown.split('---')[1] ?? ''

describe('scaffold', () => {
  it('writes a Site with every part of a blog', async () => {
    const { written } = await build()

    expect(written.toSorted()).toEqual(
      [
        '.github/workflows/deploy.yml',
        '.gitignore',
        '.vitepress/config.ts',
        '.vitepress/theme/index.ts',
        '.vitepress/theme/theme.css',
        'README.md',
        'about.md',
        'index.md',
        'package.json',
        'posts/a-draft.md',
        'posts/hello-world.md',
        'public/logo.svg',
        'tsconfig.json',
        'vercel.json'
      ].toSorted()
    )
  })

  it('writes no deploy config when none was asked for', async () => {
    const { has } = await build({ deploy: false })

    expect(has('.github/workflows/deploy.yml')).toBe(false)
    expect(has('vercel.json')).toBe(false)
  })

  it('ends every file with exactly one newline', async () => {
    const { written, read } = await build()

    for (const name of written) {
      const contents = read(name)
      expect(contents.endsWith('\n'), name).toBe(true)
      expect(contents.endsWith('\n\n'), name).toBe(false)
    }
  })

  it('names the package from the directory, not the title', async () => {
    const manifest = JSON.parse(
      (await build({ packageName: 'the-vue-point' })).read('package.json')
    )

    expect(manifest.name).toBe('the-vue-point')
    expect(manifest.private).toBe(true)
    expect(manifest.type).toBe('module')
    expect(manifest.devDependencies.vitepress).toBe('2.0.0-alpha.20')
    expect(manifest.devDependencies['vitepress-theme-vuejsblog']).toBe('^0.1.0')
  })

  it('records the detected pnpm version where the CI action will read it', async () => {
    // This field is the whole reason the generated workflow can leave `version:` out of
    // `pnpm/action-setup`. Without it the action has nothing to install.
    const manifest = JSON.parse(
      (await build({ packageManager: 'pnpm', pnpmVersion: '9.15.0' })).read(
        'package.json'
      )
    )

    expect(manifest.packageManager).toBe('pnpm@9.15.0')
  })

  it('falls back to an exact pnpm version when none was detected', async () => {
    // Corepack rejects a range here — "expected a semver version" — so the fallback has
    // to be a version, not the major.
    const manifest = JSON.parse(
      (await build({ packageManager: 'pnpm' })).read('package.json')
    )

    expect(manifest.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/)
  })

  it('claims no pnpm version for a package manager that is not pnpm', async () => {
    const manifest = JSON.parse(
      (await build({ packageManager: 'npm' })).read('package.json')
    )

    expect(manifest.packageManager).toBeUndefined()
  })

  it('hands the Theme to VitePress from the theme entry', async () => {
    const entry = (await build()).read('.vitepress/theme/index.ts')

    expect(entry).toContain("import Theme from 'vitepress-theme-vuejsblog'")
    expect(entry).toContain("import './theme.css'")
  })

  it('dates the sample posts, and drafts one of them', async () => {
    const { read } = await build()

    expect(frontmatterOf(read('posts/hello-world.md'))).toContain(
      'date: 2024-09-01'
    )
    expect(frontmatterOf(read('posts/hello-world.md'))).not.toContain('draft')
    expect(frontmatterOf(read('posts/a-draft.md'))).toContain('draft: true')
  })

  it('marks the index as the Blog index and the about page as a Page', async () => {
    const { read } = await build()

    expect(read('index.md')).toContain('layout: home')
    expect(read('about.md')).toContain('layout: page')
  })

  it('credits the author on the about page only when there is one', async () => {
    expect((await build({ author: 'Evan You' })).read('about.md')).toContain(
      'Written by Evan You.'
    )
    expect((await build({ author: '' })).read('about.md')).not.toContain(
      'Written by'
    )
  })
})

describe('the generated config', () => {
  it('survives a title with a quote in it', async () => {
    // The failure this guards is a config that no longer parses, which nothing else
    // in the pipeline would catch before the user tried to build.
    const contents = (await build({ title: "O'Brien's notes" })).read(
      '.vitepress/config.ts'
    )

    expect(contents).toContain("title: 'O\\'Brien\\'s notes'")
    expect(contents).toContain("author: { name: 'Evan You' }")
  })

  it('drops the description when there is none rather than writing an empty one', async () => {
    const contents = (await build({ description: '' })).read(
      '.vitepress/config.ts'
    )

    expect(contents).not.toContain('description:')
  })

  it('leaves a commented line where a missing author belongs', async () => {
    const contents = (await build({ author: '' })).read('.vitepress/config.ts')

    expect(contents).toContain("// author: { name: 'Your Name' },")
    expect(contents).not.toMatch(/^\s*author:/m)
  })

  it('leaves a commented line where a missing base url belongs', async () => {
    const contents = (await build({ origin: '' })).read('.vitepress/config.ts')

    expect(contents).toContain("// origin: 'https://example.com',")
    expect(contents).not.toMatch(/^\s*origin:/m)
  })

  it('offers no Feed link when there is no Feed', async () => {
    const contents = (await build({ origin: '' })).read('.vitepress/config.ts')

    expect(contents).not.toContain('/feed.rss')
    expect((await build()).read('.vitepress/config.ts')).toContain(
      "link: '/feed.rss'"
    )
  })

  it('asks for the Feed to be generated, and in the Site language', async () => {
    const contents = (await build({ lang: 'zh-CN' })).read(
      '.vitepress/config.ts'
    )

    expect(contents).toContain('buildEnd: (config) => genFeed(config)')
    expect(contents).toContain("feed: { language: 'zh-CN' }")
  })

  it('turns Tabs on, since the Theme leaves them off until a Site asks', async () => {
    // A Site that never states the option gets no `tabs` container, so a scaffolded Site
    // has to state it or the feature is invisible to whoever reads the Theme's syntax.
    expect((await build()).read('.vitepress/config.ts')).toContain(
      'markdown: { tabs: true }'
    )
  })
})

describe('the generated styling', () => {
  it('imports the chosen preset', async () => {
    const css = (await build({ preset: 'rose' })).read(
      '.vitepress/theme/theme.css'
    )

    expect(css).toContain(
      "@import 'vitepress-theme-vuejsblog/presets/rose.css';"
    )
  })

  it('imports nothing for the default, but says how to', async () => {
    const css = (await build({ preset: 'default' })).read(
      '.vitepress/theme/theme.css'
    )

    expect(css).toContain(
      "/* @import 'vitepress-theme-vuejsblog/presets/emerald.css'; */"
    )
    expect(css).not.toMatch(/^@import/m)
  })
})

describe('the generated logo', () => {
  it('takes its colour from the chosen preset', async () => {
    expect((await build({ preset: 'rose' })).read('public/logo.svg')).toContain(
      'fill="#be123c"'
    )
    expect(
      (await build({ preset: 'default' })).read('public/logo.svg')
    ).toContain('fill="#18794e"')
  })

  it('escapes the title it labels itself with', async () => {
    const svg = (await build({ title: 'A <blog> & "notes"' })).read(
      'public/logo.svg'
    )

    expect(svg).toContain('aria-label="A &lt;blog&gt; &amp; &quot;notes&quot;"')
    expect(svg).not.toContain('<blog>')
  })

  it('uses the title initial, uppercased', async () => {
    expect((await build({ title: 'notes' })).read('public/logo.svg')).toContain(
      '>N</text>'
    )
  })
})

describe('the generated deploy config', () => {
  it('writes the package manager the Site was asked for', async () => {
    expect(
      JSON.parse((await build({ packageManager: 'npm' })).read('vercel.json'))
        .buildCommand
    ).toBe('npm run build')
    expect(
      JSON.parse((await build({ packageManager: 'pnpm' })).read('vercel.json'))
        .buildCommand
    ).toBe('pnpm build')
  })

  it('caches the pnpm store rather than pinning a version in CI', async () => {
    const workflow = (await build({ packageManager: 'pnpm' })).read(
      '.github/workflows/deploy.yml'
    )

    // The block, not just the action name: `version` must not be among the inputs. The
    // version belongs to the Site's own package.json, where Corepack and the developer's
    // own tooling already read it, and a literal here would be a second copy to keep in
    // step.
    expect(workflow).toMatch(
      /uses: pnpm\/action-setup@v6\.1\.0\n\s+with:\n\s+cache: true\n/
    )
    expect(workflow).toContain('run: pnpm install')
    expect(workflow).toContain('run: pnpm build')
  })

  it('installs nothing extra for npm, and runs the scripts through it', async () => {
    const workflow = (await build({ packageManager: 'npm' })).read(
      '.github/workflows/deploy.yml'
    )

    expect(workflow).not.toContain('pnpm/action-setup')
    expect(workflow).toContain('run: npm install')
    expect(workflow).toContain('run: npm run build')
  })

  it('keeps one blank line between steps, and no more', async () => {
    const workflow = (await build({ packageManager: 'pnpm' })).read(
      '.github/workflows/deploy.yml'
    )

    expect(workflow).toContain(
      '          cache: true\n\n      - name: Setup Node'
    )
    expect(workflow).toContain(
      '          node-version: 22\n\n      - name: Install Dependence'
    )
    expect(workflow).not.toMatch(/\n\n\n/)
  })

  it('publishes the build output to Pages', async () => {
    const workflow = (await build()).read('.github/workflows/deploy.yml')

    expect(workflow).toContain('path: .vitepress/dist')
    expect(workflow).toContain('uses: actions/deploy-pages@v5.0.0')
    expect(workflow).toContain('branches: [main]')
  })
})
