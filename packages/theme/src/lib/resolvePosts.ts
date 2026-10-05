import { type ContentData } from 'vitepress'
import {
  formatDate,
  parseDate,
  toISODate,
  DEFAULT_DATE_FORMAT
} from './date.js'
import { resolveAuthors, matchAuthorScope } from './author.js'
import { isExcluded } from './exclude.js'
import { anchorExcerptLinks } from './excerpt.js'
import type {
  Author,
  CustomSocial,
  Post,
  PriorityConflict,
  ResolvePostsResult,
  SkippedPost,
  SocialValue,
  SortDirection,
  SortMode,
  ResolvedBlogConfig
} from './types.js'

export interface ResolvePostsOptions {
  /**
   * The Site's `srcDir`, used to express each Post's content path relative to the
   * Site root. Author Scope is matched against that path.
   */
  srcDir?: string
  /**
   * List Posts the sorting mode cannot place — under `sort: 'global'`, a Post that states
   * no `order`, so the Blog has no position for it.
   *
   * Dev sets this, for the same reason it lists Drafts: an author writing wants to see the
   * Post they have not positioned yet. A production build never sets it, which is what
   * keeps such a Post out of the Blog, the Feed and the index.
   */
  listUnplaced?: boolean
}

/**
 * Turn raw Post candidates into the Blog, and report what was left out.
 *
 * This is a pure function on purpose: it is the single implementation of the
 * Theme's "does this belong in the Blog?" judgement, and being pure is what makes
 * it testable without a running VitePress process — which the loader around it
 * cannot be, since `createContentLoader` needs `globalThis.VITEPRESS_CONFIG`.
 *
 * A candidate is left out when it is marked `draft: true`, when its frontmatter excludes
 * it, when it carries no usable date, or when `sort: 'global'` is in force and it states
 * no `order`. The first three leave the file itself in the Site untouched; an excluded
 * one is also kept out of the Site's pages by `scanExcluded`, so it has no HTML at all.
 * Every case is reported in `skipped` so the caller can tell the author.
 *
 * A file that declares its own `layout` the Theme does not render as a Post — `page` or
 * `home` — is not a candidate at all, and is left out without a reason. See
 * `isNonPostLayout`.
 */
export function resolvePosts(
  raw: ContentData[],
  themeConfig: ResolvedBlogConfig,
  options: ResolvePostsOptions = {}
): ResolvePostsResult {
  const {
    author: defaultAuthor,
    authorScopes,
    locale,
    dateFormat
  } = themeConfig

  const { mode, direction } = themeConfig.sort

  const resolvedLocale = locale
  const resolvedFormat = dateFormat ?? DEFAULT_DATE_FORMAT

  const posts: Post[] = []
  const skipped: SkippedPost[] = []

  for (const entry of raw) {
    const frontmatter = (entry.frontmatter ?? {}) as Record<string, unknown>

    // A file that is not a Post is left out before any of the tests below can report it.
    // See `isNonPostLayout`.
    if (isNonPostLayout(frontmatter)) continue

    const path = contentPathOf(entry, options.srcDir)
    const reasons: string[] = []

    if (frontmatter.draft === true) {
      reasons.push('draft: true')
    }

    // An excluded file is not merely absent from the Blog: it is not part of the Site.
    // Reading the flag here is also what makes the decision live in dev — the loader
    // re-runs on every edit, while the route-level `srcExclude` only catches up on a
    // config reload.
    if (isExcluded(frontmatter)) {
      reasons.push('exclude: true')
    }

    const date = parseDate(frontmatter.date)
    if (!date) {
      reasons.push(
        frontmatter.date === undefined || frontmatter.date === null
          ? 'no date'
          : `unparseable date: ${String(frontmatter.date)}`
      )
    }

    const pin = readPin(frontmatter.pin)
    const order = readNumber(frontmatter.order)

    // Under `sort: 'global'` the whole Blog hangs off `order`, so a Post without one has
    // nowhere to go. The Theme says so rather than inventing a position.
    if (mode === 'global' && order === undefined && !options.listUnplaced) {
      reasons.push("no order, and sort: 'global'")
    }

    if (reasons.length) {
      skipped.push({ url: entry.url, path, reasons })
      continue
    }

    // `date` is non-null from here: the only way past the check above is a
    // parseable date. Binding the timestamp once also keeps the narrowing local.
    const publishedAt = date as Date

    const authored = authorFromFrontmatter(frontmatter)
    const authors = resolveAuthors(
      authored ?? matchAuthorScope(path, authorScopes) ?? defaultAuthor
    )

    const frontmatterDescription = frontmatter.description
    const statedDescription =
      typeof frontmatterDescription === 'string' &&
      frontmatterDescription.trim()
        ? frontmatterDescription.trim()
        : undefined

    // An excerpt is the Post's own Markdown, rendered against the Post as its page, so its
    // relative links mean "relative to this Post" — they are anchored back before the index
    // and the Feed show it somewhere else. A `description` is the Site's own text and is
    // used exactly as written.
    const excerpt = entry.excerpt?.trim()
    const description =
      statedDescription ??
      (excerpt ? anchorExcerptLinks(excerpt, entry.url) : undefined)

    posts.push({
      url: entry.url,
      path,
      title: typeof frontmatter.title === 'string' ? frontmatter.title : '',
      date: formatDate(publishedAt, resolvedLocale, resolvedFormat),
      iso: toISODate(publishedAt),
      time: +publishedAt,
      description,
      tags: Array.isArray(frontmatter.tags)
        ? frontmatter.tags.filter(
            (tag): tag is string => typeof tag === 'string'
          )
        : [],
      authors,
      ...(pin === undefined ? {} : { pin }),
      ...(order === undefined ? {} : { order })
    })
  }

  posts.sort(compareByPriority(mode, direction))
  attachNavigation(posts, mode)

  return { posts, skipped, conflicts: findConflicts(posts, mode) }
}

