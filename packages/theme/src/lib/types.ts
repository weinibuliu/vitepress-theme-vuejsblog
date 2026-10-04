import './types-vp.js'

/**
 * A Social Link written the long way, so the Site can state the text to show beside
 * the icon.
 *
 * A plain string is shorthand for `{ url }`. The value is a complete URL: the Theme
 * builds no platform URL, except for the two noted on the fields themselves.
 */
export type SocialValue = string | { url: string; label?: string }

/**
 * A platform the Theme knows a Social Link for.
 *
 * `customSocial` is deliberately outside this union: a Custom Social Link is defined by the
 * Site, not by the Theme, so has no platform name to fall back on.
 */
export type SocialPlatform = 'x' | 'github' | 'facebook' | 'instagram' | 'mail'

/**
 * A Social Link the Theme has no platform for, so the Site supplies everything about
 * it.
 *
 * - `label`: display text
 * - `icon`: plain string is a URL to an image,
 * - { svg }: inline SVG markup.
 */
export interface CustomSocial {
  label: string
  icon: string | { svg: string }
  link: string
}

/**
 * An Author, as written either in Theme Config or in a Post's frontmatter.
 *
 * A plain string is shorthand for `{ name }`.
 */
export type Author =
  | string
  | {
      name: string

      /**
       * A full URL to the avatar image.
       */
      avatar?: string

      /**
       * A Gravatar hash. Ignored when `avatar` present.
       *
       * @see https://docs.gravatar.com/rest/hash/
       */
      gravatar?: string

      /**
       * A personal homepage.
       *
       * Kept apart from the Social Links: it is what the name and the avatar link to,
       * and it has no handle, so it has no place among the icons.
       */
      url?: string

      /**
       * The Author's X profile, e.g. `https://x.com/example`.
       */
      x?: SocialValue

      /**
       * The Author's Github profile, e.g. `https://github.com/weinibuliu`.
       */
      github?: SocialValue

      /**
       * The Author's Facebook profile, e.g. `https://facebook.com/example`.
       */
      facebook?: SocialValue

      /**
       * The Author's Instagram profile, e.g. `https://facebook.com/example`.
       */
      instagram?: SocialValue

      /**
       * A full `mailto:` URL or a bare address to which the Theme adds `mailto:`.
       */
      mail?: SocialValue

      /**
       * A handle, with or without a leading `@`. The Theme builds `https://x.com/<handle>` from it.
       *
       * Ignored when `x` is present.
       *
       * @deprecated Recommend using `x` instead.
       */
      twitter?: string
      /**
       * A Social Link the Theme has no platform for. One, or several.
       */
      customSocial?: CustomSocial | CustomSocial[]
    }

/**
 * One Author, or array for a co-authored Post.
 */
export type Authors = Author | Author[]

/**
 * What a Social Link's icon is: a name VitePress's icon pipeline resolves, inline SVG markup, or the URL of an image.
 */
export type ResolvedSocialIcon =
  | { name: string }
  | { svg: string }
  | { src: string }

/**
 * A Social Link the components can render.
 *
 * All the platform work — building `https://x.com/<handle>`, adding `mailto:`, choosing
 * the icon — happens here, so a component only ever iterates this list and a new
 * platform never reaches a template.
 */
export interface ResolvedSocial {
  /**
   * The `href`.
   */

  link: string

  /**
   * The text to show beside the icon when this is the Author's only Social Link: the
   * Site's `label` when it gave one, otherwise a readable form of the link. An Author
   * with several Social Links shows icons alone.
   */
  text: string

  /**
   * The Site's own label for the link. Also its accessible name, so it beats the
   * Theme's name for the platform.
   */
  label?: string

  /**
   * The platform the Theme recognises. Absent for a Custom Social Link.
   */
  platform?: SocialPlatform

  icon: ResolvedSocialIcon

  /**
   * Whether the link leaves the Site, which is what decides `target="_blank"`.
   */
  external: boolean
}

/**
 * The Author shape the components render. Every field is resolved: the avatar has
 * already been turned into a URL, and every Social Link into a link, a label and an
 * icon.
 */
export interface ResolvedAuthor {
  name: string
  avatar?: string
  url?: string
  socials: ResolvedSocial[]
}

/**
 * Which key orders the Blog.
 *
 * - `date` — the date is the Blog's subject, and a Post's `order` only breaks ties within the
 *   same day.
 * - `global` — a Post's `order` is the subject across the whole Blog, which makes it required:
 *   a Post that states none has no position, so it leaves the Blog and the Feed.
 */
export type SortMode = 'date' | 'global'

