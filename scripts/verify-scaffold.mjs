import { execFileSync, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Scaffold a Site with `vitepress-theme-vuejsblog init` and build it.
 *
 * The unit tests say what the generated files contain; only a build says the Site they
 * describe is a Site. Everything here is checked against VitePress's own output, so a
 * config that reads correctly but does not typecheck, a preset import that Vite cannot
 * resolve, or a Feed that never gets written all fail here rather than in the hands of
 * whoever ran `npx vitepress-theme-vuejsblog init` first.
 *
 * The generated Site is linked to the workspace Theme rather than installed from a
 * registry: `verify-package.mjs` already covers the registry path for the Theme
 * itself, and this check is about the scaffolder's output.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cli = path.join(root, 'packages/theme/cli/bin.mjs')
const theme = path.join(root, 'packages/theme')
const workspace = path.join(root, 'node_modules/.verify-scaffold')
const site = path.join(workspace, 'my-blog')
const dist = path.join(site, '.vitepress/dist')

const TITLE = 'Verify Blog'
const DESCRIPTION = 'A Site built to check the scaffolder.'
const AUTHOR = 'A Verifier'
const ORIGIN = 'https://example.com'

let checks = 0
let failures = 0

function step(name) {
  console.log(`\n${name}`)
}

function check(name, condition, detail) {
  checks += 1
  if (condition) {
    console.log(`  ok   ${name}${detail ? `  (${detail})` : ''}`)
  } else {
    failures += 1
    console.log(`  FAIL ${name}${detail ? `  (${detail})` : ''}`)
  }
}

/**
 * The arguments for a full scaffold. `--force` regenerates rather than merges, so the
 * forced run below has to be given the same answers as the first or it would prove the
 * build works on a Site nobody asked for.
 */
function scaffoldArgs(overrides = {}, flags = []) {
  const values = {
    '--title': TITLE,
    '--description': DESCRIPTION,
    '--author': AUTHOR,
    '--base-url': ORIGIN,
    '--preset': 'rose',
    '--package-manager': 'pnpm',
    ...overrides
  }

  return [
    'my-blog',
    '--yes',
    ...Object.entries(values).flat(),
    ...flags,
    '--no-install',
    '--no-git'
  ]
}

/** Run the scaffolder CLI and report how it ended, without throwing on a non-zero exit. */
function scaffold(args, options = {}) {
  const result = spawnSync('node', [cli, 'init', ...args], {
    cwd: options.cwd ?? workspace,
    encoding: 'utf8'
  })
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  }
}

function read(...parts) {
  return readFileSync(path.join(dist, ...parts), 'utf8')
}

if (!existsSync(path.join(theme, 'dist/index.js'))) {
  console.error(
    'The Theme has not been built. Run `pnpm --filter vitepress-theme-vuejsblog build` first.'
  )
  process.exit(1)
}

rmSync(workspace, { recursive: true, force: true })
mkdirSync(workspace, { recursive: true })

