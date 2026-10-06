import { describe, expect, it } from 'vitest'
import {
  absoluteUrl,
  joinUrl,
  requestedLocation,
  withoutDoubledBase
} from '../src/lib/url.js'

describe('joinUrl', () => {
  it('joins a prefix to a path with one slash', () => {
    expect(joinUrl('https://blog.example', '/logo.svg')).toBe(
      'https://blog.example/logo.svg'
    )
    expect(joinUrl('https://blog.example/', 'posts/vue-3')).toBe(
      'https://blog.example/posts/vue-3'
    )
  })

  it('does not double the slash VitePress puts on a base', () => {
    // What the document used to render for a Site mounted at `/blog`: `src` came out of
    // `${site.base}/${logo}` as `/blog//logo.svg`.
    expect(joinUrl('/blog/', '/logo.svg')).toBe('/blog/logo.svg')
    // A base names a directory, so its own trailing slash survives. The Feed's channel link is
    // built from this prefix rather than from the raw base, which is what closes it.
    expect(joinUrl('https://example.com', '/blog/')).toBe(
      'https://example.com/blog/'
    )
  })

  it('keeps a bare base as the whole prefix', () => {
    // A Site deployed at the root states `base: '/'`, and its links still have to be absolute
    // paths rather than empty strings.
    expect(joinUrl('/', '/favicon.ico')).toBe('/favicon.ico')
    expect(joinUrl('https://consumer.example', '/')).toBe(
      'https://consumer.example/'
    )
  })

  it('leaves the path alone when there is no prefix', () => {
    // `allowMissingorigin`: there is no origin to put in front of the path, and inventing a
    // leading slash would be inventing a fact.
    expect(joinUrl('', '/posts/first')).toBe('/posts/first')
  })
})

describe('withoutDoubledBase', () => {
  it('drops a base the Site already wrote into the origin', () => {
    // The playground's own mistake: `origin` read as "the URL of the base" rather than as an
    // origin, so the Theme appended `/vitepress-theme-vuejsblog/` a second time.
    expect(
      withoutDoubledBase(
        'https://weinibuliu.github.io/vitepress-theme-vuejsblog',
        '/vitepress-theme-vuejsblog/'
      )
    ).toEqual({ origin: 'https://weinibuliu.github.io', duplicated: true })
  })

  it('leaves a bare origin alone', () => {
    expect(withoutDoubledBase('https://blog.example', '/blog/')).toEqual({
      origin: 'https://blog.example',
      duplicated: false
    })
  })

  it('has nothing to drop when the Site is mounted at the root', () => {
    // `base: '/'` names no directory, so an origin ending in `/` is not a repetition of it.
    expect(withoutDoubledBase('https://blog.example/', '/')).toEqual({
      origin: 'https://blog.example',
      duplicated: false
    })
  })
})

describe('absoluteUrl', () => {
  it('resolves a site-relative path against the origin', () => {
    // What the reference site uses for both its logo and its favicon.
    expect(absoluteUrl('/logo.svg', 'https://blog.example')).toBe(
      'https://blog.example/logo.svg'
    )
  })

  it('resolves against a Site base when the document supplies the origin', () => {
    expect(absoluteUrl('/favicon.ico', '/blog/')).toBe('/blog/favicon.ico')
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
