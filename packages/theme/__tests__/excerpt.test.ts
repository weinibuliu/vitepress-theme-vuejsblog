import { describe, expect, it } from 'vitest'
import { anchorExcerptLinks } from '../src/lib/excerpt.js'

describe('anchorExcerptLinks', () => {
  it('points a bare fragment at the Post it was written in', () => {
    // The bug this exists for: on the index, `#hide-file` scrolled the index instead of the
    // Post the excerpt came from.
    expect(
      anchorExcerptLinks(
        '<p>You can <a href="#hide-file">hide</a> them.</p>',
        '/docs/not-ready-for-production'
      )
    ).toBe(
      '<p>You can <a href="/docs/not-ready-for-production#hide-file">hide</a> them.</p>'
    )
  })

  it('resolves a path against the directory the Post lives in', () => {
    expect(
      anchorExcerptLinks(
        '<a href="./../not-ready-for-production">docs</a>',
        '/docs/demo/draft'
      )
    ).toBe('<a href="/docs/not-ready-for-production">docs</a>')
  })

  it('resolves a sibling and a same-directory fragment', () => {
    expect(
      anchorExcerptLinks(
        '<a href="./other">other</a> <a href="./other#sec">sec</a>',
        '/docs/demo/draft'
      )
    ).toBe(
      '<a href="/docs/demo/other">other</a> <a href="/docs/demo/other#sec">sec</a>'
    )
  })

  it('anchors a Post in a directory that has an index page', () => {
    // A directory index's URL keeps its trailing slash, so `./a` is beside it, not above it.
    expect(anchorExcerptLinks('<a href="./a">a</a>', '/docs/')).toBe(
      '<a href="/docs/a">a</a>'
    )
  })

  it('anchors a root-level Post without inventing a directory', () => {
    expect(anchorExcerptLinks('<a href="#top">top</a>', '/')).toBe(
      '<a href="/#top">top</a>'
    )
  })

  it('leaves a URL that already means the same thing on every page', () => {
    const html =
      '<a href="/docs/a">root</a> <a href="https://x.dev/a">absolute</a> ' +
      '<a href="//cdn.dev/a">protocol</a> <a href="mailto:me@x.dev">mail</a>'
    expect(anchorExcerptLinks(html, '/docs/b')).toBe(html)
  })

  it('keeps a query string, and the ampersand markdown escaped in it', () => {
    expect(
      anchorExcerptLinks('<a href="./a?x=1&amp;y=2">q</a>', '/docs/p')
    ).toBe('<a href="/docs/a?x=1&amp;y=2">q</a>')
  })

  it('anchors every link, and leaves an image src alone', () => {
    // A relative image has no target to anchor to: the loader never runs Vite's asset
    // pipeline, so `src` is not a route the way a markdown link is.
    expect(
      anchorExcerptLinks(
        '<p><a href="#one">one</a> <img src="./shot.png" alt=""> <a href="#two">two</a></p>',
        '/docs/post'
      )
    ).toBe(
      '<p><a href="/docs/post#one">one</a> <img src="./shot.png" alt=""> ' +
        '<a href="/docs/post#two">two</a></p>'
    )
  })
})
