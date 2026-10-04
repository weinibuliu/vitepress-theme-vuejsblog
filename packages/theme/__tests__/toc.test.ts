import { describe, expect, it } from 'vitest'
import type { Header } from 'vitepress'
import {
  DEFAULT_TOC_LEVELS,
  pickActiveTocLink,
  resolveToc,
  type TocAnchor
} from '../src/lib/toc.js'

/**
 * A heading as `@mdit-vue/plugin-headers` builds it.
 *
 * `children` is what makes the tree a tree: the plugin walks the token stream with a stack,
 * so a heading's children are the headings nested under it and the list is already ordered.
 */
function header(level: number, title: string, children: Header[] = []): Header {
  const slug = title.toLowerCase().replaceAll(/\s+/g, '-')
  return { level, title, slug, link: `#${slug}`, children }
}

describe('resolveToc', () => {
  it('shows h2 and h3, and nests h3 under its h2', () => {
    const headers = [
      header(2, 'Install', [header(3, 'With pnpm')]),
      header(2, 'Configure')
    ]

    expect(resolveToc(headers)).toEqual([
      {
        level: 2,
        title: 'Install',
        link: '#install',
        children: [
          { level: 3, title: 'With pnpm', link: '#with-pnpm', children: [] }
        ]
      },
      { level: 2, title: 'Configure', link: '#configure', children: [] }
    ])
  })

  it('defaults to h2 and h3', () => {
    expect(DEFAULT_TOC_LEVELS).toEqual([2, 3])
  })

  it('drops h4 and deeper along with their subtrees', () => {
    // A grandchild of a dropped heading cannot be in range — the plugin only nests a
    // heading under a shallower one — so nothing in-range is lost by dropping the subtree,
    // and promoting one instead would show an h5 where the Post wrote an h2. The h3 the
    // author did write survives, with the h4 that hung under it gone.
    const headers = [
      header(2, 'Install', [
        header(3, 'With pnpm', [header(4, 'Flags', [header(5, 'Offline')])])
      ])
    ]

    expect(resolveToc(headers)).toEqual([
      {
        level: 2,
        title: 'Install',
        link: '#install',
        children: [
          { level: 3, title: 'With pnpm', link: '#with-pnpm', children: [] }
        ]
      }
    ])
  })

  it('drops h1, which a Post body should not carry', () => {
    // The Article renders the Post's title, so a body-level `# ` is the author writing a
    // second title; the TOC does not adopt it as a section either way.
    expect(resolveToc([header(1, 'Title'), header(2, 'Body')])).toEqual([
      { level: 2, title: 'Body', link: '#body', children: [] }
    ])
  })

  it('keeps an h3 that has no h2 above it', () => {
    // A Post may open with `### `; it is still a section a reader can jump to.
    expect(resolveToc([header(3, 'Loose')])).toEqual([
      { level: 3, title: 'Loose', link: '#loose', children: [] }
    ])
  })

  it('takes the range it is given, so h4 can be shown later', () => {
    const headers = [header(2, 'A', [header(4, 'Deep')])]
    expect(resolveToc(headers, [2, 4])).toEqual([
      {
        level: 2,
        title: 'A',
        link: '#a',
        children: [{ level: 4, title: 'Deep', link: '#deep', children: [] }]
      }
    ])
  })

  it('shows nothing for a Post with no headings', () => {
    expect(resolveToc([])).toEqual([])
  })

  it('keeps the order the Post wrote', () => {
    const titles = resolveToc([
      header(2, 'One'),
      header(2, 'Two'),
      header(2, 'Three')
    ]).map((item) => item.title)
    expect(titles).toEqual(['One', 'Two', 'Three'])
  })
})

describe('pickActiveTocLink', () => {
  /** Two sections, each heading sitting where an anchor jump would leave it. */
  const anchors: TocAnchor[] = [
    { link: '#one', top: 300, scrollMarginTop: 70 },
    { link: '#two', top: 900, scrollMarginTop: 70 }
  ]

  /** A viewport that is neither at the top nor at the bottom of the document. */
  const middle = { scrollY: 500, innerHeight: 800, documentHeight: 5000 }

  it('has no active link at the very top of the page', () => {
    // Lighting up the first heading here would claim the reader is in a section they have
    // not reached; the page has not started scrolling.
    expect(pickActiveTocLink(anchors, { ...middle, scrollY: 0 })).toBeNull()
  })

  it('activates the last heading whose anchor the reader has passed', () => {
    // `#one` is at 300 with a 70px anchor offset, so the reader is in it from 370 onwards.
    expect(pickActiveTocLink(anchors, { ...middle, scrollY: 400 })).toBe('#one')
    // `#two` is reached at 970.
    expect(pickActiveTocLink(anchors, { ...middle, scrollY: 1000 })).toBe(
      '#two'
    )
  })

  it('has no active link above the first heading', () => {
    // The reader is in the Post's opening prose, before the first `## `.
    expect(pickActiveTocLink(anchors, { ...middle, scrollY: 100 })).toBeNull()
  })

  it('counts a heading whose anchor is a few pixels below as reached', () => {
    // The threshold is where the anchor is, not where the heading's box begins. `#one` sits
    // at 300 with a 70px anchor offset, so its anchor line is at a scroll position of 226
    // once the tolerance is counted: at 225 the reader has not got there, at 226 they have.
    // The four pixels are what stops the highlight flickering between two headings at the
    // boundary, so the pair is asserted rather than a comfortable margin either side.
    expect(pickActiveTocLink(anchors, { ...middle, scrollY: 225 })).toBeNull()
    expect(pickActiveTocLink(anchors, { ...middle, scrollY: 226 })).toBe('#one')
  })

  it('activates the last heading at the bottom of the page', () => {
    // The last section is often shorter than the viewport, so its anchor never passes the
    // line the others pass; without this branch it could never light up.
    expect(
      pickActiveTocLink(anchors, {
        scrollY: 4200,
        innerHeight: 800,
        documentHeight: 5000
      })
    ).toBe('#two')
  })

  it('activates the last heading when the page is shorter than the viewport', () => {
    // A Post with two short sections and no scrolling to speak of: the reader is at the
    // bottom the moment they arrive, so the last heading is the one they are looking at.
    expect(
      pickActiveTocLink(anchors, {
        scrollY: 100,
        innerHeight: 900,
        documentHeight: 1000
      })
    ).toBe('#two')
  })

  it('shows no active link for a Post with no headings', () => {
    expect(pickActiveTocLink([], middle)).toBeNull()
  })

  it('orders the anchors itself, so a caller cannot silently get it wrong', () => {
    const shuffled = [anchors[1]!, anchors[0]!]
    expect(pickActiveTocLink(shuffled, { ...middle, scrollY: 1000 })).toBe(
      '#two'
    )
    expect(pickActiveTocLink(shuffled, { ...middle, scrollY: 400 })).toBe(
      '#one'
    )
  })
})