try {
  step('Scaffolding a Site')

  const created = scaffold(scaffoldArgs())

  check(
    'the scaffolder exits cleanly',
    created.status === 0,
    created.stderr.trim()
  )

  const expected = [
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
  ]

  const present = expected.filter((file) => existsSync(path.join(site, file)))
  check(
    'every generated file is on disk',
    present.length === expected.length,
    `${present.length}/${expected.length}`
  )

  step('Refusing to write over an occupied directory')

  const before = readFileSync(path.join(site, '.vitepress/config.ts'), 'utf8')
  const refused = scaffold(scaffoldArgs({ '--title': 'Should Not Land' }))

  check(
    'a second run without --force fails',
    refused.status === 1,
    `exit ${refused.status}`
  )
  check(
    'and leaves the Site untouched',
    readFileSync(path.join(site, '.vitepress/config.ts'), 'utf8') === before
  )

  step('--force overwrites its own files and nothing else')

  writeFileSync(path.join(site, 'mine.md'), 'a file the author put here')
  const forced = scaffold(scaffoldArgs({}, ['--force']))

  check('--force succeeds', forced.status === 0, `exit ${forced.status}`)
  check(
    'a file it did not generate survives',
    existsSync(path.join(site, 'mine.md'))
  )
  check(
    'and the generated config was replaced',
    readFileSync(path.join(site, '.vitepress/config.ts'), 'utf8').includes(
      TITLE
    )
  )

  // `mine.md` would be scaffolded into the Site's own Markdown, and VitePress would
  // happily render it. Removed so the build below sees only what was generated.
  rmSync(path.join(site, 'mine.md'))

  step('Building the generated Site')

  const nodeModules = path.join(site, 'node_modules')
  mkdirSync(nodeModules, { recursive: true })
  const linkType = process.platform === 'win32' ? 'junction' : 'dir'
  for (const [name, target] of [
    ['vitepress', path.join(root, 'node_modules/vitepress')],
    ['vue', path.join(root, 'node_modules/vue')],
    ['vitepress-theme-vuejsblog', theme]
  ]) {
    symlinkSync(target, path.join(nodeModules, name), linkType)
  }

  let buildOutput = ''
  let buildFailed = false
  try {
    buildOutput = execFileSync(
      'node',
      [
        path.join(root, 'node_modules/vitepress/bin/vitepress.js'),
        'build',
        site
      ],
      { cwd: site, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    )
  } catch (error) {
    buildFailed = true
    buildOutput = `${error.stdout ?? ''}\n${error.stderr ?? ''}`
  }

  check('vitepress build succeeds', !buildFailed)
  if (buildFailed) {
    console.error(`\n${buildOutput}`)
    throw new Error('the generated Site did not build')
  }

  step('What the build produced')

  check('the index was written', existsSync(path.join(dist, 'index.html')))
  check(
    'the Post was written',
    existsSync(path.join(dist, 'posts/hello-world.html'))
  )
  check('the Page was written', existsSync(path.join(dist, 'about.html')))
  check('the nav logo was copied', existsSync(path.join(dist, 'logo.svg')))
  // Both pages exist even though neither is in the Blog: `posts/a-draft.md` is a
  // Draft, and a Draft is kept out of the list, not out of the build.
  check(
    'the Draft still renders',
    existsSync(path.join(dist, 'posts/a-draft.html'))
  )

  const home = read('index.html')
  const post = read('posts/hello-world.html')

  check('the Blog title reached the page', home.includes(TITLE))
  check('the Post is listed', home.includes('Hello, world'))
  check('the Draft is not listed', !home.includes('A draft'))
  // The byline is on the Post, not on the index: the index shows a date and a title.
  check('the byline names the configured Author', post.includes(AUTHOR))
  check('the Post body was rendered', post.includes('Writing the next one'))
  check('the favicon is the generated mark', home.includes('/logo.svg'))
  check('the nav link was rendered', home.includes('href="/about"'))

  const feed = read('feed.rss')

  check('the Feed was written', feed.includes('<rss'))
  check('its links are absolute', feed.includes(`${ORIGIN}/posts/hello-world`))
  check('it carries the Post', feed.includes('Hello, world'))
  check('and leaves the Draft out', !feed.includes('A draft'))

  const assets = path.join(dist, 'assets')
  const css = readdirSync(assets)
    .filter((name) => name.endsWith('.css'))
    .map((name) => read('assets', name))
    .join('\n')

  // The preset is a file inside the Theme's package, reached by a bare `@import` from
  // the Site's own CSS. If Vite did not resolve it, the Site silently keeps the Theme's
  // default green and nothing else would notice — so the check is not merely that the
  // preset is in the bundle, but that it is declared after the default it overrides.
  // Both values are the light-mode `--vp-c-brand-1`; the dark-mode ones differ per mode
  // and cannot be compared this way.
  check('the rose preset reached the built CSS', /be123c/i.test(css), 'rose')
  check(
    'and overrides the Theme default rather than the other way round',
    css.indexOf('#be123c') > css.lastIndexOf('#18794e')
  )
} catch (error) {
  if (
    error instanceof Error &&
    error.message !== 'the generated Site did not build'
  ) {
    console.error(`\n${error.stack}`)
    failures += 1
  }
} finally {
  if (!process.env.KEEP_SCAFFOLD) {
    rmSync(workspace, { recursive: true, force: true })
  } else {
    console.log(`\nKept ${workspace}`)
  }
}

console.log(`\n${checks - failures}/${checks} checks passed`)
if (failures) process.exit(1)