/**
 * Which end of the Blog's subject key the index starts from.
 *
 * - `desc` — the default: newest first under `date`, highest `order` first under `global`.
 * - `asc` — the same Blog read the other way round.
 *
 * It turns the index, and nothing else. A Post's Next and Previous links follow the key rather
 * than the rows, so they mean the same thing in either direction — see
 * `docs/adr/0011-navigation-follows-the-sorting-key.md`.
 */
export type SortDirection = 'desc' | 'asc'

/**
 * `sort` written out, for a Site that wants its listing the other way round.
 */
export interface SortOptions {
  mode: SortMode

  /**
   * @default 'desc'
   */
  direction?: SortDirection
}

/**
 * How a Site may state the Blog's order: the mode alone, which is the whole answer for almost
 * every Site, or the mode with a direction.
 */
export type SortSetting = SortMode | SortOptions

/**
 * The Blog's order with both parts resolved.
 */
export interface ResolvedSort {
  mode: SortMode
  direction: SortDirection
}

/**
 * A Post's neighbour on the Blog's sorting key, carrying what a navigation link needs: where
 * to go and what to call it.
 */
export interface PostNeighbour {
  url: string
  title: string
}

/**
 * A Post as the Theme's components consume it.
 */
export interface Post {
  /**
   * The Post's URL, including the Site's `base`.
   */
  url: string

  /**
   * The Post's source path relative to the Site's source directory, e.g.
   * `posts/vue-3-5.md`. Carried so a component can identify which Post it is
   * rendering: VitePress 2 exposes the current page's `relativePath` rather than a
   * router path.
   */
  path: string

  title: string

  /**
   * The date as a preformatted display string, per the Site's `locale` and
   * `dateFormat`.
   */
  date: string

  /**
   * The date as a `yyyy-mm-dd` string, for `<time datetime>` and feed entry ids.
   */
  iso: string

  /**
   * The date as a UTC-noon timestamp, used for sorting.
   */
  time: number

  /**
   * `description` from frontmatter when present, otherwise the rendered excerpt, whose links
   * are anchored back to the Post it came from — see `anchorExcerptLinks`.
   */
  description?: string

  tags: string[]

  authors: ResolvedAuthor[]

  /**
   * The Post's weight among the Pinned Posts. Present means the Post is pinned, and is
   * what the badge and the leading position both follow; the number itself is never
   * displayed, because a reader needs to know *that* a Post is pinned, not how the pinned
   * Posts are ranked among themselves.
   *
   * `pin: true` in frontmatter arrives here as `0`, so the two spellings are one value.
   */
  pin?: number

  /**
   * The Post's stated ordering priority, descending. In `sort: 'date'` it breaks ties
   * within a day; in `sort: 'global'` it orders the whole Blog. Never displayed.
   */
  order?: number

  /**
   * The Post the Blog's sorting key places immediately after this one — the newer Post under
   * `sort: 'date'`, the higher `order` under `sort: 'global'`. Absent at the end of the Blog.
   *
   * Attached by `resolvePosts` rather than derived from a position in the loader's array: that
   * array is the index, which `pin` and `sort.direction` both reorder without moving a Post
   * along the key. See `docs/adr/0011-navigation-follows-the-sorting-key.md`.
   */
  next?: PostNeighbour

  /**
   * The Post the sorting key places immediately before this one — the older Post under
   * `sort: 'date'`, the lower `order` under `sort: 'global'`. Absent at the start of the Blog.
   */
  prev?: PostNeighbour
}

/**
 * A priority two Posts state alike, so the Theme cannot order them by it and falls back to
 * their titles. Dev warns; a production build refuses to publish.
 */
export interface PriorityConflict {
  field: 'pin' | 'order'
  value: number
  /**
   * The colliding Posts, by content path — what an author needs to open the files.
   */
  paths: string[]
}

/**
 * A Post candidate the Theme left out of the Blog, and why.
 */
export interface SkippedPost {
  url: string

  /**
   * The content path relative to the source directory, e.g. `posts/notes/draft.md`.
   */
  path: string

  /**
   * Human-readable reasons, e.g. `['draft: true']`.
   */
  reasons: string[]
}

export interface ResolvePostsResult {
  posts: Post[]
  skipped: SkippedPost[]
  conflicts: PriorityConflict[]
}

/**
 * The Blog index's hero.
 *
 * The reference site is a project blog: a large left-aligned heading over the Post list. A
 * personal blog usually wants the other thing — an avatar, a name, a line about the person —
 * so the hero turns the index's heading into that.
 */
export interface HeroConfig {
  /**
   * The avatar above the heading.
   *
   * Defaults to the Site Author's avatar, so a personal blog does not state the same picture
   * twice. Pass `false` for no avatar — useful when the Author's avatar belongs on bylines
   * but not here. A string overrides it for the hero alone.
   */

