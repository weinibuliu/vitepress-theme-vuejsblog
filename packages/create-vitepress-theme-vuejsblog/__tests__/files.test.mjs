import { describe, expect, it } from 'vitest'
import { createFiles, isoDate, literal, quote } from '../src/files.mjs'

/**
 * The generated tree, as text.
 *
 * These are the tests that catch the mistakes a scaffolder makes quietly: a config
 * that will not parse because a title had an apostrophe in it, a Feed link that is
 * offered when there is no Feed, a deploy workflow that would run the wrong package
 * manager. A build test proves the common path works; only these can say why the
 * uncommon one would not.
 */

const TODAY = new Date(2024, 8, 1)

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

const build = (overrides = {}, options = {}) =>
  createFiles({ ...ANSWERS, ...overrides }, { today: TODAY, ...options })

/** The block between the first two `---` fences. */
const frontmatterOf = (markdown) => markdown.split('---')[1] ?? ''

describe('isoDate', () => {
  it('formats a date the way frontmatter wants it', () => {
    expect(isoDate(new Date(2024, 8, 1))).toBe('2024-09-01')
    expect(isoDate(new Date(2024, 11, 31))).toBe('2024-12-31')
  })
})

describe('quote', () => {
  it('escapes what would otherwise end the literal', () => {
    expect(quote("O'Brien")).toBe("'O\\'Brien'")
    expect(quote('back\\slash')).toBe("'back\\\\slash'")
    expect(quote('two\nlines')).toBe("'two\\nlines'")
  })
})

describe('literal', () => {
  it('keeps a flat record on one line', () => {
    expect(literal({ text: 'About', link: '/about' }, 6)).toBe(
      "{ text: 'About', link: '/about' }"
    )
  })

  it('gives a list a line per item, indented from its key', () => {
    const rendered = literal(
      [
        { text: 'About', link: '/about' },
        { text: 'RSS', link: '/feed.rss' }
      ],
      6
    )

    expect(rendered).toBe(
      [
        '[',
        "        { text: 'About', link: '/about' },",
        "        { text: 'RSS', link: '/feed.rss' }",
        '      ]'
      ].join('\n')
    )
  })

  it('drops undefined fields rather than writing them', () => {
    expect(literal({ text: 'About', external: undefined }, 0)).toBe(
      "{ text: 'About' }"
    )
  })
})

