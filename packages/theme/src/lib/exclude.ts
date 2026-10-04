/**
 * Whether a Page's frontmatter excludes it from the Site.
 *
 * `exclude: true` is the one flag that removes a file rather than hiding it. The Theme
 * reads it twice, and the two readings must agree:
 *
 * - at config load, `scanExcluded` turns it into VitePress's `srcExclude`, so the file
 *   never becomes a page — no route, no HTML;
 * - in `resolvePosts`, it keeps the file out of the Blog and the Feed, live, because a
 *   data loader re-runs whenever a file it watches is edited.
 *
 * Only the literal boolean counts — `exclude: 'true'` or `exclude: 1` states nothing —
 * the same tolerance `draft` is read with.
 */

export function isExcluded(frontmatter: unknown): boolean {
  if (!frontmatter || typeof frontmatter !== 'object') return false
  return (frontmatter as Record<string, unknown>).exclude === true
}
