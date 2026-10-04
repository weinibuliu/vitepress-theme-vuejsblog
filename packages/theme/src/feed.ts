import path from 'node:path'
import { writeFileSync } from 'node:fs'
import { Feed } from 'feed'
import { createContentLoader, type SiteConfig } from 'vitepress'
import { resolvePosts } from './lib/resolvePosts.js'
import { absoluteUrl, joinUrl, withoutDoubledBase } from './lib/url.js'
import { readThemeConfig } from './lib/config.js'
import type {
  FeedOptions,
  Post,
  ResolvedAuthor,
  ResolvedBlogConfig
} from './lib/types.js'

/**
 * The Feed settings, with `false` (meaning "no Feed") already ruled out and the
 * remaining fields defaulted.
 */
function feedOptionsOf(
  blog: ResolvedBlogConfig
): Required<Pick<FeedOptions, 'path'>> & FeedOptions {
  // Callers have already returned when `feed` is `false`, so what is left is either
  // settings or nothing at all.
  const configured = (blog.feed ?? {}) as FeedOptions
  return { ...configured, path: configured.path ?? 'feed.rss' }
}

export interface GenFeedOptions {
  /**
   * Generate the Feed even when `themeConfig.blog.baseUrl` is missing.
   *
   * By default a missing `baseUrl` skips generation with a warning, because every
   * link in the Feed has to be absolute and guessing the origin would publish
   * wrong URLs.
   */
  allowMissingBaseUrl?: boolean
}

/**
 * Generate the Site's Feed.
 *
 * Wire it up from the Site's config:
 *
 * ```ts
 * export default defineConfig({
 *   extends: blogConfig(root),
 *   buildEnd: (config) => genFeed(config)
 * })
 * ```
 *
 * A Site may equally call `renderFeed` directly from its own `buildEnd` if it
 * wants to build the XML from data it already holds.
 *
 * ## Why the Feed carries excerpts, not full text
 *
 * The reference site sets `render: true` on its content loader so that the Feed
 * can embed every post's full HTML. VitePress serialises a loader's output into
 * the client bundle, so that choice ships the whole Blog to every visitor's
 * browser as JSON — content only Feed readers ever need. The Theme instead keeps
 * full text out of the bundle and puts a Post's `description` (or its rendered
 * excerpt) into the Feed. An author who wants a longer Feed can write a longer
 * `description`; nothing else changes.
 *
 * The excerpt is cut by the same marker the index uses — a Site reads one Blog, so its
 * list and its Feed cannot be allowed to end a Post's summary in different places.
 */
export async function genFeed(
  config: SiteConfig,
  options: GenFeedOptions = {}
): Promise<void> {
  const blog = readThemeConfig(config)

  if (blog.feed === false) return

  if (!blog.baseUrl && !options.allowMissingBaseUrl) {
    config.logger.warn(
      '[blog] themeConfig.blog.baseUrl is not set, so no Feed was generated. ' +
        'Set it to your site origin, e.g. "https://example.com".'
    )
    return
  }

  const rendered = await renderFeed({
    blog,
    srcDir: config.srcDir,
    siteBase: config.site.base,
    warn: (message) => config.logger.warn(message)
  })

  if (!rendered) return

  const feedOptions = feedOptionsOf(blog)
  const outPath = path.join(config.outDir, feedOptions.path)

  writeFileSync(
    outPath,
    withUtf8ByteOrderMark(
      withDublinCoreCreators(rendered.feed.rss2(), rendered.posts)
    )
  )
  config.logger.info(`[blog] generated ${feedOptions.path}`)
}

/**
 * The UTF-8 byte order mark, prepended for whoever reads the Feed as anything but XML.
 *
 * A browser will not render `application/rss+xml` with its XML view: Chrome shows the
 * Feed as plain text. Neither `vitepress preview` nor most static hosts put a `charset`
 * on that Content-Type, and plain-text decoding never reads the XML declaration, so the
 * browser falls back to its locale's default encoding and a Blog written in any language
 * other than the browser's comes out as mojibake. The byte order mark is the one encoding
 * signal that every consumer honours — read before the Content-Type, read before the
 * declaration — and XML 1.0 §4.3.3 permits one, so both kinds of reader decode the Feed
 * as UTF-8.
 */
function withUtf8ByteOrderMark(rss: string): string {
  return `\uFEFF${rss}`
}

