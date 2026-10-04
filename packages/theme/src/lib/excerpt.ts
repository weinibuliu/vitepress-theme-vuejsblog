/**
 * Re-anchor an excerpt's links to the Post they were written in.
 *
 * VitePress renders an excerpt with the Post as its page, which is what the author wrote
 * against: `#hide-file` is a heading of this Post, and `./../sibling.md` is a file beside it.
 * VitePress keeps both page-relative on purpose — a bare fragment is only slugified, and a
 * relative path is normalised to start with `./` — because on the Post itself that is exactly
 * where they lead.
 *
 * The Theme then shows that HTML on the Blog index and in the Feed, where the same two URLs
 * mean something else: `#hide-file` scrolls the index, and `./../sibling` walks out of the
 * Post. Anchoring them back to the Post is what makes an excerpt say one thing in both
 * places, and it is what lets an author write an intro's links the natural way.
 *
 * Only `href` is touched. A link is a route VitePress renders, so the Post's URL is a real
 * target to anchor to; a relative `src` is not — a page's images are rewritten by Vite's asset
 * pipeline, which a content loader never runs, so an excerpt's relative image has no target
 * here to point at. Root-relative paths (`/assets/x.png`), absolute URLs, `mailto:` and
 * protocol-relative URLs already mean the same thing on every page, and are left as written.
 *
 * Attributes are matched double-quoted, which is what markdown-it emits. Text inside a code
 * block is safe twice over: either its quotes are escaped as `&quot;`, or syntax highlighting
 * puts markup between the attribute's name and its value.
 */
export function anchorExcerptLinks(html: string, postUrl: string): string {
  const base = new URL(postUrl, 'https://excerpt.invalid')

  return html.replace(/href="([^"]*)"/g, (match, value: string) => {
    if (!isPageRelative(value)) return match

    const url = new URL(value, base)
    return `href="${url.pathname}${url.search}${url.hash}"`
  })
}

/**
 * A URL that means something only beside the page it was written on: a fragment, a query, or
 * a path. A scheme (`mailto:`, `https:`), a protocol-relative `//host` and a root-relative
 * `/path` all carry their meaning with them, so none of them is re-anchored.
 */
function isPageRelative(value: string): boolean {
  return value !== '' && !/^([a-zA-Z][a-zA-Z0-9+.-]*:|\/\/|\/)/.test(value)
}
