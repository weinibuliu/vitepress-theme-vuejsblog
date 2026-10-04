import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Build a Site that consumes the Theme **the way a stranger would**: from a packed
 * tarball installed into `node_modules`, not from a linked workspace path.
 *
 * This exists because that distinction is not cosmetic. npm installs a local path as a
 * symlink, Vite follows symlinks and compiles the Theme as source, and a whole class of
 * failure disappears: the Theme being externalised out of the SSR build, Node then
 * trying to read a `.vue` file, and the production build dying at "rendering pages".
 * The workspace playground and any `file:` install both pass while a registry install
 * fails, so this is the only check that covers the published artefact.
 *
 * See `docs/adr/0003-bundle-theme-into-the-ssr-build.md`.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const themeDir = path.join(root, 'packages/theme')
const VITEPRESS = '2.0.0-alpha.20'
const VUE = '3.5.41'

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

/**
 * The brand link's own markup.
 *
 * Sliced to its first `</a>` rather than matched with `[\s\S]*?`, because a pattern that
 * requires something further down the page — an `<img>`, say — happily runs past this
 * element's closing tag and reports what it found elsewhere. That is exactly how the first
 * version of the check below asserted the wrong thing: the index carries the hero's avatar.
 */
function brandMarkup(page) {
  const start = page.indexOf('<a class="vp-blog-layout-brand"')
  if (start === -1) return ''
  return page.slice(start, page.indexOf('</a>', start))
}

/** The hero's subtext line as rendered, for the escaping check. */
function heroSubtextIn(page) {
  return (
    page.match(
      /<p class="vp-blog-content-index-hero-subtext">([\s\S]*?)<\/p>/
    )?.[1] ?? ''
  )
}

/** The slot markers a built page rendered, sorted. */
function slotsOn(page) {
  return [...page.matchAll(/SLOT:([a-z-]+)/g)]
    .map((match) => match[1])
    .toSorted()
}

function step(message) {
  console.log(`\n${message}`)
}

const workspace = path.join(
  os.tmpdir(),
  `vitepress-theme-vuejsblog-consumer-${process.pid}`
)

rmSync(workspace, { recursive: true, force: true })
mkdirSync(path.join(workspace, 'docs/.vitepress/theme'), { recursive: true })
mkdirSync(path.join(workspace, 'docs/posts'), { recursive: true })

