import { describe, expect, it } from 'vitest'
import { withDefaults } from '../src/lib/config.js'
import type { SortOptions } from '../src/lib/types.js'

describe('withDefaults footer', () => {
  it('gives an absent footer an empty link list', () => {
    // Callers read `links.length` directly, so an absent list would be a crash rather
    // than an empty footer.
    expect(withDefaults({ title: 'Blog' }).footer).toEqual({
      text: undefined,
      links: []
    })
  })

  it('carries text and links through unchanged', () => {
    const footer = {
      text: '© 2026 Me',
      links: [{ text: 'RSS', link: '/feed.rss' }]
    }
    expect(withDefaults({ title: 'Blog', footer }).footer).toEqual(footer)
  })

  it('fills in an empty list when only text is given', () => {
    const { footer } = withDefaults({ title: 'Blog', footer: { text: 'Hi' } })
    expect(footer.text).toBe('Hi')
    expect(footer.links).toEqual([])
  })

  it('keeps the two roles independent', () => {
    // The roles exist because they lay out differently; neither should imply the other.
    const { footer } = withDefaults({
      title: 'Blog',
      footer: { links: [{ text: 'RSS', link: '/feed.rss' }] }
    })
    expect(footer.text).toBeUndefined()
    expect(footer.links).toHaveLength(1)
  })
})

describe('withDefaults favicon', () => {
  it('defaults to the icon a browser would probe for anyway', () => {
    // Stated rather than implied, so it can be pointed somewhere else.
    expect(withDefaults({ title: 'Blog' }).favicon).toBe('/favicon.ico')
  })

  it('keeps a configured icon', () => {
    expect(withDefaults({ title: 'Blog', favicon: '/icon.svg' }).favicon).toBe(
      '/icon.svg'
    )
  })
})

describe('withDefaults sort', () => {
  it('orders by date unless the Site asks for global sorting', () => {
    // Global sorting is the one mode that makes `order` required, so it is never the
    // default a Site falls into by saying nothing.
    expect(withDefaults({ title: 'Blog' }).sort).toEqual({
      mode: 'date',
      direction: 'desc'
    })
  })

  it('keeps a configured sort mode', () => {
    expect(withDefaults({ title: 'Blog', sort: 'global' }).sort).toEqual({
      mode: 'global',
      direction: 'desc'
    })
  })

  it('reads the mode written alone as the whole setting', () => {
    // The shorthand is what almost every Site writes, so it stays first-class rather than
    // becoming a second shape to keep in step with the written-out one.
    expect(withDefaults({ title: 'Blog', sort: 'date' }).sort).toEqual({
      mode: 'date',
      direction: 'desc'
    })
  })

  it('keeps a stated direction', () => {
    expect(
      withDefaults({
        title: 'Blog',
        sort: { mode: 'global', direction: 'asc' }
      }).sort
    ).toEqual({ mode: 'global', direction: 'asc' })
  })

  it('reads a value it does not know as the default for that part', () => {
    // A Site's config is plain data, so a mode or direction the type forbids can still reach
    // here. Reading it as absent is the tolerance `date` and `pin` get.
    const stated = {
      mode: 'random',
      direction: 'sideways'
    } as unknown as SortOptions
    expect(withDefaults({ title: 'Blog', sort: stated }).sort).toEqual({
      mode: 'date',
      direction: 'desc'
    })
  })
})

describe('withDefaults toc', () => {
  it('shows a Post its TOC unless the Site says otherwise', () => {
    // The TOC lists what the Post itself is made of, and a Post with too few headings
    // renders no TOC at all — so there is nothing for a Site to opt into.
    expect(withDefaults({ title: 'Blog' }).toc).toBe(true)
  })

  it('keeps a Site that switched the TOC off', () => {
    // `??` rather than `||`: `false` is the decision, not an absence.
    expect(withDefaults({ title: 'Blog', toc: false }).toc).toBe(false)
  })
})

describe('withDefaults excerptSeparator', () => {
  it('ends an excerpt at <!-- more --> unless the Site says otherwise', () => {
    // `---` is also a horizontal rule and a table's header row, so a Post could end its
    // excerpt to its own typography.
    expect(withDefaults({ title: 'Blog' }).excerptSeparator).toBe(
      '<!-- more -->'
    )
  })

  it('keeps a configured marker, including the reference site convention', () => {
    expect(
      withDefaults({ title: 'Blog', excerptSeparator: '---' }).excerptSeparator
    ).toBe('---')
  })

  it('keeps `false`, so the excerpt can be switched off', () => {
    // Not defaulted away: asking for no excerpt is a decision, and VitePress reads `false`
    // as the decision to extract none — a different thing from naming a marker no Post has.
    expect(
      withDefaults({ title: 'Blog', excerptSeparator: false }).excerptSeparator
    ).toBe(false)
  })

  it('reads a whitespace-only marker as absent', () => {
    // gray-matter reads an empty separator as no separator given at all and falls back to
    // `---`, which is the opposite of what the Site asked for.
    expect(
      withDefaults({ title: 'Blog', excerptSeparator: '   ' }).excerptSeparator
    ).toBe('<!-- more -->')
  })

  it('does not trim a marker whose own whitespace is the point', () => {
    // `'\n---\n'` is a marker pinned to a whole line; trimming it would silently make it
    // the plain `---` this default exists to leave behind.
    expect(
      withDefaults({ title: 'Blog', excerptSeparator: '\n---\n' })
        .excerptSeparator
    ).toBe('\n---\n')
  })
})

describe('withDefaults externalArrow', () => {
  it('draws the arrow in every region unless a Site says otherwise', () => {
    // On rather than off: the arrow is what tells a reader a link leaves the Blog, and a Site
    // that wants fewer says so once.
    expect(withDefaults({ title: 'Blog' }).externalArrow).toEqual({
      nav: true,
      footer: true,
      content: true
    })
  })

  it('reads `false` as the whole answer written short', () => {
    expect(
      withDefaults({ title: 'Blog', externalArrow: false }).externalArrow
    ).toEqual({
      nav: false,
      footer: false,
      content: false
    })
  })

  it('reads `true` as the default restated', () => {
    expect(
      withDefaults({ title: 'Blog', externalArrow: true }).externalArrow
    ).toEqual({
      nav: true,
      footer: true,
      content: true
    })
  })

  it('switches one region off without touching the others', () => {
    // The regions partition the page, so a Site that dislikes the arrow beside a nav entry
    // should not have to give up the one in the prose as well.
    expect(
      withDefaults({ title: 'Blog', externalArrow: { nav: false } })
        .externalArrow
    ).toEqual({ nav: false, footer: true, content: true })
  })

  it('keeps a region a Site switched back on', () => {
    expect(
      withDefaults({
        title: 'Blog',
        externalArrow: { content: false, nav: true }
      }).externalArrow
    ).toEqual({ nav: true, footer: true, content: false })
  })

  it('hands out a copy, so one reader cannot change the next answer', () => {
    const first = withDefaults({ title: 'Blog' }).externalArrow
    first.nav = false
    expect(withDefaults({ title: 'Blog' }).externalArrow.nav).toBe(true)
  })
})