/**
 * Whether a candidate states a `layout` the Theme does not render as a Post.
 *
 * `layout` is VitePress's own vocabulary for page identity, and the Theme's Layout dispatches
 * on the same values: `home` renders the Blog index, `page` renders a standalone document, and
 * anything else renders a Post. Collection Scope is a glob, so it can match a file that states
 * one of the first two; such a file is deliberately not a Post, and the loader leaves it out
 * silently. Warning that it carries no `date` would be telling the author about a file that was
 * never meant to state one.
 *
 * Only those two values count. An unknown layout, or none at all, stays a Post candidate,
 * because Layout renders it as one.
 */
function isNonPostLayout(frontmatter: Record<string, unknown>): boolean {
  const { layout } = frontmatter
  return layout === 'home' || layout === 'page'
}

/**
 * Read `pin`. A boolean is allowed here and nowhere else: `true` is the shorthand for the
 * lowest weight, so that a Site can pin a Post without deciding where among the pinned
 * Posts it belongs. `false` reads as absent, because it states no weight at all.
 */
function readPin(value: unknown): number | undefined {
  if (value === true) return 0
  return readNumber(value)
}

/**
 * Read a sorting weight. Only a finite number states one; anything else — a quoted number,
 * a stray word — reads as absent rather than crashing the build, the same tolerance
 * `draft` and `date` are read with.
 */
function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * The Blog's index order: Pinned Posts first, then the subject key in the stated direction,
 * then the tie-breakers.
 *
 * `order` changes rank with the mode rather than changing meaning: under `sort: 'date'` the
 * date is the Blog's subject and `order` only settles a day, while under `sort: 'global'`
 * `order` is the subject and the date settles a tie. The title is the last resort in both,
 * so the Blog renders in one order everywhere, whatever the loader read first.
 *
 * `direction` turns the subject round — the date under `date`, the stated priority under
 * `global` — and is the one thing it moves. `pin` stays a lift to the front and the
 * tie-breakers keep the single direction ADR 0006 gave them, so `asc` reads one Blog backwards
 * without redefining what `order` means. Navigation does not read it at all; see
 * `compareBySortKey`.
 */
function compareByPriority(
  mode: SortMode,
  direction: SortDirection
): (a: Post, b: Post) => number {
  const key = compareBySortKey(mode, direction)
  return (a, b) => {
    // An absent `pin` is not a weight of zero — it is a Post that is not pinned, and every
    // pinned Post precedes every unpinned one.
    const pinned = compareDescending(a.pin, b.pin)
    if (pinned !== 0) return pinned

    return key(a, b)
  }
}

