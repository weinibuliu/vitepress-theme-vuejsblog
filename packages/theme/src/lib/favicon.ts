import type { HeadConfig } from 'vitepress'
import { absoluteUrl } from './url.js'

/**
 * The head tag the Theme adds for the favicon, given the Site's own head entries.
 *
 * `base` is VitePress's site base. The favicon is a document resource, so the browser supplies
 * the origin and the only thing left to get right is the mount path — a Site deployed under
 * `base: '/blog/'` serves its icon at `/blog/favicon.ico`, not at `/favicon.ico`.
 */
export function faviconHead(
  head: HeadConfig[] | undefined,
  favicon: string,
  base = '/'
): HeadConfig[] {
  // A Site that declared its own icon link wins. `mergeHead` de-duplicates `meta` tags by key
  // but not `link` tags, so emitting ours anyway would leave two icon links in the document
  // and let the browser choose.
  const declared = (head ?? []).some(
    (tag) => tag[0] === 'link' && tag[1]?.rel === 'icon'
  )
  return declared
    ? []
    : [['link', { rel: 'icon', href: absoluteUrl(favicon, base) }]]
}
