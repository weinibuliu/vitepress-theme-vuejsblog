import { describe, expect, it } from 'vitest'
import { heroSubtextHtml, resolveHeroAvatar } from '../src/lib/hero.js'

describe('resolveHeroAvatar', () => {
  it('falls back to the Site Author avatar', () => {
    // The point of the fallback: a personal blog states its picture once, on the Author.
    expect(
      resolveHeroAvatar(undefined, { name: 'Me', avatar: '/me.jpg' })
    ).toBe('/me.jpg')
    expect(resolveHeroAvatar({}, { name: 'Me', gravatar: 'abc' })).toBe(
      'https://gravatar.com/avatar/abc'
    )
  })

  it('has no avatar when the Author has none', () => {
    expect(resolveHeroAvatar({}, 'Me')).toBeUndefined()
    expect(resolveHeroAvatar({}, { name: 'Me' })).toBeUndefined()
  })

  it('lets a string override the Author avatar for the hero alone', () => {
    expect(
      resolveHeroAvatar(
        { avatar: '/hero.jpg' },
        { name: 'Me', avatar: '/me.jpg' }
      )
    ).toBe('/hero.jpg')
  })

  it('lets `false` suppress the Author avatar', () => {
    // For a Site whose Author avatar belongs on bylines but not on the hero.
    expect(
      resolveHeroAvatar({ avatar: false }, { name: 'Me', avatar: '/me.jpg' })
    ).toBeUndefined()
  })
})

describe('heroSubtextHtml', () => {
  it('returns the line when the Site wrote one for the hero', () => {
    // HTML, like `footer.text`: this field has a single consumer, the hero's own <p>.
    expect(heroSubtextHtml({ subtext: 'Notes <a href="/x">link</a>' })).toBe(
      'Notes <a href="/x">link</a>'
    )
  })

  it('returns nothing when the line falls back to the Blog description', () => {
    // The decisive case. `description` is metadata — escaped into the meta tag, sent to the
    // Feed — and may contain a `<` as prose. Rendering it as HTML would swallow everything
    // from that `<` to the next `>`.
    expect(heroSubtextHtml(undefined)).toBeUndefined()
    expect(heroSubtextHtml({})).toBeUndefined()
    expect(heroSubtextHtml({ subtext: '' })).toBeUndefined()
  })
})
