import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  cancel,
  confirm,
  group,
  intro,
  log,
  outro,
  select,
  text
} from '@clack/prompts'

import {
  HELP,
  OPTION_DEFAULTS,
  UsageError,
  npmForwardingHint,
  parseArgs
} from './args.mjs'
import {
  BRAND_PRESET_DIR,
  DEFAULT_LANG,
  DEFAULT_TARGET,
  FALLBACK_PNPM_VERSION,
  NODE_TYPES_VERSION,
  PACKAGE_NAME,
  PRESETS,
  PRESET_MARKS,
  THEME_PACKAGE,
  THEME_VERSION,
  VITEPRESS_VERSION,
  VUE_VERSION
} from './constants.mjs'
import { detectPnpmVersion, initGit, installDependencies } from './install.mjs'
import { template } from './templates.mjs'
import {
  detectPackageManager,
  escapeHtml,
  escapeXml,
  isoDate,
  literal,
  packageNameFromDirectory,
  quote,
  titleFromDirectory
} from './values.mjs'

/**
 * The run, and the Site it writes.
 *
 * This is one file on purpose, the way VitePress's own `init.ts` is one file: the
 * questions, the answers they produce and the files those answers become are the same
 * decision seen at three moments, and splitting them across modules means a reader has
 * to hold three signatures in their head to know what a scaffold does. `init` asks and
 * orchestrates; `scaffold` turns answers into a directory.
 */

const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)

/** What each package manager calls the scripts the generated README documents. */
const INSTALL_COMMAND = {
  pnpm: 'pnpm install',
  npm: 'npm install',
  yarn: 'yarn install',
  bun: 'bun install'
}

const BUILD_COMMAND = {
  pnpm: 'pnpm build',
  npm: 'npm run build',
  yarn: 'yarn build',
  bun: 'bun run build'
}

const DEV_COMMAND = {
  pnpm: 'pnpm dev',
  npm: 'npm run dev',
  yarn: 'yarn dev',
  bun: 'bun run dev'
}

/** What the generated README says when the Site states no description of its own. */
const README_DESCRIPTION_FALLBACK = `A blog built with VitePress and the ${THEME_PACKAGE} theme.`

/**
 * Whether there is a human on the other end.
 *
 * Both ends are checked because a prompt is written to stdout and the answer read from
 * stdin: redirecting either one means the visible prompt and the typed answer no longer
 * meet, and the questions would be noise in a log.
 */
export function isInteractive(input = process.stdin, output = process.stdout) {
  return Boolean(input.isTTY && output.isTTY)
}

/**
 * What is at `dir` right now. `occupied` is not an error by itself — only the caller
 * knows whether `--force` was passed, and the distinction is worth a named state
 * rather than a boolean.
 */
export function targetState(dir) {
  if (!existsSync(dir)) return 'absent'
  if (!statSync(dir).isDirectory()) return 'not-a-directory'
  return readdirSync(dir).length === 0 ? 'empty' : 'occupied'
}

function validateDirectory(value) {
  if (value.trim() === '') return 'A directory is required.'
  return undefined
}

function validateTitle(value) {
  if (value.trim() === '') return 'A title is required — it is the nav heading.'
  return undefined
}

function validateorigin(value) {
  if (value === '') return undefined
  if (!/^https?:\/\//i.test(value)) {
    return 'Expected an absolute URL, e.g. https://example.com.'
  }
  return undefined
}

function validateLang(value) {
  if (value.trim() === '') return 'A language tag is required.'
  return undefined
}

/**
 * The answers, from the flags or from a person.
 *
 * `interactive` is passed rather than discovered so that a test can pin the CI path:
 * with no TTY every prompt answers from the default it was given, which is what lets
 * `npm create` run unattended. The flags win either way, so a `--title` and a typed
 * title arrive as the same value.
 */
