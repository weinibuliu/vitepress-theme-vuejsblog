import process from 'node:process'
import { DEFAULT_LANG, PACKAGE_MANAGERS, PRESETS } from './constants.mjs'

/**
 * Command-line parsing.
 *
 * Hand-written rather than delegated, for one reason: the flags are part of this
 * package's published interface, so they should be readable in one place rather than
 * inferred from a library's conventions. The prompts and the templates do use
 * libraries — `@clack/prompts` and `eta` — but those are about how a question is asked
 * and how a file is filled, not about what this CLI accepts.
 */

/**
 * A problem with the command line itself — as opposed to a problem with the
 * filesystem. The caller prints these without a stack, because a mistyped flag is a
 * message, not a crash.
 */
export class UsageError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UsageError'
  }
}

/**
 * `--flag` with no value, landing on the result itself. These are the flags that
 * describe the run rather than the Site.
 */
const BOOLEAN_FLAGS = {
  '-y': ['yes', true],
  '--yes': ['yes', true],
  '-f': ['force', true],
  '--force': ['force', true],
  '-h': ['help', true],
  '--help': ['help', true],
  '-v': ['version', true],
  '--version': ['version', true]
}

/**
 * `--flag` with no value, landing under `options[key]` — the same place a prompt's
 * answer goes, so that "was I told this?" has one answer whichever way it was told.
 * `--no-install` needs no special case beyond its literal here.
 */
const OPTION_BOOLEAN_FLAGS = {
  '--install': ['install', true],
  '--no-install': ['install', false],
  '--git': ['git', true],
  '--no-git': ['git', false],
  '--deploy': ['deploy', true],
  '--no-deploy': ['deploy', false]
}

/**
 * `--flag <value>`, landing under `options[key]`.
 */
const VALUE_FLAGS = {
  '-t': 'title',
  '--title': 'title',
  '-d': 'description',
  '--description': 'description',
  '-a': 'author',
  '--author': 'author',
  '-u': 'baseUrl',
  '--base-url': 'baseUrl',
  '--lang': 'lang',
  '--preset': 'preset',
  '--package-manager': 'packageManager',
  '--theme-version': 'themeVersion'
}

/**
 * Parse an argv slice — `process.argv.slice(2)`, so no program name.
 *
 * The one positional is the target directory, matching every other `create-`
 * package: `npm create vitepress-theme-vuejsblog my-blog`.
 */
export function parseArgs(argv) {
  const result = {
    targetDir: undefined,
    yes: false,
    force: false,
    help: false,
    version: false,
    options: {}
  }

  const positional = []

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index]

    // npm forwards a lone `--` when the caller used one to separate npm's own flags
    // from ours; it carries no meaning here.
    if (raw === '--') continue

    if (raw.startsWith('-') && raw !== '-') {
      let flag = raw
      let inlineValue

      const equals = raw.indexOf('=')
      if (equals !== -1) {
        flag = raw.slice(0, equals)
        inlineValue = raw.slice(equals + 1)
      }

      const boolean = BOOLEAN_FLAGS[flag]
      if (boolean) {
        if (inlineValue !== undefined) {
          throw new UsageError(`${flag} does not take a value`)
        }
        const [key, value] = boolean
        result[key] = value
        continue
      }

      const optionBoolean = OPTION_BOOLEAN_FLAGS[flag]
      if (optionBoolean) {
        if (inlineValue !== undefined) {
          throw new UsageError(`${flag} does not take a value`)
        }
        const [key, value] = optionBoolean
        result.options[key] = value
        continue
      }

      const valueKey = VALUE_FLAGS[flag]
      if (valueKey) {
        const value = inlineValue ?? argv[(index += 1)]
        if (value === undefined) {
          throw new UsageError(`Missing value for ${flag}`)
        }
        result.options[valueKey] = value
        continue
      }

      throw new UsageError(
        `Unknown option ${flag}. Run with --help to see them.`
      )
    }

    positional.push(raw)
  }

  if (positional.length > 1) {
    throw new UsageError(
      `Expected at most one directory, got ${positional.length}: ${positional.join(', ')}`
    )
  }

  result.targetDir = positional[0]

  validate(result)

  return result
}