/**
 * The Blog's sorting key: its subject first, then the tie-breakers.
 *
 * This is what a Post's Next and Previous follow, which is why it is separate from `pin` — a
 * lift to the front of the index rather than a position in time — and why the navigation reads
 * it in its default direction however the index is turned: "Next Article" names the key-greater
 * Post on every Site, so the words keep one meaning. See
 * `docs/adr/0011-navigation-follows-the-sorting-key.md`.
 */
function compareBySortKey(
  mode: SortMode,
  direction: SortDirection = 'desc'
): (a: Post, b: Post) => number {
  const flipped = direction === 'asc' ? -1 : 1
  return (a, b) => {
    const subject =
      mode === 'global' ? compareDescending(a.order, b.order) : b.time - a.time
    if (subject !== 0) return flipped * subject

    const settled =
      mode === 'global' ? b.time - a.time : compareDescending(a.order, b.order)
    if (settled !== 0) return settled

    return a.title.localeCompare(b.title)
  }
}

/**
 * Point every Post at the neighbours its sorting key gives it.
 *
 * The chain is built from a second, key-ordered copy rather than from the Blog's own array:
 * that array is the index, and `pin` and `sort.direction` both reorder it without moving a Post
 * along the key. A component then renders two fields it was handed instead of searching the
 * array for itself — which is where "Next Article" used to come out pointing at the older Post,
 * because the index runs the other way round.
 *
 * The Blog's order is the Theme's judgement, so where the neighbour is belongs here, next to the
 * comparator that defines the key.
 *
 * Only Posts the Blog kept are on the chain, which is the whole of what happens to a skipped
 * candidate: a Draft or an Unplaced Post is dropped before `posts` is sorted, so the Posts
 * published around it link to each other across it, and its own page never finds a Post to
 * attach links to.
 */
function attachNavigation(posts: Post[], mode: SortMode): void {
  const ordered = posts.toSorted(compareBySortKey(mode))
  ordered.forEach((post, index) => {
    const next = ordered[index - 1]
    const previous = ordered[index + 1]
    if (next) post.next = { url: next.url, title: next.title }
    if (previous) post.prev = { url: previous.url, title: previous.title }
  })
}

/**
 * Descending, with a stated weight ahead of none. A Post that states no weight has none, so
 * it follows the Posts that do — otherwise `order: 0` would be indistinguishable from
 * saying nothing, which is the opposite of what writing it means.
 */
function compareDescending(
  a: number | undefined,
  b: number | undefined
): number {
  if (a === undefined && b === undefined) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  return b - a
}

/**
 * The priorities two Posts state alike, so the title had to decide between them.
 *
 * `pin` always competes across the pinned Posts. `order` competes across the whole Blog
 * only under `sort: 'global'`; under `sort: 'date'` two Posts on different days never
 * compete over it, so the day is part of what makes two `order`s the same.
 *
 * Only *stated* weights are compared. Omitted ones are not a priority two Posts share, and
 * reporting them would mean a warning for every pair of Posts published the same day.
 *
 * Paths come out in Blog order: `posts` is already sorted, and the comparator is total, so
 * the reading here does not depend on how the loader enumerated the files.
 */
function findConflicts(posts: Post[], mode: SortMode): PriorityConflict[] {
  const groups = new Map<string, PriorityConflict>()

  function note(
    field: 'pin' | 'order',
    value: number,
    post: Post,
    scope = ''
  ): void {
    const key = `${field}:${scope}${value}`
    const group = groups.get(key) ?? { field, value, paths: [] }
    group.paths.push(post.path)
    groups.set(key, group)
  }

  for (const post of posts) {
    if (post.pin !== undefined) note('pin', post.pin, post)
    if (post.order === undefined) continue
    note('order', post.order, post, mode === 'global' ? '' : `${post.time}:`)
  }

  return [...groups.values()].filter((group) => group.paths.length > 1)
}

