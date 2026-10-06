import { readFileSync } from 'node:fs'

import { Eta } from 'eta'

/**
 * The Site's files, as files.
 *
 * Templates are Eta, so a template can decide for itself what it says when a value is
 * missing: `<% if (origin) { %>` is the whole of "the Feed link only exists when
 * there is a Feed". The alternative — every branch assembled in JavaScript and handed
 * to a template as a pre-chewed string — puts the prose somewhere other than the file
 * a reader will actually read. Values arrive raw; `values.mjs` explains how each one
 * has to be spelled.
 *
 * A template is named after the file it becomes, plus `.tpl`:
 * `templates/.vitepress/config.ts.tpl` is written to `.vitepress/config.ts`. The suffix
 * is not decoration, and it is why the mapping is not simply `templates/<path>`. A file
 * called `.gitignore` inside a published tarball is not the file you wrote — npm drops
 * it on the way out, which `npm pack` will confirm — so the template cannot always carry
 * the output's name. `gitignore` would also have worked; `.tpl` is what keeps *every*
 * template named by one rule, so that adding a generated file means adding one file here
 * and nothing else.
 *
 * The directory is located through `import.meta.url`, not the working directory: the CLI
 * runs from wherever the caller is standing, and the templates travel with the package.
 *
 * `autoEscape: false` because every value is already spelled for its destination by
 * `values.mjs`; escaping again would double-escape a title in the config. `autoTrim:
 * false` because a template that trims its own newlines writes files whose whitespace
 * no longer matches the template you edited. `useWith: true` is what lets a template
 * name `title` instead of `it.title`, and call `quote()` and `literal()` directly.
 */

const ROOT = new URL('../templates/', import.meta.url)

const eta = new Eta({
  useWith: true,
  autoEscape: false,
  autoTrim: false
})

/**
 * Read once and kept: a scaffold reads all of them, so a run does one pass over the
 * filesystem, and the tests read them once each as well.
 */
const cache = new Map()

/** The rendered `templates/<name>.tpl`, with `data` in scope. */
export function template(name, data = {}) {
  let text = cache.get(name)

  if (text === undefined) {
    text = readFileSync(new URL(`${name}.tpl`, ROOT), 'utf8')
    cache.set(name, text)
  }

  return eta.renderString(text, data)
}
