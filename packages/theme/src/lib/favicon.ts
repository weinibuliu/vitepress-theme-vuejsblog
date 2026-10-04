import type { HeadConfig } from 'vitepress'

/** The head tag the Theme adds for the favicon, given the Site's own head entries. */
export function faviconHead(
  head: HeadConfig[] | undefined,
  favicon: string
): HeadConfig[] {
  // A Site that declared its own icon link wins. `mergeHead` de-duplicates `meta` tags by key
  // but not `link` tags, so emitting ours anyway would leave two icon links in the document
  // and let the browser choose.
  const declared = (head ?? []).some(
    (tag) => tag[0] === 'link' && tag[1]?.rel === 'icon'
  )
  return declared ? [] : [['link', { rel: 'icon', href: favicon }]]
}
