import path from 'node:path'
import process from 'node:process'
import { DEFAULT_TARGET, PACKAGE_MANAGERS } from './constants.mjs'

/**
 * The values a template is filled with, and the rules for writing them down.
 *
 * Templating is Eta, so a template says *where* a value goes and this module says how
 * that value has to be spelled once it gets there: a `title` is raw Markdown in the
 * README, a single-quoted TypeScript literal in `config.ts`, and XML-escaped text in
 * `logo.svg`. Those are different questions about the same answer, which is why they
 * live together rather than inside the templates — a template that inserted a title
 * three ways would have to know three syntaxes.
 */

/**
 * A single-quoted TypeScript string literal.
 *
 * The reason this exists rather than `JSON.stringify`: a blog title may legitimately
 * contain a single quote (`'Tis the season`), and the generated `config.ts` has to
 * stay parseable when it does. Double-quoting would also work and would be simpler,
 * but the rest of the generated file is single-quoted, and a scaffold that is
 * inconsistent with itself is a bad first example.
 */
export function quote(value) {
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}'`
}

/**
 * A plain-data value as a TypeScript literal, indented so it can be dropped after a
 * `key: `. Used for `nav` and `footer`, the two structures in the generated config
 * that read better as a literal than as a line per field.
 *
 * A record whose fields are all scalars stays on one line — `{ text: 'About', link:
 * '/about' }` is how a person would write it — while a list gets a line per item, so
 * that adding a third nav entry to the file is an insertion rather than a reflow.
 */
export function literal(value, indent) {
  const pad = ' '.repeat(indent)
  const inner = ' '.repeat(indent + 2)

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const items = value.map((item) => `${inner}${literal(item, indent + 2)}`)
    return `[\n${items.join(',\n')}\n${pad}]`
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).filter(
      ([, item]) => item !== undefined
    )
    if (entries.length === 0) return '{}'

    const scalar = entries.every(
      ([, item]) => item === null || typeof item !== 'object'
    )
    if (scalar) {
      const fields = entries.map(
        ([key, item]) => `${key}: ${literal(item, indent)}`
      )
      return `{ ${fields.join(', ')} }`
    }

    const fields = entries.map(
      ([key, item]) => `${inner}${key}: ${literal(item, indent + 2)}`
    )
    return `{\n${fields.join(',\n')}\n${pad}}`
  }

  if (typeof value === 'string') return quote(value)
  return String(value)
}

export function isoDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** For `aria-label` and anything else that lives inside XML attribute quotes. */
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * For the footer's copyright line, which is the one generated string that ends up
 * inside a Markdown/HTML surface rather than a code file.
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
