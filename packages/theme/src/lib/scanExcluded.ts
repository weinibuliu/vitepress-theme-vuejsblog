import fs from 'node:fs'
import type { Dirent } from 'node:fs'
import path from 'node:path'

import matter from 'gray-matter'

import { isExcluded } from './exclude.js'

/**
 * Directories the scan never descends into.
 *
 * The first two are the ones VitePress's own glob hard-codes (`**\/node_modules/**`,
 * `**\/dist/**`); `.git` is here because the scan starts at a working tree.
 */
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', '.git', '.venv'])

/**
 * Every Markdown file under `root` whose own frontmatter excludes it, as absolute paths.
 *
 * This is what turns `exclude: true` into VitePress's `srcExclude`, which is the only
 * switch that stops a file becoming a page: `resolvePages` filters its page glob by it,
 * so the file gets no route and no HTML. It has to happen while the Site config is
 * being loaded, because `resolvePages` runs immediately afterwards.
 *
 * The paths are absolute on purpose. `srcExclude` is resolved against `srcDir`, but the
 * Theme cannot see `srcDir` at config time — only the root the Site handed it. An
 * absolute pattern is matched against the candidate's own absolute path, so scanning
 * from the root covers a `srcDir` at any depth without naming it.
 *
 * The cost is that this reads every Markdown file under `root`, so it belongs at config
 * load and nowhere else. Files that cannot be read or parsed are skipped rather than
 * reported: VitePress is the one that will complain, and only if it needs them.
 */
export function scanExcluded(root: string): string[] {
  const excluded: string[] = []
  walk(root, excluded)
  return excluded.toSorted()
}

function walk(directory: string, excluded: string[]): void {
  for (const entry of entriesOf(directory)) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      // Symlinked directories are not followed: `isDirectory` is false for them, which
      // also keeps a self-referential link from looping the scan.
      if (!SKIPPED_DIRECTORIES.has(entry.name)) walk(full, excluded)
      continue
    }
    if (!entry.isFile() || !full.endsWith('.md')) continue
    if (isExcludedFile(full)) excluded.push(full)
  }
}

function entriesOf(directory: string): Dirent[] {
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
  } catch {
    return []
  }
}

function isExcludedFile(file: string): boolean {
  try {
    return isExcluded(matter(fs.readFileSync(file, 'utf8')).data)
  } catch {
    return false
  }
}