export async function collectAnswers(args, interactive = isInteractive()) {
  const given = args.options

  // `@clack/prompts` needs a terminal; without one the same questions are answered
  // from their defaults. The three wrappers are the only place that difference lives.
  const askText = (options) =>
    interactive ? text(options) : (options.initialValue ?? '')
  const askSelect = (options) =>
    interactive ? select(options) : options.initialValue
  const askConfirm = (options) =>
    interactive ? confirm(options) : (options.initialValue ?? true)

  const answers = await group(
    {
      targetDir: async () =>
        args.targetDir ??
        askText({
          message: 'Where should the blog live?',
          initialValue: DEFAULT_TARGET,
          validate: validateDirectory
        }),

      packageName: async ({ results }) =>
        packageNameFromDirectory(results.targetDir),

      title: async ({ results }) =>
        given.title ??
        askText({
          message: 'Blog title',
          initialValue: titleFromDirectory(results.targetDir),
          validate: validateTitle
        }),

      description: async () =>
        given.description ??
        askText({
          message: 'One line describing the blog (optional)',
          initialValue: OPTION_DEFAULTS.description
        }),

      author: async () =>
        given.author ??
        askText({
          message: 'Your name, as the default post author (optional)',
          initialValue: OPTION_DEFAULTS.author
        }),

      origin: async () =>
        given.origin ??
        askText({
          message: 'Site origin, needed for the RSS feed (optional)',
          initialValue: OPTION_DEFAULTS.origin,
          validate: validateorigin
        }),

      lang: async () =>
        given.lang ??
        askText({
          message: 'Interface language, as a BCP 47 tag',
          initialValue: DEFAULT_LANG,
          validate: validateLang
        }),

      preset: async () =>
        given.preset ??
        askSelect({
          message: 'Brand palette',
          initialValue: OPTION_DEFAULTS.preset,
          options: PRESETS.map((name) => ({
            value: name,
            label: name === 'default' ? 'green (the Theme default)' : name,
            hint: PRESET_MARKS[name]
          }))
        }),

      deploy: async () =>
        given.deploy ??
        askConfirm({
          message:
            'Write deploy config (GitHub Pages workflow and vercel.json)?',
          initialValue: true
        }),

      // Both of these reach outside the directory that was just created, so the
      // non-interactive default is "no" even though the interactive default is "yes".
      install: async () =>
        given.install ??
        (interactive
          ? confirm({
              message: 'Install dependencies now?',
              initialValue: true
            })
          : false),

      git: async () =>
        given.git ??
        (interactive
          ? confirm({
              message: 'Initialise a git repository and make the first commit?',
              initialValue: true
            })
          : false)
    },
    {
      onCancel: () => {
        cancel('Cancelled.')
        process.exit(0)
      }
    }
  )

  return {
    ...answers,
    // A trailing slash would produce `https://example.com//post` in the Feed.
    origin: answers.origin.replace(/\/+$/, ''),
    packageManager: given.packageManager ?? detectPackageManager(),
    themeVersion: given.themeVersion ?? THEME_VERSION
  }
}

/**
 * Write the Site the answers describe.
 *
 * Per file, the way VitePress's own scaffolder does it: render the template, make the
 * directory it needs, write it. There is no intermediate map of paths to contents, and
 * no path check — every template name is a literal in the list below, so there is
 * nothing to climb out with.
 *
 * `today` and `pnpmVersion` are parameters rather than reads of the clock and the
 * machine so that a test can say what day it is and which pnpm is installed.
 */
export async function scaffold(options) {
  const {
    target,
    title,
    description = '',
    author = '',
    origin = '',
    lang = DEFAULT_LANG,
    preset = OPTION_DEFAULTS.preset,
    packageName,
    packageManager = 'npm',
    themeVersion = THEME_VERSION,
    deploy = true,
    today = new Date(),
    pnpmVersion = FALLBACK_PNPM_VERSION
  } = options

  const resolvedTarget = path.resolve(target)
  const year = today.getFullYear()

  // `external` takes the Feed out of VitePress's client router, which would otherwise
  // read `/feed.rss` as a page route and answer with the 404 page instead of the Feed.
  const nav = [{ text: 'About', link: '/about' }]
  if (origin) {
    nav.push({ text: 'RSS Feed', link: '/feed.rss', external: true })
  }

  const footer = { text: `© ${year} ${escapeHtml(author || title)}` }
  if (origin) {
    footer.items = [{ text: 'RSS Feed', link: '/feed.rss', external: true }]
  }

  const data = {
    title,
    description,
    author,
    origin,
    lang,
    preset,
    packageName,
    packageManager,
    themeVersion,
    deploy,
    date: isoDate(today),
    year,
    nav,
    footer,
    pnpmVersion,
    themePackage: THEME_PACKAGE,
    brandPresetDir: BRAND_PRESET_DIR,
    vitepressVersion: VITEPRESS_VERSION,
    vueVersion: VUE_VERSION,
    nodeTypesVersion: NODE_TYPES_VERSION,
    installCommand: INSTALL_COMMAND[packageManager],
    buildCommand: BUILD_COMMAND[packageManager],
    devCommand: DEV_COMMAND[packageManager],
    logoFill: PRESET_MARKS[preset] ?? PRESET_MARKS.default,
    logoInitial: (title.trim().charAt(0) || 'B').toUpperCase(),
    readmeDescription: README_DESCRIPTION_FALLBACK,
    // The spelling rules, in scope for the templates that need them.
    quote,
    literal,
    json: JSON.stringify,
    xml: escapeXml,
    html: escapeHtml
  }

  const files = [
    'index.md',
    'about.md',
    'posts/hello-world.md',
    'posts/a-draft.md',
    '.vitepress/config.ts',
    '.vitepress/theme/index.ts',
    '.vitepress/theme/theme.css',
    'public/logo.svg',
    'tsconfig.json',
    '.gitignore',
    'package.json',
    'README.md'
  ]

  if (deploy) {
    files.push('.github/workflows/deploy.yml', 'vercel.json')
  }

  const written = []

  for (const file of files) {
    const filePath = path.resolve(resolvedTarget, file)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, template(file, data))
    written.push(file)
  }

  return written
}

