import path from 'node:path'
import process from 'node:process'
import { confirm, isInteractive, select, text } from './prompt.mjs'
import { OPTION_DEFAULTS } from './args.mjs'
import {
  DEFAULT_LANG,
  DEFAULT_TARGET,
  PACKAGE_MANAGERS,
  PRESETS,
  PRESET_MARKS,
  THEME_VERSION
} from './constants.mjs'

/**
 * Turning flags and answers into the one object the file set is built from.
 *
 * The interactive path and the flag path must not be two implementations: every
 * question is really "was this told to me?", and the answer is the same value either
 * way. So each field is read once, from `--flag` if present, otherwise from a prompt
 * if there is someone to ask, otherwise from `OPTION_DEFAULTS`.
 */

/**
 * Whether this run will ask anything. `--yes` and a non-TTY shell both answer "no",
 * and the caller says so once rather than at every prompt.
 */
export function willPrompt(args) {
  return !args.yes && isInteractive()
}

/**
 * `my-blog` → `My Blog`.
 *
 * A directory name is the only clue the caller has already given about what the blog
 * is called, so it is used rather than ignored — but it is a guess, and the prompt
 * shows it as the default rather than committing to it.
 */
export function titleFromDirectory(targetDir) {
  const base = path.basename(path.resolve(targetDir))
  const words = base
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  if (words.length === 0) return 'My Blog'

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * A directory name is not necessarily a package name — `My Blog` and `.blog` are both
 * fine directories and neither is a legal `name` — so the two are derived separately
 * rather than forced to agree.
 */
export function packageNameFromDirectory(targetDir) {
  const base = path.basename(path.resolve(targetDir))
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9-~]+/g, '-')
    .replace(/^[-_.]+/, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 214)

  return slug === '' ? DEFAULT_TARGET : slug
}

/**
 * Which package manager the caller is already using.
 *
 * `npm_config_user_agent` is set by every one of them, including when it is the one
 * that launched `npm create`, so it answers the question for the common case without
 * spawning anything. Falling back to npm rather than pnpm because the fallback is
 * reached by being run under something unrecognisable, and npm is the one that is
 * always there.
 */
export function detectPackageManager(
  userAgent = process.env.npm_config_user_agent
) {
  const agent = (userAgent ?? '').toLowerCase()
  for (const manager of PACKAGE_MANAGERS) {
    if (agent.startsWith(manager)) return manager
  }
  return 'npm'
}

function validateDirectory(value) {
  if (value.trim() === '') return 'A directory is required.'
  return undefined
}

function validateTitle(value) {
  if (value.trim() === '') return 'A title is required — it is the nav heading.'
  return undefined
}

function validateBaseUrl(value) {
  if (value === '') return undefined
  if (!/^https?:\/\//i.test(value)) {
    return 'Expected an absolute URL, e.g. https://example.com.'
  }
  return undefined
}

export async function collectAnswers(args) {
  const interactive = willPrompt(args)
  const given = args.options

  let targetDir = args.targetDir
  if (targetDir === undefined) {
    targetDir = interactive
      ? await text({
          message: 'Where should the blog live?',
          initial: DEFAULT_TARGET,
          validate: validateDirectory,
          fallback: DEFAULT_TARGET
        })
      : DEFAULT_TARGET
  }

  const titleDefault = titleFromDirectory(targetDir)

  let title = given.title
  if (title === undefined) {
    title = interactive
      ? await text({
          message: 'Blog title',
          initial: titleDefault,
          validate: validateTitle,
          fallback: titleDefault
        })
      : titleDefault
  }

  let description = given.description
  if (description === undefined) {
    description = interactive
      ? await text({
          message: 'One line describing the blog (optional)',
          initial: OPTION_DEFAULTS.description,
          fallback: OPTION_DEFAULTS.description
        })
      : OPTION_DEFAULTS.description
  }

  let author = given.author
  if (author === undefined) {
    author = interactive
      ? await text({
          message: 'Your name, as the default post author (optional)',
          initial: OPTION_DEFAULTS.author,
          fallback: OPTION_DEFAULTS.author
        })
      : OPTION_DEFAULTS.author
  }

  let baseUrl = given.baseUrl
  if (baseUrl === undefined) {
    baseUrl = interactive
      ? await text({
          message: 'Site origin, needed for the RSS feed (optional)',
          initial: OPTION_DEFAULTS.baseUrl,
          validate: validateBaseUrl,
          fallback: OPTION_DEFAULTS.baseUrl
        })
      : OPTION_DEFAULTS.baseUrl
  }
  // A trailing slash would produce `https://example.com//post` in the Feed.
  baseUrl = baseUrl.replace(/\/+$/, '')

  let lang = given.lang
  if (lang === undefined) {
    lang = interactive
      ? await text({
          message: 'Interface language, as a BCP 47 tag',
          initial: DEFAULT_LANG,
          validate: (value) =>
            value.trim() === '' ? 'A language tag is required.' : undefined,
          fallback: DEFAULT_LANG
        })
      : DEFAULT_LANG
  }

  let preset = given.preset
  if (preset === undefined) {
    preset = interactive
      ? await select({
          message: 'Brand palette',
          initial: PRESETS.indexOf('default'),
          fallback: OPTION_DEFAULTS.preset,
          options: PRESETS.map((name) => ({
            value: name,
            label: name === 'default' ? 'green (the Theme default)' : name,
            hint: PRESET_MARKS[name]
          }))
        })
      : OPTION_DEFAULTS.preset
  }

  let deploy = given.deploy ?? OPTION_DEFAULTS.deploy
  if (interactive && given.deploy === undefined) {
    deploy = await confirm({
      message: 'Write deploy config (GitHub Pages workflow and vercel.json)?',
      initial: true
    })
  }

  // Both of these reach outside the directory that was just created, so the
  // non-interactive default is "no" even though the interactive default is "yes".
  let install = given.install ?? false
  if (interactive && given.install === undefined) {
    install = await confirm({
      message: 'Install dependencies now?',
      initial: true
    })
  }

  let git = given.git ?? false
  if (interactive && given.git === undefined) {
    git = await confirm({
      message: 'Initialise a git repository and make the first commit?',
      initial: true
    })
  }

  return {
    targetDir,
    packageName: packageNameFromDirectory(targetDir),
    title,
    description,
    author,
    baseUrl,
    lang,
    preset,
    deploy,
    install,
    git,
    packageManager: given.packageManager ?? detectPackageManager(),
    themeVersion: given.themeVersion ?? THEME_VERSION
  }
}
