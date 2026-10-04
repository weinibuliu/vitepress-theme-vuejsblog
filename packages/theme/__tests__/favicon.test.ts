import { describe, expect, it } from 'vitest'
import { faviconHead } from '../src/lib/favicon.js'

describe('faviconHead', () => {
  it('declares the configured icon when the Site declared none', () => {
    expect(faviconHead(undefined, '/favicon.ico')).toEqual([
      ['link', { rel: 'icon', href: '/favicon.ico' }]
    ])
    expect(
      faviconHead([['meta', { name: 'x', content: 'y' }]], '/icon.svg')
    ).toEqual([['link', { rel: 'icon', href: '/icon.svg' }]])
  })

  it('yields to an icon link the Site declared itself', () => {
    // `mergeHead` de-duplicates `meta` tags by key but not `link` tags, so emitting ours too
    // would leave two icon links in the document and let the browser pick between them.
    const head = [['link', { rel: 'icon', href: '/site.ico' }]] as const
    expect(faviconHead([...head], '/favicon.ico')).toEqual([])
  })

  it('is not fooled by a link that is not an icon', () => {
    const head = [['link', { rel: 'stylesheet', href: '/x.css' }]] as const
    expect(faviconHead([...head], '/favicon.ico')).toHaveLength(1)
  })
})
