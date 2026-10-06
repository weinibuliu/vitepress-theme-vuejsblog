import type { Route } from 'vitepress'

/**
 * `path` placed under `prefix` with exactly one `/` between them.
 *
 * Where a Site lives is stated once — VitePress's `base` — and the Theme's origin is stated
 * once, in `themeConfig.blog.origin`. Every URL the Theme emits is one of those prefixes
 * followed by a path, and the two cannot be joined with `+`: VitePress's `base` ends with `/`
 * by its own convention and a Site's paths begin with `/`, so plain concatenation produces
 * `//logo.svg` in the document and a doubled directory in the Feed.
 *
 * An empty `prefix` leaves `path` as written — the case `genFeed`'s `allowMissingorigin`
 * creates, where there is no origin to place in front of the path.
 */
export function joinUrl(prefix: string, path: string): string {
  return prefix
    ? `${prefix.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
    : path
}

/**
 * The origin `origin` states, with the Site's `base` removed when the Site wrote it twice.
 *
 * `origin` is documented as an origin, and the Theme appends VitePress's `base` to it for the
 * Feed's absolute links. A Site that reads the field's name as "the URL of the base" writes
 * `https://example.com/blog` — and then both are appended, so every link in the Feed names a
 * directory that does not exist. The repetition is reported rather than silently resolved: an
 * address is the one thing a Feed cannot be wrong about.
 */
export function withoutDoubledBase(
  origin: string,
  base: string
): { origin: string; duplicated: boolean } {
  const trimmed = origin.replace(/\/+$/, '')
  const path = base.replace(/^\/+|\/+$/g, '')
  if (!path) return { origin: trimmed, duplicated: false }

  const suffix = `/${path}`
  return trimmed.endsWith(suffix)
    ? { origin: trimmed.slice(0, -suffix.length), duplicated: true }
    : { origin: trimmed, duplicated: false }
}

/**
 * `url` as an absolute URL, resolving a site-relative path against `prefix`.
 *
 * `prefix` is an origin — `https://blog.example` — when the answer has to stand on its own,
 * because an RSS reader parses the Feed away from the Site, or the Site's own `base` when the
 * document supplies the origin instead.
 *
 * Both `logo` and `favicon` accept either a site-relative path — `/logo.svg`, which is what
 * the reference site uses — or a full URL, for an asset on a CDN. Prefixing unconditionally
 * turned the second case into `https://blog.examplehttps://cdn.example/logo.svg`, and RSS 2.0
 * writes that straight into the channel's `<image>`.
 */
export function absoluteUrl(url: string, prefix: string): string {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url) ? url : joinUrl(prefix, url)
}

/**
 * The location a reader asked for, reassembled from the pieces the router keeps it in.
 *
 * This is the one fact a 404 has to work with. VitePress leaves the route pointing at the
 * URL that failed to resolve — `path` is the requested path, not `404.md` — and splits the
 * rest off into `query` and `hash`, each *including* its own leading `?` or `#`. Putting the
 * three back together is therefore concatenation, and nothing more; the reason it is a
 * function is that the quirk is worth stating once and testing without a component.
 */
export function requestedLocation(
  route: Pick<Route, 'path' | 'query' | 'hash'>
): string {
  return `${route.path}${route.query}${route.hash}`
}
