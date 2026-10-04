import { describe, expect, it } from 'vitest'
import {
  resolveAuthor,
  resolveAuthors,
  matchAuthorScope,
  socialAriaLabel,
  socialCaption
} from '../src/lib/author.js'
import { useLang } from '../src/lib/i18n.js'
import type { ResolvedSocial } from '../src/lib/types.js'

const en = useLang('en')

describe('resolveAuthor', () => {
  it('turns a bare string into a name-only Author', () => {
    expect(resolveAuthor('Evan You')).toEqual({
      name: 'Evan You',
      socials: []
    })
  })

  it('turns a gravatar hash into a Gravatar URL', () => {
    expect(resolveAuthor({ name: 'Evan You', gravatar: 'abc123' })).toEqual({
      name: 'Evan You',
      avatar: 'https://gravatar.com/avatar/abc123',
      socials: []
    })
  })

  it('prefers an explicit avatar over a gravatar hash', () => {
    expect(
      resolveAuthor({ name: 'A', avatar: 'https://x/y.png', gravatar: 'abc' })
    ).toEqual({ name: 'A', avatar: 'https://x/y.png', socials: [] })
  })

  it('keeps a homepage, apart from the Social Links', () => {
    expect(resolveAuthor({ name: 'A', url: 'https://a.dev' })).toEqual({
      name: 'A',
      url: 'https://a.dev',
      socials: []
    })
  })
})

describe('resolveAuthor — the twitter Handle', () => {
  it('builds an x.com URL from a handle and shows the handle', () => {
    expect(resolveAuthor({ name: 'A', twitter: '@youyuxi' }).socials).toEqual([
      {
        link: 'https://x.com/youyuxi',
        text: '@youyuxi',
        platform: 'x',
        icon: { name: 'simple-icons:x' },
        external: true
      }
    ])
  })

  it('accepts a handle without the @, and tolerates several', () => {
    for (const handle of ['youyuxi', '@youyuxi', '@@youyuxi']) {
      expect(resolveAuthor({ name: 'A', twitter: handle }).socials[0]).toEqual({
        link: 'https://x.com/youyuxi',
        text: '@youyuxi',
        platform: 'x',
        icon: { name: 'simple-icons:x' },
        external: true
      })
    }
  })

  it('drops a handle that is nothing but @', () => {
    expect(resolveAuthor({ name: 'A', twitter: '@' }).socials).toEqual([])
  })

  it('lets x win, because a URL is the more specific statement', () => {
    const socials = resolveAuthor({
      name: 'A',
      x: 'https://x.com/new',
      twitter: '@old'
    }).socials
    expect(socials).toHaveLength(1)
    expect(socials[0].link).toBe('https://x.com/new')
  })
})

describe('resolveAuthor — Social Links that take a URL', () => {
  it('builds no platform URL, and reads the link back for the text', () => {
    const socials = resolveAuthor({
      name: 'A',
      x: 'https://x.com/youyuxi'
    }).socials
    expect(socials).toEqual([
      {
        link: 'https://x.com/youyuxi',
        text: 'x.com/youyuxi',
        platform: 'x',
        icon: { name: 'simple-icons:x' },
        external: true
      }
    ])
  })

  it('drops a trailing slash from the text', () => {
    expect(
      resolveAuthor({ name: 'A', github: 'https://github.com/yyx990803/' })
        .socials[0].text
    ).toBe('github.com/yyx990803')
  })

  it('takes the long form, where the Site states the text', () => {
    expect(
      resolveAuthor({
        name: 'A',
        github: { url: 'https://github.com/yyx990803', label: '@yyx990803' }
      }).socials[0]
    ).toEqual({
      link: 'https://github.com/yyx990803',
      text: '@yyx990803',
      label: '@yyx990803',
      platform: 'github',
      icon: { name: 'simple-icons:github' },
      external: true
    })
  })

  it('orders the platforms itself, however the Site wrote them', () => {
    const socials = resolveAuthor({
      name: 'A',
      mail: 'me@example.com',
      instagram: 'https://instagram.com/a',
      facebook: 'https://facebook.com/a',
      github: 'https://github.com/a',
      x: 'https://x.com/a'
    }).socials
    expect(socials.map((social) => social.platform)).toEqual([
      'x',
      'github',
      'facebook',
      'instagram',
      'mail'
    ])
  })
})

describe('resolveAuthor — mail', () => {
  it('adds the scheme a bare address is missing, so it cannot resolve as a relative link', () => {
    const [mail] = resolveAuthor({ name: 'A', mail: 'me@example.com' }).socials
    expect(mail.link).toBe('mailto:me@example.com')
    expect(mail.text).toBe('me@example.com')
    expect(mail.platform).toBe('mail')
    expect(mail.external).toBe(false)
  })

  it('leaves an existing mailto: alone rather than doubling it', () => {
    const [mail] = resolveAuthor({
      name: 'A',
      mail: 'mailto:me@example.com'
    }).socials
    expect(mail.link).toBe('mailto:me@example.com')
  })

  it('draws the envelope the Theme ships, because simple-icons has none', () => {
    const [mail] = resolveAuthor({ name: 'A', mail: 'me@example.com' }).socials
    expect('svg' in mail.icon && mail.icon.svg).toContain('<svg')
  })
})

