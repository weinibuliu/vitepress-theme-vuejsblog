import { describe, expect, it } from 'vitest'
import { absoluteUrl, requestedLocation } from '../src/lib/url.js'

describe('absoluteUrl', () => {
  it('resolves a site-relative path against the origin', () => {
    // What the reference site uses for both its logo and its favicon.
    expect(absoluteUrl('/logo.svg', 'https://blog.example')).toBe(
      'https://blog.example/logo.svg'
    )
  })

  it('leaves a full URL alone', () => {
    // The bug this exists for: prefixing unconditionally produced
    // `https://blog.examplehttps://cdn.example/logo.svg`, which RSS 2.0 writes straight into
    // the channel's <image>.
    expect(
      absoluteUrl('https://cdn.example/logo.svg', 'https://blog.example')
    ).toBe('https://cdn.example/logo.svg')
    expect(
      absoluteUrl('data:image/svg+xml,<svg/>', 'https://blog.example')
    ).toBe('data:image/svg+xml,<svg/>')
    expect(absoluteUrl('//cdn.example/logo.svg', 'https://blog.example')).toBe(
      '//cdn.example/logo.svg'
    )
  })
})

describe('requestedLocation', () => {
  // The shape a 404 gets from VitePress's router: the path that failed to resolve, and
  // `query` / `hash` each already carrying their punctuation. The 404 is the only place a
  // reader sees this string, so what it shows has to be the URL they typed.
  it('reassembles the pieces the router splits the location into', () => {
    expect(
      requestedLocation({ path: '/posts/vue-3', query: '', hash: '' })
    ).toBe('/posts/vue-3')
    expect(
      requestedLocation({
        path: '/posts/vue-3',
        query: '?lang=zh',
        hash: '#intro'
      })
    ).toBe('/posts/vue-3?lang=zh#intro')
  })

  it('adds no punctuation of its own', () => {
    // A version that prepended `?` and `#` itself would double them here, because the
    // router's strings already include them.
    expect(requestedLocation({ path: '/a', query: '?b=1', hash: '' })).toBe(
      '/a?b=1'
    )
    expect(requestedLocation({ path: '/a', query: '', hash: '#c' })).toBe(
      '/a#c'
    )
  })
})
