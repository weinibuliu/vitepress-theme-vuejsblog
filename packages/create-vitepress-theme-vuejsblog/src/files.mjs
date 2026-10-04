import {
  BRAND_PRESET_DIR,
  NODE_TYPES_VERSION,
  PRESET_MARKS,
  THEME_PACKAGE,
  VITEPRESS_VERSION,
  VUE_VERSION
} from './constants.mjs'
import { template } from './templates.mjs'

/**
 * The Site a scaffold produces, as a map of relative path to file contents.
 *
 * Returning the file set instead of writing it is what makes the scaffolder testable
 * without a filesystem: `createFiles` is a pure function of the answers, and
 * `__tests__/files.test.mjs` can assert on the exact text of a config, including that
 * a value with a quote in it cannot break out of its string literal.
 *
 * The files themselves live in `templates/`, one per generated file, named after the
 * file they become and filled through `%s` placeholders — see `templates.mjs`. This
 * module is then only the two things a template cannot say: which answers become which
 * values, and which of two blocks applies. The prose a reader of the generated Site
 * ends up reading is in the templates, where it can be read and edited as prose.
 *
 * A block that exists only in one case is a `templates/partials/` file, not a string
 * built here. The exceptions are values rather than documents — a line like
 * `  description: '…',`, which is data dressed in punctuation — and they are written
 * where they are used, newline included, because the renderer substitutes text and
 * nothing else. A value that fills whole lines therefore ends with the newline that
 * ends its last line.
 */

/**
 * What the generated README says when the Site states no description of its own. A
 * default value rather than a document, so it stays beside the other values.
 */
const README_DESCRIPTION_FALLBACK = `A blog built with VitePress and the ${THEME_PACKAGE} theme.`

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

export function createFiles(answers, options = {}) {
  const today = options.today ?? new Date()
  const date = isoDate(today)
  const year = today.getFullYear()

  const files = {
    'package.json': packageFile(answers),
    'tsconfig.json': template('tsconfig.json'),
    '.gitignore': template('.gitignore'),
    'README.md': readmeFile(answers, date),
    'index.md': template('index.md'),
    'about.md': aboutPage(answers),
    'posts/hello-world.md': template('posts/hello-world.md', [date, date]),
    'posts/a-draft.md': template('posts/a-draft.md', [date]),
    '.vitepress/config.ts': configFile(answers, year),
    '.vitepress/theme/index.ts': template('.vitepress/theme/index.ts', [
      THEME_PACKAGE
    ]),
    '.vitepress/theme/theme.css': themeCss(answers.preset),
    'public/logo.svg': logoFile(answers)
  }

  if (answers.deploy) {
    files['.github/workflows/deploy.yml'] = deployWorkflow(
      answers.packageManager
    )
    files['vercel.json'] = template('vercel.json', [
      JSON.stringify(BUILD_COMMAND[answers.packageManager])
    ])
  }

  return files
}

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

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

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/* -------------------------------------------------------------------------- */
/* generated files                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The manifest is JSON, so every value is `JSON.stringify`d rather than quoted: the
 * package name comes from a directory the caller named, and a name with a quote or a
 * backslash in it must not be able to break the manifest. The keys are constants and
 * cannot.
 */
function packageFile(answers) {
  return template('package.json', [
    JSON.stringify(answers.packageName),
    JSON.stringify(NODE_TYPES_VERSION),
    JSON.stringify(VITEPRESS_VERSION),
    JSON.stringify(THEME_PACKAGE),
    JSON.stringify(answers.themeVersion),
    JSON.stringify(VUE_VERSION)
  ])
}