/**
 * A Post candidate's path relative to the source directory, e.g.
 * `posts/notes/draft.md`.
 *
 * `createContentLoader` gives us the absolute `src`; we prefer it because Author
 * Scope is a statement about directories on disk. When `src` or `srcDir` is
 * unavailable we fall back to the URL, which is close enough for scope matching
 * because URLs mirror content paths.
 */
function contentPathOf(entry: ContentData, srcDir: string | undefined): string {
  if (srcDir && entry.src) {
    const dir = srcDir.replace(/\\/g, '/').replace(/\/+$/, '')
    const src = entry.src.replace(/\\/g, '/')
    if (src.startsWith(dir + '/')) return src.slice(dir.length + 1)
  }
  return entry.url.replace(/^\//, '')
}

/**
 * Read the Author a Post credits.
 *
 * Two spellings are accepted, because the reference site uses the flat one and
 * VitePress documents the nested one:
 *
 * ```yaml
 * # flat — one author, with the identity fields as siblings
 * author: Evan You
 * gravatar: eca93da2c67aadafe35d477aa8f454b8
 * twitter: '@youyuxi'
 * github: https://github.com/yyx990803
 * ```
 *
 * ```yaml
 * # nested — preferred for a new Blog, and the only way to credit several Authors
 * author:
 *   name: Evan You
 *   gravatar: eca93da2c67aadafe35d477aa8f454b8
 *   twitter: '@youyuxi'
 * ```
 *
 * The sibling fields only apply when `author` is a bare name; once an Author is
 * written as an object, its own fields are authoritative.
 *
 * Every Social Link has a sibling of its own, so the flat form is not a second-class
 * one. They are the same fields the nested form takes, with the same meaning — including
 * `x` beating `twitter`, and `mail` accepting a bare address.
 */
function authorFromFrontmatter(
  frontmatter: Record<string, unknown>
): Author | Author[] | undefined {
  const authored = frontmatter.author as Author | Author[] | undefined
  if (typeof authored !== 'string') return authored

  const gravatar = asString(frontmatter.gravatar)
  const avatar = asString(frontmatter.avatar)
  const twitter = asString(frontmatter.twitter)
  const url = asString(frontmatter.authorUrl)
  const x = asSocialValue(frontmatter.x)
  const github = asSocialValue(frontmatter.github)
  const facebook = asSocialValue(frontmatter.facebook)
  const instagram = asSocialValue(frontmatter.instagram)
  const mail = asSocialValue(frontmatter.mail)
  const customSocial = asCustomSocial(frontmatter.customSocial)

  if (
    !gravatar &&
    !avatar &&
    !twitter &&
    !url &&
    !x &&
    !github &&
    !facebook &&
    !instagram &&
    !mail &&
    !customSocial
  ) {
    return authored
  }

  return {
    name: authored,
    ...(avatar ? { avatar } : {}),
    ...(gravatar ? { gravatar } : {}),
    ...(url ? { url } : {}),
    ...(twitter ? { twitter } : {}),
    ...(x ? { x } : {}),
    ...(github ? { github } : {}),
    ...(facebook ? { facebook } : {}),
    ...(instagram ? { instagram } : {}),
    ...(mail ? { mail } : {}),
    ...(customSocial ? { customSocial } : {})
  }
}

/**
 * A Social Link written as a frontmatter sibling: either the shorthand string or the
 * mapping form `{ url, label }`, which YAML reads as an object.
 */
function asSocialValue(value: unknown): SocialValue | undefined {
  if (typeof value === 'string') return asString(value)
  if (!value || typeof value !== 'object') return undefined
  const { url, label } = value as { url?: unknown; label?: unknown }
  const link = asString(url)
  if (!link) return undefined
  const name = asString(label)
  return name ? { url: link, label: name } : { url: link }
}

/**
 * `customSocial` written as a frontmatter sibling: one Custom Social Link, or a list of them.
 *
 * Nothing is validated here beyond the shape of the container. The fields inside are the
 * Author's own, and `resolveAuthor` is what reads them.
 */
function asCustomSocial(
  value: unknown
): CustomSocial | CustomSocial[] | undefined {
  if (!value || typeof value !== 'object') return undefined
  if (Array.isArray(value))
    return value.length ? (value as CustomSocial[]) : undefined
  return value as CustomSocial
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