/**
 * The whole run, in order.
 *
 * It both prints and returns a summary, deliberately: the shape of a run is worth
 * testing, and a function whose only output is `process.exit` cannot be asked what it
 * did. The exit code is still set here, because that is the part the shell sees.
 */
export async function init(argv = process.argv.slice(2), options = {}) {
  const cwd = options.cwd ?? process.cwd()
  const stdin = options.stdin ?? process.stdin
  const stdout = options.stdout ?? process.stdout

  let args
  try {
    args = parseArgs(argv)
  } catch (error) {
    if (!(error instanceof UsageError)) throw error
    process.exitCode = 1
    log.error(error.message)
    const hint = npmForwardingHint()
    if (hint) log.warn(hint)
    log.info('Run with --help to see the options.')
    return { ok: false, reason: error.message }
  }

  if (args.help) {
    stdout.write(HELP)
    return { ok: true, help: true }
  }

  if (args.version) {
    stdout.write(`${manifest.version}\n`)
    return { ok: true, version: true }
  }

  const interactive = !args.yes && isInteractive(stdin, stdout)

  intro(`${PACKAGE_NAME} v${manifest.version}`)

  if (!interactive && !args.yes) {
    log.info(
      'No TTY was found, so the defaults are used. Flags choose anything else.'
    )
  }

  // A flag npm swallowed leaves no error behind, only a question that should not have
  // been asked, so the hint belongs where a prompt is about to be.
  if (interactive) {
    const hint = npmForwardingHint()
    if (hint) log.warn(hint)
  }

  const answers = await collectAnswers(args, interactive)

  const target = path.resolve(cwd, answers.targetDir)
  const relativeTarget = path.relative(cwd, target) || '.'
  const state = targetState(target)

  // `.` resolves to wherever the caller is standing, which is a normal thing to want;
  // a directory holding their shell state is `occupied` by then, so this covers it too.
  if (state === 'not-a-directory') {
    const reason = `${target} exists and is not a directory`
    log.error(`${reason}.`)
    process.exitCode = 1
    return { ok: false, reason }
  }

  if (state === 'occupied' && !args.force) {
    const reason =
      `${target} is not empty. Pass --force to write into it — only the files this ` +
      'scaffolder generates are overwritten, and nothing is deleted.'
    log.error(reason)
    process.exitCode = 1
    return { ok: false, reason }
  }

  const written = await scaffold({
    target,
    ...answers,
    today: options.today ?? new Date(),
    pnpmVersion: options.pnpmVersion ?? detectPnpmVersion()
  })

  log.success(`${written.length} files written to ${relativeTarget}/`)

  if (answers.install) {
    log.step(`Installing dependencies with ${answers.packageManager}...`)
    const installed = installDependencies(target, answers.packageManager)
    if (!installed.ok) {
      log.warn(`${installed.reason}. Run the install yourself.`)
    }
  }

  if (answers.git) {
    const committed = initGit(target)
    if (!committed.ok) log.warn(`git: ${committed.reason}`)
  }

  outro(nextSteps(answers, relativeTarget))

  return { ok: true, answers, target, written }
}

/** What the caller does after the scaffold: where to stand and what to run. */
function nextSteps(answers, relativeTarget) {
  const lines = ['Done. Next steps:']

  if (relativeTarget !== '.') lines.push(`  cd ${relativeTarget}`)
  if (!answers.install)
    lines.push(`  ${INSTALL_COMMAND[answers.packageManager]}`)
  lines.push(`  ${DEV_COMMAND[answers.packageManager]}`)
  lines.push('')
  lines.push(
    `The Blog itself is configured in ${path.join(relativeTarget, '.vitepress/config.ts')}.`
  )

  const todos = []
  if (!answers.author) todos.push('name the default author')
  if (!answers.origin) todos.push('set origin to get the RSS feed')

  if (todos.length > 0) {
    lines.push('')
    lines.push(
      `Still to do: ${todos.join(', ')} — the config has a commented line for each.`
    )
  }

  return lines.join('\n')
}