function configFile(answers, year) {
  // The three fields under `themeConfig.blog` that only exist when there is an answer
  // for them. Each entry carries its own newline, because the template hands the group
  // a region rather than a line, and the two that have no answer are a block of prose
  // telling the author what to write — a partial, so the words live with the words.
  const blogFields = []

  if (answers.description) {
    blogFields.push(`      description: ${quote(answers.description)},\n`)
  }

  blogFields.push(
    answers.baseUrl
      ? `      baseUrl: ${quote(answers.baseUrl)},\n`
      : template('partials/config-base-url-todo')
  )

  blogFields.push(
    answers.author
      ? `      author: { name: ${quote(answers.author)} },\n`
      : template('partials/config-author-todo')
  )

  const nav = [{ text: 'About', link: '/about' }]
  // `external` takes the Feed out of VitePress's client router, which would otherwise read
  // `/feed.rss` as a page route and answer with the 404 page instead of the Feed itself.
  if (answers.baseUrl) {
    nav.push({ text: 'RSS Feed', link: '/feed.rss', external: true })
  }

  const footer = {
    text: `© ${year} ${escapeHtml(answers.author || answers.title)}`
  }
  if (answers.baseUrl) {
    footer.links = [{ text: 'RSS Feed', link: '/feed.rss', external: true }]
  }

  return template('.vitepress/config.ts', [
    THEME_PACKAGE,
    THEME_PACKAGE,
    THEME_PACKAGE,
    quote(answers.title),
    answers.description
      ? `  description: ${quote(answers.description)},\n`
      : '',
    quote(answers.lang),
    quote(answers.title),
    blogFields.join(''),
    literal(nav, 6),
    literal(footer, 6),
    quote(answers.lang)
  ])
}

function themeCss(preset) {
  // Which header a Site gets is the only branch in this file, and both variants are
  // the same shape: a comment explaining the choice, then one import line.
  const header =
    preset === 'default'
      ? template('partials/theme-default-header', [BRAND_PRESET_DIR])
      : template('partials/theme-preset-header', [
          preset,
          BRAND_PRESET_DIR,
          preset
        ])

  return template('.vitepress/theme/theme.css', [header])
}

function logoFile(answers) {
  const initial = (answers.title.trim().charAt(0) || 'B').toUpperCase()
  const fill = PRESET_MARKS[answers.preset] ?? PRESET_MARKS.default

  return template('public/logo.svg', [
    escapeXml(answers.title),
    fill,
    escapeXml(initial)
  ])
}

function deployWorkflow(packageManager) {
  const setup = []

  if (packageManager === 'pnpm') {
    // `pnpm/action-setup` refuses to run without a version, and reading the caller's
    // own is more likely to match the lockfile they are about to commit than a
    // literal chosen here would be.
    setup.push('      - name: Setup pnpm')
    setup.push('        uses: pnpm/action-setup@v6.1.0')
    setup.push('        with:')
    setup.push(`          cache: true`)
  } else if (packageManager === 'bun') {
    setup.push('      - name: Setup bun')
    setup.push('        uses: oven-sh/setup-bun@v2.2.0')
  }

  if (packageManager !== 'bun') {
    setup.push('      - name: Setup Node')
    setup.push('        uses: actions/setup-node@v6.5.0')
    setup.push('        with:')
    setup.push('          node-version: 22')
  }

  // Deliberately no `cache:` — it fails outright when the lock file is missing, and
  // this workflow is committed before the first install may have happened. The note in
  // the generated file says how to turn it on once that is no longer true.
  return template('.github/workflows/deploy.yml', [
    `${setup.join('\n')}\n`,
    packageManager,
    INSTALL_COMMAND[packageManager],
    BUILD_COMMAND[packageManager]
  ])
}

function aboutPage(answers) {
  return template('about.md', [
    answers.author ? `\n\nWritten by ${answers.author}.` : ''
  ])
}

function readmeFile(answers, date) {
  const pm = answers.packageManager
  const sections = []

  // The order is the order they are read in: what the Site has not been given yet,
  // then how it looks. Each partial ends with its own newline, and a blank line is
  // added after it so the sections stay apart whatever combination applies.
  if (!answers.author) sections.push(template('partials/readme-author-note'))
  if (!answers.baseUrl) sections.push(template('partials/readme-feed-section'))
  if (answers.deploy) sections.push(template('partials/readme-deploy-section'))
  if (answers.preset !== 'default') {
    sections.push(template('partials/readme-preset-section', [answers.preset]))
  }

  return template('README.md', [
    answers.title,
    answers.description || README_DESCRIPTION_FALLBACK,
    INSTALL_COMMAND[pm],
    DEV_COMMAND[pm],
    BUILD_COMMAND[pm],
    date,
    sections.map((section) => `${section}\n`).join('')
  ])
}
