import type { LangStrings } from './i18n.js'
import type {
  Author,
  Authors,
  CustomSocial,
  ResolvedAuthor,
  ResolvedSocial,
  ResolvedSocialIcon,
  SocialPlatform,
  SocialValue
} from './types.js'

/**
 * An Author as written in Theme Config or in a Post's frontmatter, once the bare-string
 * shorthand is ruled out.
 */
type AuthorObject = Exclude<Author, string>

/**
 * What counts as leaving the Site, which is what decides `target="_blank"`.
 */
const EXTERNAL = /^https?:\/\//i

/**
 * The one glyph the Theme draws itself.
 *
 * A stroke rather than a fill, in `currentColor`, so it follows the byline's colour the
 * way the mask-tinted brand marks do. `aria-hidden` because the link carries the name.
 */
const MAIL_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<rect x="3" y="5.5" width="18" height="13" rx="1.5"></rect>' +
  '<path d="m3.8 6.6 8.2 6.3 8.2-6.3"></path>' +
  '</svg>'

/**
 * The icon each platform is drawn with.
 *
 * The four brand marks come from simple-icons, which `vitepress` itself depends on, so a
 * Site resolves them without installing an icon collection. The envelope cannot come
 * from there: simple-icons carries brands only, and its only envelopes are the Mail.ru
 * and Mail.com logos. Drawing one glyph by hand is cheaper than making every Site
 * install a general collection for it.
 */
const PLATFORM_ICONS: Record<SocialPlatform, ResolvedSocialIcon> = {
  x: { name: 'simple-icons:x' },
  github: { name: 'simple-icons:github' },
  facebook: { name: 'simple-icons:facebook' },
  instagram: { name: 'simple-icons:instagram' },
  mail: { svg: MAIL_ICON }
}

/**
 * The order Social Links appear in, so a byline is stable no matter how the Site wrote
 * its config. Custom Social Links follow, in the order the Site gave them.
 */
const PLATFORM_ORDER: readonly SocialPlatform[] = [
  'github',
  'facebook',
  'instagram',
  'mail'
]

/**
 * Turn an Author into the fully-resolved shape the components render.
 *
 * A bare string becomes a name-only author; a `gravatar` hash becomes a Gravatar URL;
 * every Social Link becomes a link, a label and an icon, so no component has to know one
 * platform from another.
 */
export function resolveAuthor(author: Author): ResolvedAuthor {
  if (typeof author === 'string') {
    return { name: author, socials: [] }
  }
  const resolved: ResolvedAuthor = {
    name: author.name,
    socials: resolveSocials(author)
  }
  if (author.avatar) {
    resolved.avatar = author.avatar
  } else if (author.gravatar) {
    resolved.avatar = `https://gravatar.com/avatar/${author.gravatar}`
  }
  if (author.url) resolved.url = author.url
  return resolved
}

export function resolveAuthors(authors: Authors): ResolvedAuthor[] {
  const list = Array.isArray(authors) ? authors : [authors]
  return list.filter(Boolean).map(resolveAuthor)
}

/**
 * The text a byline shows beside an Author's icons.
 *
 * A sole Social Link gets its text; several get icons alone, because a row of labels is
 * a wall of prose rather than a byline. `undefined` means icons alone.
 */
export function socialCaption(socials: ResolvedSocial[]): string | undefined {
  return socials.length === 1 ? socials[0].text : undefined
}

/**
 * A Social Link's accessible name.
 *
 * The Site's own label wins, because it is what the Site chose to call the link. Failing
 * that the Theme names the platform, which is why a Custom Social Link requires a label:
 * it has no platform to fall back on, and an icon-only link with no name is unusable by
 * a screen reader.
 */
export function socialAriaLabel(
  social: ResolvedSocial,
  strings: LangStrings
): string {
  if (social.label) return social.label
  return social.platform ? strings[social.platform] : social.text
}

function resolveSocials(author: AuthorObject): ResolvedSocial[] {
  const socials: ResolvedSocial[] = []

  // One platform, two spellings. `x` states the URL; `twitter` states the handle and the
  // Theme builds the URL, because the handle is the Site's own explicit answer and the
  // domain is fixed by the field. `x` wins when both are present: a URL is the more
  // specific statement, and the two cannot be merged because their values differ in kind.
  if (author.x !== undefined) {
    socials.push(fromValue('x', author.x))
  } else if (author.twitter !== undefined) {
    const handle = author.twitter.replace(/^@+/, '').trim()
    if (handle) socials.push(fromHandle(handle))
  }

  for (const platform of PLATFORM_ORDER) {
    const value = author[platform]
    if (value === undefined) continue
    socials.push(
      platform === 'mail' ? fromMail(value) : fromValue(platform, value)
    )
  }

  for (const custom of customList(author.customSocial)) {
    socials.push(fromCustom(custom))
  }

  return socials
}

