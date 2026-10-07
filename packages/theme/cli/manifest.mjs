import { readFileSync } from 'node:fs'

/**
 * The Theme's own manifest, read once.
 *
 * The CLI now ships inside the package it scaffolds a Site for, so this one read
 * answers both questions the programme asks: which version to print, and which version
 * range to pin the Theme to in the generated `package.json`. `cli/` and
 * `package.json` are siblings at the package root whether the CLI runs from a checkout
 * or from `node_modules`, which is why the path is relative to this module rather than
 * to the caller's working directory.
 */
export const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)