/**
 * Add a `<dc:creator>` to each item.
 *
 * `feed`'s RSS 2.0 renderer drops an author unless it has **both** an `email` and a
 * `name`:
 *
 * ```js
 * if (author.email && author.name) {
 *   item.author.push({ _text: author.email + " (" + author.name + ")" })
 * }
 * ```
 *
 * A blog does not usually want to publish its authors' email addresses, so the Theme gives
 * an Author a name and a link, and RSS 2.0 silently renders no author at all. `Atom` has no
 * such requirement — `formatAuthor` there keeps the name and link — which is also why the
 * `author` field stays on each item even though the RSS renderer ignores it.
 *
 * `<dc:creator>` is the conventional way to name an author in RSS 2.0, and `feed` already
 * declares the Dublin Core namespace on the channel, so this only has to insert the
 * elements. There is no supported route to it: `feed`'s `extensions` field is consumed by
 * its JSON renderer alone.
 */
function withDublinCoreCreators(rss: string, posts: Post[]): string {
  let index = 0
  return rss.replace(/^(?<indent>[ \t]*)<item>$/gm, (match, indent: string) => {
    const names = (posts[index++]?.authors ?? [])
      .map((author) => author.name)
      .filter((name): name is string => Boolean(name))
    if (!names.length) return match
    // Match the library's own indentation for the elements that follow.
    const creators = names
      .map((name) => `${indent}    <dc:creator>${escapeXml(name)}</dc:creator>`)
      .join('\n')
    return `${match}\n${creators}`
  })
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export interface RenderFeedArgs {
  blog: ResolvedBlogConfig
  srcDir: string
  siteBase: string
  /**
   * Told when the Site's config leaves the Feed's addresses doubtful.
   *
   * There is one such case: a `baseUrl` that already carries the Site's `base`. Appending the
   * base again would publish links to a directory that does not exist, so the repetition is
   * dropped — but the Site did ask for it, and a Feed's addresses are the one thing it cannot
   * be wrong about, so the disagreement is reported rather than passed over.
   */
  warn?: (message: string) => void
}

/**
 * A Feed and the Posts it was built from.
 */
export interface RenderedFeed {
  feed: Feed
  /**
   * The very Posts the Feed was built from.
   *
   * Returned rather than re-derived, so that whoever writes the RSS does not have to run
   * discovery a second time — and so the creator names cannot drift from the items they
   * belong to.
   */
  posts: Post[]
}

/**
 * Build the Feed object from the Theme's own Post collection, or `undefined` when
 * there is nothing to publish.
 *
 * Exported so that a Site can compose its own `buildEnd` without re-implementing
 * item construction.
 */
export async function renderFeed({
  blog,
  srcDir,
  siteBase,
  warn
}: RenderFeedArgs): Promise<RenderedFeed | undefined> {
  const raw = await createContentLoader(blog.posts, {
    excerpt: blog.excerptSeparator
  }).load()
  const { posts } = resolvePosts(raw, blog, { srcDir })

  if (!posts.length) return undefined

  const feedOptions = feedOptionsOf(blog)
  const { origin, duplicated } = withoutDoubledBase(
    blog.baseUrl ?? '',
    siteBase
  )
  if (duplicated) {
    warn?.(
      '[blog] themeConfig.blog.baseUrl already ends with the Site base, so it was ' +
        `not added a second time. baseUrl is the Site origin alone, e.g. ` +
        `"https://example.com" — the mount path comes from VitePress's base ` +
        `("${siteBase}").`
    )
  }

  // The origin plus the mount path. Where the Site lives is stated once, by VitePress, so
  // every URL the Feed carries is built from the two rather than from a Site-authored prefix.
  const prefix = joinUrl(origin, siteBase)
  const link = joinUrl(prefix, '/')

  const feed = new Feed({
    title: blog.title,
    description: blog.description ?? '',
    id: link,
    link,
    language: feedOptions.language,
    copyright: feedOptions.copyright ?? '',
    image: blog.logo ? absoluteUrl(blog.logo, prefix) : undefined,
    favicon: absoluteUrl(blog.favicon, prefix),
    updated: new Date(posts[0].time)
  })

  for (const post of posts) {
    const url = joinUrl(prefix, post.url)
    feed.addItem({
      title: post.title,
      id: url,
      link: url,
      description: post.description,
      content: post.description,
      author: post.authors.map(toFeedAuthor),
      date: new Date(post.time)
    })
  }

  return { feed, posts }
}

/**
 * Name an Author in the Feed, and link to them.
 *
 * The homepage comes first: it is the one address the Author chose for themselves. Failing
 * that the first Social Link stands in — the Feed has a single slot per Author, and one
 * useful link beats none. Which link that is does not depend on the order the Site wrote
 * its config in, because the Theme orders Social Links itself.
 */
function toFeedAuthor(author: ResolvedAuthor) {
  return {
    name: author.name,
    link: author.url ?? author.socials[0]?.link
  }
}