  avatar?: string | false

  /**
   * The heading. Defaults to the index page's `title` frontmatter, then the Blog's `title`.
   */
  title?: string

  /**
   * The line under the heading, rendered as **HTML** — inline markup such as a link, the
   * same way `footer.text` works. This field has one consumer, the hero itself.
   *
   * Defaults to the Blog's `description`, which is *not* HTML: that same value is also sent
   * to the Feed, and plain text may legitimately contain a `<` (`'How to use <script> tags'`).
   * The fallback is therefore rendered as text, not parsed.
   *
   * Note that the `<meta name="description">` tag is VitePress's own site-level
   * `description`, not this one — the two are separate fields.
   */
  subtext?: string
}

/**
 * A link in the Theme's top navigation row.
 */
export interface NavItem {
  link: string

  /**
   * Ignored when `icon` present
   */
  text?: string

  /**
   * SVG String
   *
   */
  icon?: string

  /**
   * Open in a new tab. Defaults to `true` for absolute URLs.
   *
   * State it for a file the Site ships as well — the Feed above all. VitePress's client router
   * handles every same-origin link itself unless its anchor carries `target`, and it only knows
   * a URL is a file rather than a page from a list of extensions that does not include `.rss`.
   * Left internal, a link to `feed.rss` is rendered as a route, and the reader gets the 404 page.
   */
  external?: boolean
}

/**
 * A link in the Theme's footer.
 *
 * Same shape as `NavItem`, so a Site describes a link the same way in both places.
 */
export interface FooterLink {
  text: string
  link: string
  /**
   * Open in a new tab. Defaults to `true` for absolute URLs.
   *
   * The Feed needs it for the same reason it does in the nav — see `NavItem.external`.
   */
  external?: boolean
}

/**
 * The Theme's footer.
 *
 * Two roles rather than one list, because they lay out differently: a line of prose and a
 * row of links. A single array cannot express both — it forces the copyright notice into
 * the same evenly-spaced flex row as the links.
 */
export interface FooterConfig {
  /**
   * A line of prose, rendered as **HTML** — so `<a href="/feed.rss">RSS</a>` works, but
   * Markdown does not. VitePress's own footer behaves the same way, and rendering Markdown
   * here would mean the Theme depending on a renderer API VitePress marks `@experimental`.
   *
   * The value comes from your own config, so it is trusted in the same way VitePress trusts
   * `themeConfig.footer.message`. It is not sanitised.
   */
  text?: string
  /**
   * The links, laid out as one row opposite `text`.
   */
  links?: FooterLink[]
}

/**
 * Feed generation settings.
 */
export interface FeedOptions {
  /**
   * The Feed's output path, relative to the VitePress `outDir`.
   *
   * @default 'feed.rss'
   */
  path?: string

  /**
   * The Feed's language tag, e.g. `zh-CN`. Also used as the default `locale` for
   * date formatting when `locale` is not set.
   *
   * @default 'en-US'
   */

  language?: string
  copyright?: string
}

/**
 * Everything the Theme lets a Site configure, under `themeConfig.blog`.
 */
export interface BlogThemeConfig {
  /**
   * The website's title. Required.
   *
   * Used as the nav title, the home page heading, the Feed title,
   * and the fallback HTML `<title>`.
   */
  title: string

  /**
   * A one- or two-sentence description of the blog.
   *
   * Used as the home page subtext, the default HTML description,
   * and the Feed description.
   *
   */
  description?: string

  /**
   * The display title shown in the nav. Optional.
   *
   * Defaults to `themeConfig.blog.title`.
   */
  siteTitle?: string | false

  /**
   * The subtitle displayed on the home page. Optional.
   *
   * Support HTML
   */
  siteSubText?: string

  /**
   * The Blog's origin — scheme, host and port alone, e.g. `https://example.com`, with no path.
   *
   * The Feed is the only thing that reads it. RSS is parsed away from the Site, so its links
   * have to be absolute rather than relative to a document, and the origin is what makes them
   * so. Where the Site is mounted is a separate fact and is stated once, by VitePress's `base`;
   * the Theme appends it. Writing the path here as well duplicates it, which the Theme warns
   * about and drops.
   *
   * Required to generate a Feed; when omitted the Theme warns and skips Feed generation.
   */
  baseUrl?: string

  /**
   * The Site's Default Author, used for any Post that credits none.
   */
  author: Author

  /**
   * Default Authors for particular content directories, keyed by directory path
   * relative to the source directory. The longest matching key wins.
   *
   * @example { 'posts/notes': 'Team Notes' }
   */
  authorScopes?: Record<string, Author>

