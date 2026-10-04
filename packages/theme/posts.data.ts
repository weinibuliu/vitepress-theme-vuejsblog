import { createContentLoader } from 'vitepress'
import type { ContentData } from 'vitepress'
// These are the raw sources, and `src/` is published alongside `dist/` so that they
// resolve both in this repo and in an installed package. Vite is happy to compile
// them; Node never sees this file, because VitePress reads the loader through its own
// Vite pipeline. Pointing at `dist/` instead would have made typechecking depend on a
// prior build.
import { resolvePosts } from './src/lib/resolvePosts.js'
import { readThemeConfig } from './src/lib/config.js'
import { getVitePressGlobals, isDev } from './src/lib/globals.js'
import type { Post, PriorityConflict } from './src/lib/types.js'

/**
 * The Theme's Post collection.
 *
 * This file is a VitePress data loader. VitePress finds it because the Theme's
 * components import `data` from it, and it resolves loaders by module id rather
 * than by location, so a loader shipped inside an installed package works exactly
 * like one in the Site's own `.vitepress/`. That is what lets a Site get a Blog
 * without authoring boilerplate, and it is verified in
 * `docs/adr/0002-content-discovery-in-the-theme-package.md`.
 *
 * It is shipped as TypeScript and handed straight to VitePress, which resolves it
 * with its own Vite pipeline. It is deliberately thin: everything that decides
 * whether a candidate belongs in the Blog lives in `resolvePosts`, which is pure
 * and therefore unit-testable. This file's only extra jobs are reading the Site's
 * config and telling the author about Posts that were left out.
 */

const blog = readThemeConfig()

function report(message: string): void {
  const logger = getVitePressGlobals().logger
  if (logger?.warn) {
    logger.warn(message)
    return
  }
  console.warn(message)
}

declare const data: Post[]
export { data }

export default createContentLoader(blog.posts, {
  excerpt: blog.excerptSeparator,
  transform(raw: ContentData[]): Post[] {
    const dev = isDev()
    const srcDir = getVitePressGlobals().srcDir
    const published = resolvePosts(raw, blog, { srcDir })

    for (const { url, reasons } of published.skipped) {
      report(`[blog] not in the Blog: ${url} — ${reasons.join(', ')}`)
    }

    if (!dev) {
      refuseToPublishWithConflicts(published.conflicts)
      return published.posts
    }

    // In dev an author expects to see their own Drafts listed, and — under
    // `sort: 'global'` — the Post they have not given an `order` yet. The files on disk
    // are never modified; only the copy handed to the resolver is.
    //
    // Undated candidates stay out even here: the Blog is ordered by date, and there
    // is nothing to order an undated Post by. It renders as a page either way, and
    // the warning above has already named it.
    const listed = resolvePosts(relaxDrafts(raw), blog, {
      srcDir,
      listUnplaced: true
    })
    for (const conflict of listed.conflicts) {
      report(
        `[blog] Posts state the same priority, so their titles decide the order — ${describeConflict(conflict)}`
      )
    }
    return listed.posts
  }
})

/**
 * A copy of the candidates with `draft: true` removed, so the resolver treats them
 * as ordinary Posts. Used only in dev.
 */
function relaxDrafts(raw: ContentData[]): ContentData[] {
  return raw.map((entry) => {
    const frontmatter = entry.frontmatter ?? {}
    if (frontmatter.draft !== true) return entry
    const { draft: _draft, ...rest } = frontmatter
    return { ...entry, frontmatter: rest }
  })
}

/**
 * Stop a production build in which two Posts state the same `pin` or `order`.
 *
 * The Blog would still render, ordered by title — which is the problem. That order is one
 * nobody chose and nothing announces, and it is stable enough to survive review. Dev warns
 * instead, because a half-written Blog is the normal state while writing; published is when
 * the author has to have decided.
 */
function refuseToPublishWithConflicts(conflicts: PriorityConflict[]): void {
  if (!conflicts.length) return
  const detail = conflicts.map(describeConflict).join('\n')
  throw new Error(
    '[blog] two or more Posts state the same priority, so the Blog cannot be ordered ' +
      `deliberately. Give each Post its own value:\n${detail}`
  )
}

/** One conflict, as a line an author can act on. */
function describeConflict({ field, value, paths }: PriorityConflict): string {
  return `  ${field}: ${value} — ${paths.join(', ')}`
}
