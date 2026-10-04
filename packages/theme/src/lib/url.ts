import type { Route } from 'vitepress'

/**
 * `url` as an absolute URL, resolving a site-relative path against `baseUrl`.
 *
 * A Feed needs absolute URLs, and both `logo` and `favicon` accept either a site-relative
 * path — `/logo.svg`, which is what the reference site uses — or a full URL, for an asset on
 * a CDN. Prefixing unconditionally turned the second case into
 * `https://blog.examplehttps://cdn.example/logo.svg`, and RSS 2.0 writes that straight into
 * the channel's `<image>`.
 */
export function absoluteUrl(url: string, baseUrl: string): string {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url) ? url : `${baseUrl}${url}`
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
