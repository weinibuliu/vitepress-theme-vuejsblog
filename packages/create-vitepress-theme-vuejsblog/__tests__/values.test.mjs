import { describe, expect, it } from 'vitest'
import { PACKAGE_MANAGERS } from '../src/constants.mjs'
import {
  detectPackageManager,
  escapeHtml,
  escapeXml,
  isoDate,
  literal,
  packageNameFromDirectory,
  quote,
  titleFromDirectory
} from '../src/values.mjs'

/**
 * The spelling rules, and the two names derived from a directory.
 *
 * `scaffold.test.mjs` reads whole generated files; these are the properties those
 * files rest on — a title that cannot end the literal it is written into, a nav list
 * that stays a list — checked on their own so a failure says which rule broke.
 */

describe('isoDate', () => {
  it('formats a date the way frontmatter wants it', () => {
    expect(isoDate(new Date(2024, 8, 1))).toBe('2024-09-01')
    expect(isoDate(new Date(2024, 11, 31))).toBe('2024-12-31')
  })
})

describe('quote', () => {
  it('escapes what would otherwise end the literal', () => {
    expect(quote("O'Brien")).toBe("'O\\'Brien'")
    expect(quote('back\\slash')).toBe("'back\\\\slash'")
    expect(quote('two\nlines')).toBe("'two\\nlines'")
  })

  it('escapes the two line separators that are legal in a string literal', () => {
    expect(quote('\u2028\u2029')).toBe("'\\u2028\\u2029'")
  })
})

describe('literal', () => {
  it('keeps a flat record on one line', () => {
    expect(literal({ text: 'About', link: '/about' }, 6)).toBe(
      "{ text: 'About', link: '/about' }"
    )
  })

  it('gives a list a line per item, indented from its key', () => {
    const rendered = literal(
      [
        { text: 'About', link: '/about' },
        { text: 'RSS', link: '/feed.rss' }
      ],
      6
    )

    expect(rendered).toBe(
      [
        '[',
        "        { text: 'About', link: '/about' },",
        "        { text: 'RSS', link: '/feed.rss' }",
        '      ]'
      ].join('\n')
    )
  })

  it('drops undefined fields rather than writing them', () => {
    expect(literal({ text: 'About', external: undefined }, 0)).toBe(
      "{ text: 'About' }"
    )
  })

  it('writes an empty list and an empty record as themselves', () => {
    expect(literal([], 0)).toBe('[]')
    expect(literal({}, 0)).toBe('{}')
  })
})

describe('escapeXml', () => {
  it('escapes all four characters that would end an attribute', () => {
    expect(escapeXml('A <blog> & "notes"')).toBe(
      'A &lt;blog&gt; &amp; &quot;notes&quot;'
    )
  })
})

describe('escapeHtml', () => {
  it('leaves quotes alone, which is what a text node wants', () => {
    expect(escapeHtml('Tom & "Jerry" <b>')).toBe('Tom &amp; "Jerry" &lt;b&gt;')
  })
})

describe('titleFromDirectory', () => {
  it('turns a directory name into something worth putting in a heading', () => {
    expect(titleFromDirectory('my-blog')).toBe('My Blog')
    expect(titleFromDirectory('notes_on_vue')).toBe('Notes On Vue')
    expect(titleFromDirectory('/home/me/Code/the.blog')).toBe('The Blog')
  })

  it('falls back to a name rather than an empty heading', () => {
    expect(titleFromDirectory('/')).toBe('My Blog')
  })
})

describe('packageNameFromDirectory', () => {
  it('produces something npm would accept', () => {
    expect(packageNameFromDirectory('My Blog')).toBe('my-blog')
    expect(packageNameFromDirectory('.blog')).toBe('blog')
    expect(packageNameFromDirectory('a/b/My Notes')).toBe('my-notes')
  })

  it('never returns an empty name', () => {
    expect(packageNameFromDirectory('...')).toBe('my-blog')
    expect(packageNameFromDirectory('/')).toBe('my-blog')
  })
})

describe('detectPackageManager', () => {
  it('reads the user agent every package manager sets', () => {
    expect(
      detectPackageManager('pnpm/12.8.1 npm/? node/v22.22.1 linux x64')
    ).toBe('pnpm')
    expect(detectPackageManager('npm/9.2.0 node/v22.22.1 linux x64')).toBe(
      'npm'
    )
    expect(detectPackageManager('yarn/1.22.22 npm/? node/v22.22.1')).toBe(
      'yarn'
    )
    expect(detectPackageManager('bun/1.1.0 npm/? node/v22.22.1')).toBe('bun')
  })

  it('falls back to npm rather than to nothing', () => {
    // An empty string, not `undefined`: `undefined` re-triggers the default parameter, which
    // reads `process.env.npm_config_user_agent`. Under `pnpm test` that is pnpm itself, so
    // this assertion passed when vitest was run directly and failed under the repo's own gate.
    expect(detectPackageManager('')).toBe('npm')
    expect(detectPackageManager('something-else/1.0')).toBe('npm')
  })

  it('only ever returns a manager the flags accept', () => {
    expect(PACKAGE_MANAGERS).toContain(detectPackageManager('pnpm/12.8.1'))
  })
})