function fromHandle(handle: string): ResolvedSocial {
  return {
    link: `https://x.com/${handle}`,
    // Not derived from the link: the Site wrote the handle, so the byline repeats what it
    // wrote rather than parsing it back out of a URL.
    text: `@${handle}`,
    platform: 'x',
    icon: PLATFORM_ICONS.x,
    external: true
  }
}

function fromValue(
  platform: SocialPlatform,
  value: SocialValue
): ResolvedSocial {
  const { url, label } = toUrl(value)
  return withOptionalLabel(
    {
      link: url,
      text: readableLink(url),
      platform,
      icon: PLATFORM_ICONS[platform],
      external: EXTERNAL.test(url)
    },
    label
  )
}

/**
 * `mail` takes a bare address as readily as a `mailto:` URL. A bare address would
 * otherwise render as `href="me@example.com"` — a relative link the browser resolves
 * against the current page and fails on quietly — so the scheme is what the Theme adds.
 */
function fromMail(value: SocialValue): ResolvedSocial {
  const { url, label } = toUrl(value)
  const link = /^mailto:/i.test(url) ? url : `mailto:${url}`
  return withOptionalLabel(
    {
      link,
      text: readableLink(link),
      platform: 'mail',
      icon: PLATFORM_ICONS.mail,
      external: EXTERNAL.test(link)
    },
    label
  )
}

function fromCustom(custom: CustomSocial): ResolvedSocial {
  const icon: ResolvedSocialIcon =
    typeof custom.icon === 'string'
      ? { src: custom.icon }
      : { svg: custom.icon.svg }
  return {
    link: custom.link,
    text: custom.label,
    label: custom.label,
    icon,
    external: EXTERNAL.test(custom.link)
  }
}

/**
 * A parsed Social Link value: the URL, and the Site's label for it when it gave one.
 */
function toUrl(value: SocialValue): { url: string; label?: string } {
  if (typeof value === 'string') return { url: value.trim() }
  const label =
    typeof value.label === 'string' && value.label.trim()
      ? value.label.trim()
      : undefined
  return label === undefined
    ? { url: value.url.trim() }
    : { url: value.url.trim(), label }
}

/**
 * Add the Site's label, when it gave one. The label is also the text, because a Site
 * that bothered to name the link meant that name to be read.
 */
function withOptionalLabel(
  social: ResolvedSocial,
  label: string | undefined
): ResolvedSocial {
  if (label === undefined) return social
  return { ...social, text: label, label }
}

/**
 * The readable form of a link, for a byline with nothing better to show: the scheme comes
 * off, because the icon already says where the link goes.
 */
function readableLink(link: string): string {
  return link
    .replace(/^mailto:/i, '')
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
}

function customList(
  custom: CustomSocial | CustomSocial[] | undefined
): CustomSocial[] {
  if (!custom) return []
  return (Array.isArray(custom) ? custom : [custom]).filter(Boolean)
}

/**
 * Find the Default Author for a Post, by matching its content path against the
 * Site's `authorScopes`.
 *
 * The longest matching scope wins, so `posts/notes` beats `posts` for
 * `posts/notes/anything.md`. A key names a directory, and may be written with or without
 * surrounding slashes; a key that carries a wildcard is an error rather than a pattern,
 * because a scope is already a prefix match — `posts/notes/**` says nothing `posts/notes`
 * does not, while `posts/*` would silently cover every directory under `posts` instead of
 * the one level it appears to name.
 */
export function matchAuthorScope(
  contentPath: string,
  authorScopes: Record<string, Author> | undefined
): Author | undefined {
  if (authorScopes == null) return undefined

  const normalizedPath = contentPath.replace(/\\/g, '/').replace(/^\/+/, '')

  const WILDCARD_RE = /[*?[\]{}]/
  const normalizedScopes = new Map<string, { key: string; author: Author }>()
  for (const [key, author] of Object.entries(authorScopes)) {
    if (!author) continue

    if (WILDCARD_RE.test(key)) {
      throw new Error(
        `authorScopes names directories, not globs: ${JSON.stringify(key)}. ` +
          'A scope already covers everything under it, so write the directory instead.'
      )
    }

    const scope = key.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
    if (!scope) continue

    const existing = normalizedScopes.get(scope)
    if (existing !== undefined) {
      throw new Error(
        `Conflicting authorScopes: "${existing.key}" and "${key}" both normalize to "${scope}". Please keep only one.`
      )
    }
    normalizedScopes.set(scope, { key, author })
  }

  let bestScope: string | undefined
  let bestValue: Author | undefined

  for (const [scope, value] of normalizedScopes) {
    if (value == null) continue

    if (normalizedPath === scope || normalizedPath.startsWith(scope + '/')) {
      if (bestScope === undefined || scope.length > bestScope.length) {
        bestScope = scope
        bestValue = value.author
      }
    }
  }

  return bestValue
}
