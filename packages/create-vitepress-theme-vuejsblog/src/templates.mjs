import { readFileSync } from 'node:fs'
import { render } from './render.mjs'

/**
 * The Site's files, as files.
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
 * Read once and kept. A scaffold reads all of them, so a run does one pass over the
 * filesystem, and the tests — which call `createFiles` many times — read them once.
 */

const ROOT = new URL('../templates/', import.meta.url)
const cache = new Map()

/**
 * The rendered `templates/<name>.tpl`, with `values` filled in left to right.
 *
 * A template with no `%s` needs no values; passing more or fewer than the template has
 * placeholders is an error rather than a shrug — see `render.mjs`.
 */
export function template(name, values = []) {
  let text = cache.get(name)

  if (text === undefined) {
    text = readFileSync(new URL(`${name}.tpl`, ROOT), 'utf8')
    cache.set(name, text)
  }

  return render(text, values)
}