try {
  // Build first. `npm pack` ships whatever is in `dist/`, so packing a stale build silently
  // tests the previous version of the Theme — which is exactly what happened twice while
  // developing this, once producing a passing run against code that had already changed.
  step('Building the Theme')
  run('pnpm', ['--filter', 'vitepress-theme-vuejsblog', 'build'], root)
  console.log('  ok   dist rebuilt from src')

  step('Packing the Theme')
  const packOutput = run(
    'npm',
    ['pack', '--pack-destination', workspace],
    themeDir
  )
  const tarball = packOutput.trim().split('\n').pop().trim()
  const tarballPath = path.join(workspace, tarball)
  if (!existsSync(tarballPath)) {
    throw new Error(`npm pack did not produce ${tarballPath}`)
  }
  console.log(`  ok   ${tarball}`)

  writeFileSync(
    path.join(workspace, 'package.json'),
    JSON.stringify({ name: 'consumer', private: true, type: 'module' }, null, 2)
  )

  writeFileSync(
    path.join(workspace, 'docs/.vitepress/theme/index.ts'),
    [
      `import { h } from 'vue'`,
      `import Theme, { BlogAuthor } from 'vitepress-theme-vuejsblog'`,
      // Exercises the `./presets/*.css` sub-path export against the packed tarball,
      // which is the only place a broken `exports` map shows up.
      `import 'vitepress-theme-vuejsblog/presets/rose.css'`,
      '',
      `const mark = (name) => h('div', { class: 'slotmark' }, 'SLOT:' + name)`,
      '',
      // Every slot the Theme documents. `not-found` is deliberately absent: VitePress
      // renders the 404 page as an empty shell and fills it in on the client, so no
      // marker for it can appear in built HTML — its forwarding is covered by the unit
      // test that compares CHILD_SLOTS against what the components declare.
      `export default {`,
      `  extends: Theme,`,
      `  Layout: () =>`,
      `    h(Theme.Layout, null, {`,
      `      'layout-top': () => mark('layout-top'),`,
      `      'layout-bottom': () => mark('layout-bottom'),`,
      `      'content-index-before': () => mark('content-index-before'),`,
      `      'content-index-after': () => mark('content-index-after'),`,
      `      'content-post-before': () => mark('content-post-before'),`,
      `      'content-post-main-before': () => mark('content-post-main-before'),`,
      `      'content-post-main-after': () => mark('content-post-main-after'),`,
      `      'layout-footer-after': () => mark('layout-footer-after'),`,
      `      'content-post-after': () => [`,
      // The exported components have to work when a Site drops them in on their own. They
      // once required the Theme's internal string table, so this — the obvious usage —
      // failed to build with "Cannot read properties of undefined (reading 'authors')".
      `        mark('content-post-after'),`,
      `        h(BlogAuthor, { authors: [{ name: 'Bare Author' }] })`,
      `      ]`,
      `    })`,
      `}`,
      ''
    ].join('\n')
  )

  // Deliberately minimal: no `vite.ssr.noExternal`, because the Theme is expected to
  // supply that itself through the base config the Site extends.
  writeFileSync(
    path.join(workspace, 'docs/.vitepress/config.ts'),
    `import path from 'node:path'
import { defineConfig } from 'vitepress'
import blogConfig from 'vitepress-theme-vuejsblog/config'
import { genFeed } from 'vitepress-theme-vuejsblog/feed'
import type { ThemeConfig } from 'vitepress-theme-vuejsblog'

export default defineConfig<ThemeConfig>({
  extends: blogConfig(path.resolve(import.meta.dirname, '..')),
  srcDir: '.',
  title: 'Consumer Blog',
  // No blog.lang: the Theme is expected to pick this up from the site-level lang.
  lang: 'zh-CN',
  buildEnd: (config) => genFeed(config),
  themeConfig: {
    blog: {
      title: 'Consumer Blog',
      description: 'Verifies the published artefact.',
      baseUrl: 'https://consumer.example',
      // Dates pinned to English so the date assertion stays meaningful while the
      // interface strings come from the site's lang.
      locale: 'en-US',
      // The playground covers the default; this covers a Site naming its own icon.
      favicon: '/icon.svg',
      // The hero's avatar falls back to this, so the assertion covers the fallback rather
      // than an explicitly configured picture.
      author: { name: 'Reader', gravatar: 'abc123', twitter: '@reader' },
      footer: {
        // HTML, not Markdown: an inline link must survive as a link.
        text: 'A footer <a href="https://example.com/">link</a>',
        links: [{ text: 'RSS', link: '/feed.rss' }]
      },
      // HTML, and a link is the point: it must survive as a link rather than being shown
      // as literal markup. The description fallback beside it stays escaped. No backticks in
      // here: this text lives inside a template literal, and one would end it early.
      hero: { subtext: 'Notes <a href="https://example.com/">with a link</a>.' }
    }
  }
})
`
  )

  writeFileSync(
    path.join(workspace, 'docs/index.md'),
    `---\nlayout: home\n---\n`
  )

  writeFileSync(
    path.join(workspace, 'docs/posts/first.md'),
    `---
title: First post from an external site
date: 2024-10-01
---

Hello from outside the workspace.
`
  )

  step('Installing the tarball (a real install, not a link)')
  run(
    'npm',
    [
      'install',
      '--silent',
      `vitepress@${VITEPRESS}`,
      `vue@${VUE}`,
      tarballPath
    ],
    workspace
  )
  const installed = run(
    'node',
    [
      '--input-type=module',
      '-e',
      `import { readFileSync } from 'node:fs'
       console.log(JSON.parse(readFileSync('node_modules/vitepress-theme-vuejsblog/package.json','utf8')).version)`
    ],
    workspace
  ).trim()
  console.log(`  ok   installed vitepress-theme-vuejsblog@${installed}`)

  step('Building the consuming Site')
  run('npx', ['vitepress', 'build', 'docs'], workspace)
  console.log('  ok   build completed')

  step('Asserting the published artefact works')
  const dist = path.join(workspace, 'docs/.vitepress/dist')
  const home = readFileSync(path.join(dist, 'index.html'), 'utf8')
  const post = readFileSync(path.join(dist, 'posts/first.html'), 'utf8')

  const feed = readFileSync(path.join(dist, 'feed.rss'), 'utf8')
  const cssFile = readdirSync(path.join(dist, 'assets')).find((name) =>
    name.endsWith('.css')
  )
  const css = readFileSync(path.join(dist, 'assets', cssFile), 'utf8')

  const assertions = [
    [
      'the Blog index lists the Post',
      home.includes('vp-blog-content-list-link')
    ],
    [
      'the Post page renders',
      post.includes('First post from an external site')
    ],
    ['the Default Author is applied', post.includes('Reader')],
    [
      'the date is formatted from Theme Config',
      post.includes('October 1, 2024')
    ],
    [
      'the site-level lang switches the interface strings',
      home.includes('阅读全文') && !home.includes('Read more')
    ],
    [
      '`lang` and `locale` are independent',
      post.includes('October 1, 2024') && post.includes('返回博客')
    ],
    ['a Feed is generated', feed.includes('<item>')],
    [
      'the Feed is absolute',
      feed.includes('https://consumer.example/posts/first')
    ],
    // Slots are the Theme's extension surface, and they were once all dead: the slots were
    // declared inside child components that Layout never forwarded them to, so every one of
    // them was unreachable while the build stayed green. Asserting *which* page each lands
    // on also catches a slot being forwarded to the wrong component.
    [
      'every Blog-index slot renders, and only on the Blog index',
      slotsOn(home).join(',') ===
        [
          'content-index-after',
          'content-index-before',
          'layout-bottom',
          'layout-footer-after',
          'layout-top'
        ].join(',')
    ],
    [
      'every Post slot renders, and only on a Post',
      slotsOn(post).join(',') ===
        [
          'content-post-after',
          'content-post-before',
          'content-post-main-after',
          'content-post-main-before',
          'layout-bottom',
          'layout-footer-after',
          'layout-top'
        ].join(',')
    ],
    [
      'the footer renders the Site’s text as HTML, keeping its link',
      home.includes('vp-blog-layout-footer-text') &&
        /<bdi>A footer <a href="https:\/\/example\.com\/">link<\/a><\/bdi>/.test(
          home
        )
    ],
    [
      'the footer renders its links as a separate group from the text',
      home.includes('vp-blog-layout-footer-links') &&
        home.includes('vp-blog-layout-footer-link') &&
        home.includes('>RSS<')
    ],
    [
      'a footer slot renders, and lands after the Site’s links',
      slotsOn(home).includes('layout-footer-after') &&
        home.indexOf('vp-blog-layout-footer-links') <
          home.indexOf('SLOT:layout-footer-after')
    ],
    [
      'an exported component works without the Theme’s string table',
      post.includes('Bare Author') && post.includes('vp-blog-ui-byline')
    ],
    [
      'the hero renders its heading and subtext',
      home.includes('vp-blog-content-index-hero') && home.includes('Notes')
    ],
    [
      'hero.subtext is HTML, so its link stays a link',
      home.includes('<a href="https://example.com/">with a link</a>')
    ],
    [
      'the hero takes its avatar from the Site Author',
      home.includes('vp-blog-content-index-hero-avatar') &&
        home.includes('https://gravatar.com/avatar/abc123')
    ],
    [
      'the hero replaces the plain index heading rather than joining it',
      !home.includes('vp-blog-content-index-head') &&
        [...home.matchAll(/<h1/g)].length === 1
    ],
    [
      'the favicon from Theme Config reaches the document',
      home.includes('<link rel="icon" href="/icon.svg">')
    ],
    // The consumer configures no `logo`, which is the case that used to render an invisible
    // but clickable brand link on the index: the label was hidden on the index and below
    // 768px, so with no logo there was nothing left. `is-solo` is what tells the CSS to show
    // it at any width, so asserting the text alone would not prove the phone case.
    [
      'a Site with no logo still names the brand on the index',
      // Two traps here. The brand's `aria-label` carries the title whether or not anything
      // visible is inside it, so looking for the text alone passes even when the label is
      // gone — the element is what has to be found. And the `vp-blog-layout-logo` half keeps
      // the fixture honest: this is the no-logo case, and the assertion would mean something
      // else if a logo were added to the config.
      /class="[^"]*\bvp-blog-layout-brand-label\b[^"]*"[^>]*>[\s\S]*?Consumer Blog/.test(
        brandMarkup(home)
      ) && !brandMarkup(home).includes('vp-blog-layout-logo')
    ],
    [
      'that brand is marked so it shows at any width',
      // Vue writes the dynamic class before the static one, so the order is not asserted.
      /\bclass="[^"]*\bis-solo\b/.test(brandMarkup(home))
    ],
    ['colour tokens shipped', /--vp-c-bg:\s*\S/.test(css)],
    ['Markdown typography shipped', css.includes('.vp-doc')],
    [
      'a preset imported through its sub-path took effect',
      // Minified, so no space after the colon.
      css.includes('--vp-c-brand-1:#be123c') &&
        css.includes('--vp-c-brand-1:#fb7185')
    ]
  ]

  // A third configuration, because the hero's fallback needs a hero with no `subtext` of its
  // own. This is the safety-critical branch: `description` is metadata and may contain a `<`
  // as prose, so parsing it as HTML would swallow everything up to the next `>`.
  step('Rebuilding with the hero falling back to the Blog description')
  const configPath = path.join(workspace, 'docs/.vitepress/config.ts')
  const siteConfig = readFileSync(configPath, 'utf8')
  writeFileSync(
    configPath,
    siteConfig
      .replace(
        `hero: { subtext: 'Notes <a href="https://example.com/">with a link</a>.' }`,
        // A hero with no line of its own, so the description is what shows.
        `hero: { avatar: false }`
      )
      .replace(
        `description: 'Verifies the published artefact.',`,
        `description: 'Prose with a stray <angle bracket.',`
      )
      // A full URL, so the Feed must not prefix the origin a second time.
      .replace(
        `favicon: '/icon.svg',`,
        `favicon: '/icon.svg',\n      logo: 'https://cdn.example/logo.png',`
      )
  )
  run('npx', ['vitepress', 'build', 'docs'], workspace)
  const homeFallingBack = readFileSync(path.join(dist, 'index.html'), 'utf8')
  assertions.push(
    [
      'the description fallback is escaped, not parsed',
      heroSubtextIn(homeFallingBack).includes('&lt;angle bracket') &&
        !heroSubtextIn(homeFallingBack).includes('<angle bracket')
    ],
    [
      'the escaped fallback still reads as the whole sentence',
      heroSubtextIn(homeFallingBack).includes('Prose with a stray')
    ],
    [
      'a logo that is already a full URL is not prefixed again',
      /<url>https:\/\/cdn\.example\/logo\.png<\/url>/.test(
        readFileSync(path.join(dist, 'feed.rss'), 'utf8')
      )
    ]
  )

  // The hero slot and the hero config are mutually exclusive: providing a slot suppresses
  // its fallback, so one build cannot show both. This last build covers that side.
  step('Rebuilding with the hero slot filled')
  const themeEntryPath = path.join(workspace, 'docs/.vitepress/theme/index.ts')
  const themeEntry = readFileSync(themeEntryPath, 'utf8')
  writeFileSync(
    themeEntryPath,
    themeEntry.replace(
      `      'content-index-before': () => mark('content-index-before'),`,
      `      'content-index-hero': () => mark('content-index-hero'),\n      'content-index-before': () => mark('content-index-before'),`
    )
  )
  run('npx', ['vitepress', 'build', 'docs'], workspace)
  const homeWithSlot = readFileSync(path.join(dist, 'index.html'), 'utf8')
  assertions.push(
    [
      'a filled hero slot renders',
      homeWithSlot.includes('SLOT:content-index-hero')
    ],
    [
      'a filled hero slot replaces the configured hero',
      !homeWithSlot.includes('vp-blog-content-index-hero') &&
        !homeWithSlot.includes('avatar/abc123') &&
        homeWithSlot.includes('vp-blog-content-list')
    ]
  )

  let failed = 0
  for (const [description, condition] of assertions) {
    if (condition) {
      console.log(`  ok   ${description}`)
    } else {
      failed += 1
      console.log(`  FAIL ${description}`)
    }
  }

  if (failed) {
    console.error(
      `\n${failed} assertion(s) failed against the published artefact`
    )
    process.exit(1)
  }

  console.log('\nThe published artefact works from a real install.')
} finally {
  if (!process.env.KEEP_CONSUMER) {
    rmSync(workspace, { recursive: true, force: true })
  } else {
    console.log(`\nKept ${workspace}`)
  }
}