  /**
   * The globs that decide which Markdown files are Post candidates, relative to
   * the source directory.
   *
   * @default 'posts/*.md'
   */
  posts?: string | string[]

  /**
   * Logo image URL shown in the nav.
   */
  logo?: string

  /**
   * The browser-tab icon. A site-relative path or a full URL.
   *
   * Defaults to `/favicon.ico`, which is also what a browser probes on its own. Stating it is
   * what makes it controllable: VitePress declares no favicon at all, so before this the tab
   * icon worked only because of that convention, and a Site that named its icon anything else
   * had no way to say so.
   */
  favicon?: string

  /**
   * The Blog index's hero. Off unless configured, so the reference layout stays the
   * default.
   */
  hero?: HeroConfig

  /**
   * The Theme's top navigation row.
   */
  nav?: NavItem[]

  /**
   * the separator in the blog layout's navigation bar.
   *
   * @default ·
   */
  navSeparator?: string

  /**
   * The Theme's footer.
   */
  footer?: FooterConfig

  /**
   * The language of the Theme's own interface strings — "Next Article", "Read more",
   * "404 Page Not Found" and so on. Matching is on the primary subtag, so `zh-CN` and
   * `zh-Hans` both work. An unknown tag falls back to English.
   *
   * @default 'en'
   */
  lang?: string

  /**
   * A BCP 47 language tag used for date formatting. Defaults to `lang`, so a Site that
   * only wants its own language usually sets that one alone.
   *
   * @default lang ?? feed.language ?? 'en-US'
   */
  locale?: string

  /**
   * Override the date format. Defaults to a long month, day and year.
   */
  dateFormat?: Intl.DateTimeFormatOptions

  /**
   * How the Blog is ordered, and which end of it the index starts from. See `SortMode` and
   * `SortDirection`.
   *
   * The mode alone is the whole answer for almost every Site, because `'date'` already means
   * newest first; the written-out form is for a Site that wants its listing the other way
   * round, which moves the index and nothing else.
   *
   * @default 'date' — that is, `{ mode: 'date', direction: 'desc' }`
   */
  sort?: SortSetting

  /**
   * The marker that ends a Post's excerpt — what the Blog index and the Feed show in place
   * of the Post itself, unless the Post states a `description` of its own.
   *
   * `'---'` was the Theme's first default, because that is the convention blog.vuejs.org
   * writes. But `---` is also Markdown's horizontal rule and a table's header row, and the
   * marker is looked for wherever it appears rather than on a line of its own, so a Post
   * could end its excerpt inside its own typography. `<!-- more -->` appears in prose only
   * when the author means it.
   *
   * A Site whose Posts are written the old way can say `'---'` to keep them; a single Post
   * may state `excerpt_separator` in its frontmatter to override the Site.
   *
   * `false` — `excerptSeparator: false` — switches the excerpt off: the loader is not asked
   * to extract one, so a Post's own `excerpt_separator` has nothing to act on either, and a
   * `description` in frontmatter becomes the only way to fill the space under a title.
   *
   * @default '<!-- more -->'
   */

  excerptSeparator?: string | false

  /**
   * Whether a Post shows its TOC — the list of its own headings, below the byline and
   * the Next/Previous links.
   *
   * On by default, because a Post long enough to have headings is a Post a reader may
   * want to jump around in, and the list is small. A single Post states `toc: false` in
   * its frontmatter to opt out, or `toc: true` to opt back in when the Site has switched
   * the TOC off.
   *
   * The headings are VitePress's own `page.headers`, which `markdown.headers` collects.
   * That option is off by default and the Theme turns it on in its base config, so a Site
   * that states `markdown: { headers: false }` of its own gets no TOC — see
   * `docs/adr/0009-headings-come-from-the-build.md`.
   *
   * @default true
   */
  toc?: boolean

  /**
   * Feed settings, or `false` to generate no Feed.
   */
  feed?: FeedOptions | false
}

/**
 * The `themeConfig` shape a Site passes to `defineConfig`.
 *
 * The index signature is what lets a Site merge its own `themeConfig` keys with
 * the Theme's rather than replacing them.
 */
export interface ThemeConfig {
  blog?: BlogThemeConfig
  [key: string]: unknown
}

/**
 * The Theme Config with its defaults applied. Every field except the genuinely
 * optional descriptive ones is present.
 */
export interface ResolvedBlogConfig extends BlogThemeConfig {
  posts: string | string[]
  favicon: string
  nav: NavItem[]
  sort: ResolvedSort
  toc: boolean
  footer: ResolvedFooterConfig
}

/**
 * The footer with its defaults applied: `links` is always a list, so callers never have to
 * ask whether it exists.
 */
export interface ResolvedFooterConfig extends FooterConfig {
  links: FooterLink[]
}
