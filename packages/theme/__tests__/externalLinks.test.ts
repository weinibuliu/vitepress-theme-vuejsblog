import { describe, expect, it } from 'vitest'
import { EXTERNAL_LINK_CLASS, isExternal } from '../src/lib/externalLinks.js'

describe('EXTERNAL_LINK_CLASS', () => {
  it('keeps the public hook name stable', () => {
    // A Site writes this string in its own CSS and click handler, so it is a promise rather
    // than an implementation detail: renaming it breaks every redirect prompt written
    // against it. Changing it here is a breaking change, not a refactor.
    expect(EXTERNAL_LINK_CLASS).toBe('vp-blog-external-link')
  })
})

describe('isExternal', () => {
  it('reads a path that stays on the Site as internal', () => {
    // The common case, and the one every Post's own links are.
    expect(isExternal('/about')).toBe(false)
    expect(isExternal('./about.md')).toBe(false)
    expect(isExternal('../posts/a.md')).toBe(false)
    expect(isExternal('about')).toBe(false)
    expect(isExternal('#section')).toBe(false)
  })

  it('reads no href as internal', () => {
    expect(isExternal('')).toBe(false)
  })

  it('leaves mail, telephone and script links unmarked', () => {
    // They have no origin to leave, and the first two open a mail client or a dialler rather
    // than a page, so neither the hook class nor the arrow belongs on them.
    expect(isExternal('mailto:me@example.com')).toBe(false)
    expect(isExternal('tel:+8613800000000')).toBe(false)
    expect(isExternal('javascript:void(0)')).toBe(false)
  })

  it('reads an absolute URL to another origin as external', () => {
    expect(isExternal('https://vuejs.org')).toBe(true)
    expect(isExternal('http://example.com/a?b=c#d')).toBe(true)
    expect(isExternal('//example.com/a')).toBe(true)
  })

  it('reads a same-origin absolute URL as external too', () => {
    // The documented cost of a syntactic answer: at build time there is no `location` to
    // compare against, so the Theme cannot tell that the URL points back at itself. Stated as
    // a test so the trade is visible rather than discovered by a Site.
    expect(isExternal('https://example.com/about')).toBe(true)
  })

  it('answers the same with no DOM, which is how the build calls it', () => {
    // Vitest runs this file in Node, where `location` does not exist. The rule used to compare
    // origins, so every one of these links was read as internal while the page was rendered on
    // the server and then corrected on hydration — a mismatch, and a first paint with no arrow.
    expect(typeof location).toBe('undefined')
    expect(isExternal('https://vuejs.org')).toBe(true)
    expect(isExternal('/about')).toBe(false)
  })
})