function validate(args) {
  const { preset, packageManager, baseUrl, lang } = args.options

  if (preset !== undefined && !PRESETS.includes(preset)) {
    throw new UsageError(
      `Unknown preset "${preset}". Choose one of: ${PRESETS.join(', ')}.`
    )
  }

  if (
    packageManager !== undefined &&
    !PACKAGE_MANAGERS.includes(packageManager)
  ) {
    throw new UsageError(
      `Unknown package manager "${packageManager}". Choose one of: ${PACKAGE_MANAGERS.join(', ')}.`
    )
  }

  if (baseUrl !== undefined && !/^https?:\/\//i.test(baseUrl)) {
    throw new UsageError(
      `--base-url must start with http:// or https://, got "${baseUrl}".`
    )
  }

  if (lang !== undefined && lang.trim() === '') {
    throw new UsageError('--lang must not be empty.')
  }
}

/**
 * The defaults a `--yes` run — and a non-TTY shell — falls back to.
 *
 * `install` and `git` are absent on purpose: both write outside the directory this
 * package just created, and a scaffold that ran them because a prompt was skipped
 * would be doing something the caller never asked for. They are opt-in through their
 * flags, and opt-out through their prompts.
 */
export const OPTION_DEFAULTS = {
  description: '',
  author: '',
  baseUrl: '',
  lang: DEFAULT_LANG,
  preset: 'default',
  deploy: true
}

/**
 * The one way these flags go missing before they arrive.
 *
 * `npm create` parses the command line first, and `--yes`, `--force`, `--install` and
 * `--help` are all names npm answers to itself — so they are read as npm's own config
 * and this process never sees them. What npm does forward is everything after a lone
 * `--`, which is why every other `create-` package's README asks for one. `npm create`
 * is `npm init`, so `npm_command=init` is npm saying that is what happened.
 *
 * Read from the environment but passed in, so that a test can say what npm was.
 */
export function npmForwardingHint(env = process.env) {
  if (env.npm_command !== 'init') return undefined
  return (
    'npm keeps the flags it recognises for itself, so they never reach this CLI.\n' +
    'Pass them after a --:  npm create vitepress-theme-vuejsblog my-blog -- --yes'
  )
}

export const HELP = `Scaffold a VitePress blog that uses the vitepress-theme-vuejsblog theme.

Usage
  npm create vitepress-theme-vuejsblog [directory] [options]
  pnpm create vitepress-theme-vuejsblog [directory] [options]

  npm answers to --yes, --force and --help itself, so through npm the flags come
  after a lone --:  npm create vitepress-theme-vuejsblog my-blog -- --yes
  pnpm, yarn and bun forward them directly.

  The directory defaults to "my-blog". Without --yes the CLI asks for everything it
  was not told; in a shell with no TTY it uses the defaults instead of hanging.

Options
  -y, --yes                  Skip every prompt and use the defaults
  -f, --force                Write into a non-empty directory. Only the files this
                             scaffolder generates are overwritten
  -t, --title <text>         Blog title. Defaults to the directory name, title-cased
  -d, --description <text>   One line describing the blog
  -a, --author <text>        Default Author for posts that credit none
  -u, --base-url <url>       Site origin, e.g. https://example.com. The Feed needs it
      --lang <tag>           Interface and date language. Defaults to "en"
      --preset <name>        Brand palette: ${PRESETS.join(', ')}
      --package-manager <m>  ${PACKAGE_MANAGERS.join(', ')}. Defaults to the one running this
      --theme-version <range>
                             Override the vitepress-theme-vuejsblog version range
      --install              Install dependencies after scaffolding
      --no-install           Do not install dependencies
      --git                  Initialise a git repository and commit
      --no-git               Leave git alone
      --deploy               Write the deploy config (default)
      --no-deploy            Write no deploy config
  -h, --help                 Show this help
  -v, --version              Show the version
`
