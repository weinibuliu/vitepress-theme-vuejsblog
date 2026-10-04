import type { Header } from 'vitepress'

/**
 * A Post's TOC, as a pure function of what the build collected.
 *
 * Two reasons this is not in the component. The headings arrive from VitePress —
 * `@mdit-vue/plugin-headers` walks the Markdown token stream and puts a tree of
 * `{ level, title, slug, link, children }` on `page.headers` — so turning them into what the
 * TOC shows is a judgement about the Theme's own data, and the Theme keeps those in `lib/`
 * where a unit test reaches them without a build. And the part of the highlight that decides
 * *which* heading is current is arithmetic on numbers, which needs no DOM at all; only
 * reading the numbers out of the page does.
 */

/**
 * The levels a TOC shows: h2 and h3, the same range VitePress's default theme shows.
 *
 * h1 is absent by construction — the plugin collects h2–h6, and a Post's title is the
 * Article's own heading rather than part of its body — so the shallow end of the range is
 * about not promoting a `## ` heading's parent, not about excluding the title.
 *
 * The range is a parameter rather than a constant because it is the one part of "which
 * headings" that a Site could plausibly want to change, and the plugin can only be asked
 * once per Site. Asking it for this range would have made the range unchangeable per Post;
 * asking it for everything leaves the decision here, where changing it is a default and not
 * a re-extraction.
 */
export const DEFAULT_TOC_LEVELS: readonly [number, number] = [2, 3]

/**
 * One entry in the TOC: what the TOC needs from a `Header`, and nothing else.
 *
 * `slug` is dropped rather than carried. `link` is `#${slug}` by construction — the plugin
 * builds it that way — so the same string without its `#` is what finds the heading in the
 * page when the highlight measures it. Keeping both would leave two ways to say the same
 * thing, and the one that got out of step would be the one nobody reads.
 */
export interface TocItem {
  level: number
  title: string
  link: string
  children: TocItem[]
}

/**
 * The headings a TOC shows, in the order they appear, nested as the Post nests them.
 *
 * `levels` is `[shallowest, deepest]`, as the levels are numbered: `[2, 3]` is h2 and h3.
 *
 * Out-of-range headings are dropped with their subtrees, which cannot lose an in-range
 * heading: the plugin builds the tree with a strict parent-is-shallower-than-child rule, so
 * every descendant of a dropped heading is deeper than it is, and therefore out of range too.
 * The alternatives were promoting an in-range grandchild into its dropped grandparent's place
 * — a TOC that shows an h5 as if it were an h2 — or re-deriving the tree from a flat list.
 */
export function resolveToc(
  headers: readonly Header[],
  levels: readonly [number, number] = DEFAULT_TOC_LEVELS
): TocItem[] {
  const [shallowest, deepest] = levels

  function keep(header: Header): TocItem | undefined {
    if (header.level < shallowest || header.level > deepest) return undefined
    return {
      level: header.level,
      title: header.title,
      link: header.link,
      children: header.children.map(keep).filter(isTocItem)
    }
  }

  return headers.map(keep).filter(isTocItem)
}

function isTocItem(item: TocItem | undefined): item is TocItem {
  return item !== undefined
}

/**
 * A heading's position on the page, as the highlight measures it.
 *
 * - `top`: the heading's offset from the top of the document, not of the viewport.
 * - `scrollMarginTop`: the heading's own `scroll-margin-top`, which is where an anchor jump
 *   puts it — a couple of rems below the top edge, so the heading is not flush against it.
 *   The highlight has to know it because it decides where the *reader* is: the heading whose
 *   anchor the reader has just passed is the current one, not the heading still under the
 *   viewport's top edge.
 */
export interface TocAnchor {
  link: string
  top: number
  scrollMarginTop: number
}

/**
 * Where the reader is, in the numbers the browser reports.
 */
export interface TocViewport {
  scrollY: number
  innerHeight: number
  documentHeight: number
}

/**
 * How far past a heading's anchor the reader has to be for that heading to count as current.
 *
 * Four pixels, as VitePress's default theme allows: a heading whose anchor is a hair below
 * the scroll position is one the reader has effectively reached, and a `0` threshold makes
 * the highlight flicker between two headings at the boundary.
 */
const REACHED_TOLERANCE = 4

/**
 * The link of the heading the reader is currently in, or `null` for none.
 *
 * Ported from VitePress's default theme, including its two edges, because both are what make
 * the highlight feel right rather than approximately right:
 *
 * - **At the very top of the page, nothing is active.** The reader has not started reading, so
 *   lighting up the first heading would claim they are in a section they have not reached.
 * - **At the bottom of the page, the last heading is active.** The last section is often
 *   shorter than the viewport, so it can never pass the line the other headings pass; without
 *   this the final heading could never be lit.
 *
 * Otherwise it is the last heading whose anchor the reader has passed — not the nearest one,
 * because a heading below the reader has not been read yet.
 */
export function pickActiveTocLink(
  anchors: readonly TocAnchor[],
  viewport: TocViewport
): string | null {
  if (anchors.length === 0) return null

  const { scrollY, innerHeight, documentHeight } = viewport

  if (scrollY < 1) return null

  // The anchors are ordered here rather than by the caller: the reader's position is
  // measured against it, so a caller that forgot to sort would get a silently wrong answer
  // rather than an error. The list holds one entry per heading.
  const ordered = anchors.toSorted((a, b) => a.top - b.top)

  if (scrollY + innerHeight - documentHeight >= 0) {
    return ordered.at(-1)?.link ?? null
  }

  let active: string | null = null
  for (const { link, top, scrollMarginTop } of ordered) {
    if (top > scrollY + scrollMarginTop + REACHED_TOLERANCE) break
    active = link
  }
  return active
}
