import { describe, expect, it } from 'vitest'
import { useLang, availableLangs } from '../src/lib/i18n.js'

describe('useLang', () => {
  it('resolves a primary subtag, so zh-CN reaches the Chinese table', () => {
    expect(useLang('zh-CN').readMore).toBe('阅读全文')
    expect(useLang('zh').readMore).toBe('阅读全文')
    expect(useLang('zh-Hans').readMore).toBe('阅读全文')
  })

  it('is case-insensitive', () => {
    expect(useLang('ZH-cn').readMore).toBe('阅读全文')
    expect(useLang('EN-us').readMore).toBe('Read more')
  })

  it('falls back to English for an unknown tag rather than to nothing', () => {
    expect(useLang('zz').readMore).toBe('Read more')
    expect(useLang('').readMore).toBe('Read more')
  })

  it('defaults to English', () => {
    expect(useLang().notFound).toBe('Page Not Found')
  })

  it('labels a TOC in the language it is asked for', () => {
    // The label is the Theme's own string, so it is the table that decides it — a Post has no
    // say in it, and a Site's `lang` is the only input.
    expect(useLang('en').tocTitle).toBe('On this page')
    expect(useLang('zh-CN').tocTitle).toBe('本页目录')
  })

  it('leaves no string empty in any table', () => {
    for (const lang of availableLangs()) {
      const table = useLang(lang)
      for (const [key, value] of Object.entries(table)) {
        expect(value, `${lang}.${key}`).toBeTruthy()
      }
    }
  })

  it('keeps every table the same shape', () => {
    // A locale that is missing a key would silently render `undefined` in the page,
    // because the Theme indexes the table directly rather than falling back per key.
    const reference = Object.keys(useLang('en')).toSorted()
    for (const lang of availableLangs()) {
      expect(Object.keys(useLang(lang)).toSorted(), lang).toEqual(reference)
    }
  })

  it('exposes the languages it has', () => {
    expect(availableLangs()).toContain('en')
    expect(availableLangs()).toContain('zh')
  })
})