describe('resolveAuthor — Custom Social Links', () => {
  it('takes one, or a list, and keeps the Site in charge of the icon', () => {
    const socials = resolveAuthor({
      name: 'A',
      customSocial: [
        {
          icon: 'https://example.com/mastodon.svg',
          label: 'Mastodon',
          link: 'https://mastodon.example/@a'
        },
        { icon: { svg: '<svg></svg>' }, label: 'RSS', link: '/feed.rss' }
      ]
    }).socials
    expect(socials).toEqual([
      {
        link: 'https://mastodon.example/@a',
        text: 'Mastodon',
        label: 'Mastodon',
        icon: { src: 'https://example.com/mastodon.svg' },
        external: true
      },
      {
        link: '/feed.rss',
        text: 'RSS',
        label: 'RSS',
        icon: { svg: '<svg></svg>' },
        external: false
      }
    ])
  })

  it('accepts a single Custom Social Link without a list around it', () => {
    const socials = resolveAuthor({
      name: 'A',
      customSocial: { icon: '/m.svg', label: 'Mastodon', link: '/m' }
    }).socials
    expect(socials).toHaveLength(1)
    expect(socials[0].label).toBe('Mastodon')
  })

  it('comes after every platform, in the order the Site gave', () => {
    const socials = resolveAuthor({
      name: 'A',
      github: 'https://github.com/a',
      customSocial: [
        { icon: '/one.svg', label: 'One', link: '/1' },
        { icon: '/two.svg', label: 'Two', link: '/2' }
      ]
    }).socials
    expect(socials.map((social) => social.text)).toEqual([
      'github.com/a',
      'One',
      'Two'
    ])
  })
})

describe('socialCaption', () => {
  it('shows the text of a sole Social Link', () => {
    expect(
      socialCaption(resolveAuthor({ name: 'A', twitter: '@a' }).socials)
    ).toBe('@a')
  })

  it('shows nothing when there are none, or several', () => {
    expect(socialCaption([])).toBeUndefined()
    expect(
      socialCaption(
        resolveAuthor({
          name: 'A',
          twitter: '@a',
          github: 'https://github.com/a'
        }).socials
      )
    ).toBeUndefined()
  })
})

describe('socialAriaLabel', () => {
  const github: ResolvedSocial = {
    link: 'https://github.com/a',
    text: 'github.com/a',
    platform: 'github',
    icon: { name: 'simple-icons:github' },
    external: true
  }

  it('names the platform when the Site gave no label', () => {
    expect(socialAriaLabel(github, en)).toBe('GitHub')
    expect(socialAriaLabel({ ...github, platform: 'mail' }, en)).toBe('Email')
  })

  it('prefers the Site’s own label', () => {
    expect(socialAriaLabel({ ...github, label: 'My code' }, en)).toBe('My code')
  })

  it('falls back to the label of a Custom Social Link, which has no platform', () => {
    expect(
      socialAriaLabel(
        {
          link: '/feed.rss',
          text: 'RSS',
          label: 'RSS',
          icon: { svg: '<svg></svg>' },
          external: false
        },
        en
      )
    ).toBe('RSS')
  })
})

describe('resolveAuthors', () => {
  it('accepts a single Author or a list, and always returns a list', () => {
    expect(resolveAuthors('A')).toHaveLength(1)
    expect(resolveAuthors(['A', 'B'])).toHaveLength(2)
  })

  it('preserves order and each Author’s own fields', () => {
    const authors = resolveAuthors([
      { name: 'One', twitter: '@one' },
      { name: 'Two', avatar: 'https://x/2.png' }
    ])
    expect(authors[0].name).toBe('One')
    expect(authors[0].socials[0].link).toBe('https://x.com/one')
    expect(authors[1]).toEqual({
      name: 'Two',
      avatar: 'https://x/2.png',
      socials: []
    })
  })
})

describe('matchAuthorScope', () => {
  const scopes = {
    posts: 'Site Wide',
    'posts/notes': 'Notes Team',
    'posts/notes/deep': 'Deep Team'
  }

  it('matches a directory and everything beneath it', () => {
    expect(matchAuthorScope('posts/a.md', scopes)).toBe('Site Wide')
    expect(matchAuthorScope('posts/notes/a.md', scopes)).toBe('Notes Team')
  })

  it('lets the longest matching scope win', () => {
    expect(matchAuthorScope('posts/notes/deep/a.md', scopes)).toBe('Deep Team')
  })

  it('does not match a sibling directory that merely shares a prefix', () => {
    expect(matchAuthorScope('posts/notes-archive/a.md', scopes)).toBe(
      'Site Wide'
    )
  })

  it('normalises surrounding slashes on the key', () => {
    expect(matchAuthorScope('posts/notes/a.md', { '/posts/notes/': 'N' })).toBe(
      'N'
    )
  })

  it('refuses a wildcard key rather than reading it as a directory', () => {
    // A scope is already a prefix match, so `posts/notes/**` says nothing `posts/notes` does
    // — but `posts/*` looks like one level and would cover every directory under `posts`.
    // Refusing both is what keeps a key's meaning equal to what it says.
    expect(() =>
      matchAuthorScope('posts/notes/a.md', { 'posts/notes/**': 'N' })
    ).toThrow(/names directories, not globs/)
    expect(() =>
      matchAuthorScope('posts/notes/a.md', { 'posts/*': 'N' })
    ).toThrow(/posts\/\*/)
  })

  it('returns undefined when nothing matches or there are no scopes', () => {
    expect(matchAuthorScope('pages/a.md', scopes)).toBeUndefined()
    expect(matchAuthorScope('posts/a.md', undefined)).toBeUndefined()
  })
})