describe('createFiles', () => {
  it('writes a Site with every part of a blog', () => {
    const files = build()

    expect(Object.keys(files).toSorted()).toEqual(
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

  it('writes no deploy config when none was asked for', () => {
    const files = build({ deploy: false })

    expect(files['.github/workflows/deploy.yml']).toBeUndefined()
    expect(files['vercel.json']).toBeUndefined()
  })

  it('ends every file with exactly one newline', () => {
    for (const [name, contents] of Object.entries(build())) {
      expect(contents.endsWith('\n'), name).toBe(true)
      expect(contents.endsWith('\n\n'), name).toBe(false)
    }
  })

  it('names the package from the directory, not the title', () => {
    const manifest = JSON.parse(
      build({ packageName: 'the-vue-point' })['package.json']
    )

    expect(manifest.name).toBe('the-vue-point')
    expect(manifest.private).toBe(true)
    expect(manifest.type).toBe('module')
    expect(manifest.devDependencies.vitepress).toBe('2.0.0-alpha.20')
    expect(manifest.devDependencies['vitepress-theme-vuejsblog']).toBe('^0.1.0')
  })

  it('hands the Theme to VitePress from the theme entry', () => {
    const entry = build()['.vitepress/theme/index.ts']

    expect(entry).toContain("import Theme from 'vitepress-theme-vuejsblog'")
    expect(entry).toContain("import './theme.css'")
  })

  it('dates the sample posts, and drafts one of them', () => {
    const files = build()

    expect(frontmatterOf(files['posts/hello-world.md'])).toContain(
      'date: 2024-09-01'
    )
    expect(frontmatterOf(files['posts/hello-world.md'])).not.toContain('draft')
    expect(frontmatterOf(files['posts/a-draft.md'])).toContain('draft: true')
  })

  it('marks the index as the Blog index and the about page as a Page', () => {
    const files = build()

    expect(files['index.md']).toContain('layout: home')
    expect(files['about.md']).toContain('layout: page')
  })
})

describe('the generated config', () => {
  it('survives a title with a quote in it', () => {
    // The failure this guards is a config that no longer parses, which nothing else
    // in the pipeline would catch before the user tried to build.
    const contents = build({ title: "O'Brien's notes" })['.vitepress/config.ts']

    expect(contents).toContain("title: 'O\\'Brien\\'s notes'")
    expect(contents).toContain("author: { name: 'Evan You' }")
  })

  it('drops the description when there is none rather than writing an empty one', () => {
    const contents = build({ description: '' })['.vitepress/config.ts']

    expect(contents).not.toContain('description:')
  })

  it('leaves a commented line where a missing author belongs', () => {
    const contents = build({ author: '' })['.vitepress/config.ts']

    expect(contents).toContain("// author: { name: 'Your Name' },")
    expect(contents).not.toMatch(/^\s*author:/m)
  })

  it('leaves a commented line where a missing base url belongs', () => {
    const contents = build({ baseUrl: '' })['.vitepress/config.ts']

    expect(contents).toContain("// baseUrl: 'https://example.com',")
    expect(contents).not.toMatch(/^\s*baseUrl:/m)
  })

  it('offers no Feed link when there is no Feed', () => {
    const contents = build({ baseUrl: '' })['.vitepress/config.ts']

    expect(contents).not.toContain('/feed.rss')
    expect(build()['.vitepress/config.ts']).toContain("link: '/feed.rss'")
  })

  it('asks for the Feed to be generated, and in the Site language', () => {
    const contents = build({ lang: 'zh-CN' })['.vitepress/config.ts']

    expect(contents).toContain('buildEnd: (config) => genFeed(config)')
    expect(contents).toContain("feed: { language: 'zh-CN' }")
  })

  it('turns Tabs on, since the Theme leaves them off until a Site asks', () => {
    // A Site that never states the option gets no `tabs` container, so a scaffolded Site
    // has to state it or the feature is invisible to whoever reads the Theme's syntax.
    expect(build()['.vitepress/config.ts']).toContain(
      'markdown: { tabs: true }'
    )
  })
})

describe('the generated styling', () => {
  it('imports the chosen preset', () => {
    const css = build({ preset: 'rose' })['.vitepress/theme/theme.css']

    expect(css).toContain(
      "@import 'vitepress-theme-vuejsblog/presets/rose.css';"
    )
  })

  it('imports nothing for the default, but says how to', () => {
    const css = build({ preset: 'default' })['.vitepress/theme/theme.css']

    expect(css).toContain(
      "/* @import 'vitepress-theme-vuejsblog/presets/emerald.css'; */"
    )
    expect(css).not.toMatch(/^@import/m)
  })
})

describe('the generated logo', () => {
  it('takes its colour from the chosen preset', () => {
    expect(build({ preset: 'rose' })['public/logo.svg']).toContain(
      'fill="#be123c"'
    )
    expect(build({ preset: 'default' })['public/logo.svg']).toContain(
      'fill="#18794e"'
    )
  })

  it('escapes the title it labels itself with', () => {
    const svg = build({ title: 'A <blog> & "notes"' })['public/logo.svg']

    expect(svg).toContain('aria-label="A &lt;blog&gt; &amp; &quot;notes&quot;"')
    expect(svg).not.toContain('<blog>')
  })

  it('uses the title initial, uppercased', () => {
    expect(build({ title: 'notes' })['public/logo.svg']).toContain('>N</text>')
  })
})

describe('the generated deploy config', () => {
  it('writes the package manager the Site was asked for', () => {
    expect(
      JSON.parse(build({ packageManager: 'npm' })['vercel.json']).buildCommand
    ).toBe('npm run build')
    expect(
      JSON.parse(build({ packageManager: 'pnpm' })['vercel.json']).buildCommand
    ).toBe('pnpm build')
  })

  it('installs the reported pnpm version in CI', () => {
    const workflow = build(
      { packageManager: 'pnpm' },
      { pnpmVersion: '9.15.0' }
    )['.github/workflows/deploy.yml']

    expect(workflow).toContain('uses: pnpm/action-setup@v4')
    expect(workflow).toContain('version: 9.15.0')
    expect(workflow).toContain('run: pnpm install')
    expect(workflow).toContain('run: pnpm build')
  })

  it('installs nothing extra for npm, and runs the scripts through it', () => {
    const workflow = build({ packageManager: 'npm' })[
      '.github/workflows/deploy.yml'
    ]

    expect(workflow).not.toContain('pnpm/action-setup')
    expect(workflow).toContain('run: npm install')
    expect(workflow).toContain('run: npm run build')
  })

  it('publishes the build output to Pages', () => {
    const workflow = build()['.github/workflows/deploy.yml']

    expect(workflow).toContain('path: .vitepress/dist')
    expect(workflow).toContain('uses: actions/deploy-pages@v4')
    expect(workflow).toContain('branches: [main]')
  })
})
