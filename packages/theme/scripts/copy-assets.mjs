import { cpSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Copy the assets `tsc` cannot emit into the compiled `dist/`.
 *
 * `.vue` files are compiled by the consuming VitePress build with its own
 * `@vitejs/plugin-vue`, and CSS by the consuming Vite; neither is `tsc`'s job. They
 * only need to be *present* in `dist/`, in the same tree as the compiled output, so
 * that `dist/index.js` can keep its plain `./layouts/Layout.vue` and `./style.css`
 * imports.
 */

const COPIED_EXTENSIONS = ['.vue', '.css']

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const srcDir = path.join(packageRoot, 'src')
const outDir = path.join(packageRoot, 'dist')

let copied = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full)
      continue
    }
    if (!COPIED_EXTENSIONS.includes(path.extname(full))) continue

    const dest = path.join(outDir, path.relative(srcDir, full))
    mkdirSync(path.dirname(dest), { recursive: true })
    cpSync(full, dest)
    copied += 1
  }
}

if (existsSync(srcDir)) {
  walk(srcDir)
}

console.log(`[theme] copied ${copied} assets into dist/`)
