import { readFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Assert the Theme's behaviour against a real build of the playground.
 *
 * This is the other half of the verification story: `vitest` covers the pure
 * judgement in `resolvePosts`, and this covers what the judgement turns into in
 * actual HTML and RSS — which is where the bugs that mattered were found
 * (`draft: true` leaking into a production list, avatars silently vanishing,
 * `layout: page` rendering as a Post).
 *
 * Run `pnpm build` first, then `pnpm verify`.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'playground/.vitepress/dist')

/**
 * Where the playground is deployed, as two separate facts.
 *
 * The origin and the mount path are stated in different places — `themeConfig.blog.baseUrl`
 * and VitePress's `base` — and keeping them apart is the whole point of the checks below:
 * every URL the build writes is one of the two prefixed to a path, so a build that conflates
 * them links to a directory that does not exist. Both are written here rather than read back
 * out of a built file, because an assertion that asks the build what the build did cannot
 * catch a wrong prefix.
 */
const ORIGIN = 'https://weinibuliu.github.io'
const BASE = '/vitepress-theme-vuejsblog/'

/**
 * A deployed URL in the form the Site's own content writes it, so that the checks about
 * *which* Posts the build published do not each restate the prefix. The prefix is asserted
 * separately, against the URLs as they were written.
 */
function siteRelative(url) {
  return url.startsWith(BASE) ? url.slice(BASE.length - 1) : url
}

/**
 * Fixtures the playground adds on top of the reference site's real content.
 *
 * Both live under `docs/demo/`, which the playground's Collection Scope
 * (`docs/**\/*.md`) picks up. They are the two ways a file can be missing from the Blog,
 * and they differ in one thing: a Draft is still a page, an excluded file is not.
 */
const DRAFT = { url: '/docs/demo/draft', file: 'docs/demo/draft.html' }
const EXCLUDED = { url: '/docs/demo/exclude', file: 'docs/demo/exclude.html' }

let failures = 0
let checks = 0

function check(description, condition, detail) {
  checks += 1
  if (condition) {
    console.log(`  ok   ${description}`)
    return
  }
  failures += 1
  console.log(`  FAIL ${description}${detail ? ` — ${detail}` : ''}`)
}

function read(relative) {
  const full = path.join(dist, relative)
  return existsSync(full) ? readFileSync(full, 'utf8') : ''
}

function section(title) {
  console.log(`\n${title}`)
}

/** Concatenate every file under `dir` whose name ends with `extension`. */
function readAll(dir, extension) {
  if (!existsSync(dir)) return ''
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return readAll(full, extension)
      return entry.name.endsWith(extension) ? [readFileSync(full, 'utf8')] : []
    })
    .join('\n')
}

/** WCAG relative luminance of a `#rrggbb` colour. */
/**
 * `#abc` → `#aabbcc`, lower-cased.
 *
 * A minifier writes `#ffffff` as `#fff`, and both the hex reading below and the luminance
 * maths assume six digits — the shorthand would parse as `NaN` channels and turn every
 * ratio into `NaN`.
 */
function normalizeHex(hex) {
  const value = hex.toLowerCase()
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
  }
  return value
}

function relativeLuminance(hex) {
  const normalized = normalizeHex(hex)
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(normalized.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** WCAG contrast ratio between two hex colours. */
function contrastRatio(a, b) {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].toSorted(
    (x, y) => y - x
  )
  return (high + 0.05) / (low + 0.05)
}

if (!existsSync(dist)) {
  console.error(`No build found at ${dist}. Run \`pnpm build\` first.`)
  process.exit(1)
}

const home = read('index.html')
const feed = read('feed.rss')

section('Blog index')
// Only the list's own title links, so that links inside a rendered excerpt — which
// are ordinary Post content — are not mistaken for list entries.
const listedLinkMatches = [
  ...home.matchAll(/class="vp-blog-content-list-link" href="([^"]+)"/g)
]
const listedPosts = [
  ...new Set(listedLinkMatches.map((m) => siteRelative(m[1])))
]
const titleLinkCount = [...home.matchAll(/class="vp-blog-content-list-link"/g)]
  .length
check('lists Posts', listedPosts.length > 0, `found ${listedPosts.length}`)
check(
  'lists each Post once',
  titleLinkCount === listedPosts.length,
  `${titleLinkCount} title links for ${listedPosts.length} Posts`
)
check(
  'every listed Post link is mounted under the Site base',
  listedLinkMatches.length > 0 &&
    listedLinkMatches.every((match) => match[1].startsWith(BASE)),
  listedLinkMatches
    .map((match) => match[1])
    .filter((href) => !href.startsWith(BASE))
    .join(', ')
)
check(
  'leaves a Draft out of the list',
  !listedPosts.includes(DRAFT.url),
  listedPosts.join(', ')
)
check(
  'leaves an excluded file out of the list',
  !listedPosts.includes(EXCLUDED.url),
  listedPosts.join(', ')
)

section('Drafts')
// A Draft is hidden from the Blog, not from the Site: it still renders, and anyone with
// the URL can read it.
check(
  'a Draft is still rendered as a page',
  existsSync(path.join(dist, DRAFT.file))
)
check(
  'a Draft renders as a Post',
  read(DRAFT.file).includes('vp-blog-content-post-title')
)

section('Excluded files')
// The one thing `exclude: true` does that `draft: true` does not: the file is not a page at
// all, so no HTML is emitted. Its absence from the list is asserted above; this is the
// routing half, which `srcExclude` is responsible for.
check(
  'an excluded file produces no HTML',
  !existsSync(path.join(dist, EXCLUDED.file))
)

section('Feed')
check('a Feed was generated', feed.length > 0)
// Browsers refuse to render `application/rss+xml` as XML — Chrome shows the Feed as plain
// text — and neither `vitepress preview` nor most static hosts add a `charset` to that
// Content-Type. Plain-text decoding never reads the XML declaration, so without a byte
// order mark the browser falls back to its locale's encoding and the Blog comes out as
// mojibake. The mark is read here as text because that is how the check below sees it.
check(
  'the Feed begins with a UTF-8 byte order mark',
  feed.startsWith('\uFEFF'),
  JSON.stringify(feed.slice(0, 20))
)
// The Feed's URLs are absolute, so the comparison is made against the same Site-relative form
// the fixtures are written in. The prefix those URLs carry is asserted just below.
const feedRelative = feed.split(`${ORIGIN}${BASE}`).join('/')
check(
  'Feed carries neither a Draft nor an excluded file',
  !feedRelative.includes(DRAFT.url) && !feedRelative.includes(EXCLUDED.url)
)
const items = (feed.match(/<item>/g) ?? []).length
check(
  'Feed item count matches the Blog index',
  items === listedPosts.length,
  `${items} items vs ${listedPosts.length} Posts`
)
check('Feed links are absolute', feed.includes('<link>https://'))

/**
 * Every URL the Feed carries: the channel's `link`, each item's `link` and `guid`, and the
 * channel image's `url`.
 */
const feedUrls = [
  ...feed.matchAll(/<(?:link|guid|url)>([^<]+)<\/(?:link|guid|url)>/g)
].map((match) => match[1])

/**
 * The base, as one directory name, so a URL can be asked how many times it names it.
 *
 * This is the check the Feed needed and did not have. `baseUrl` used to be read as "the URL of
 * the base": the playground wrote the mount path into it as well, the Theme appended `base`,
 * and every link in the Feed named `/vitepress-theme-vuejsblog/vitepress-theme-vuejsblog/`.
 * The Feed stayed valid XML throughout, which is why nothing but counting occurrences catches
 * it — "is it absolute" and "is there a `//`" both pass on a URL with a doubled directory.
 */
const BASE_SEGMENT = BASE.replace(/^\/+|\/+$/g, '')
const namesBaseOnce = (url) => url.split(BASE_SEGMENT).length === 2
check(
  'every Feed URL is absolute and names the Site base exactly once',
  feedUrls.length > 0 &&
    feedUrls.every((url) => url.startsWith(ORIGIN) && namesBaseOnce(url)),
  feedUrls
    .filter((url) => !url.startsWith(ORIGIN) || !namesBaseOnce(url))
    .join(', ')
)
check(
  'Feed links do not double a slash after the origin',
  !/https:\/\/[^<]*[^:/]\/\//.test(feed)
)
check('Feed declares a language', /<language>[^<]+<\/language>/.test(feed))

// `feed`'s RSS renderer silently drops an author that has no email, which is the usual
// case for a blog, so the Theme adds the creators itself. Silence is the failure mode
// here — the Feed stays valid and simply has no authors — so this is asserted, not assumed.
// A Site-relative logo has to be absolutised for the Feed, and under the base rather than at
// the origin: `/logo.svg` is served from the mount path like every other asset. The other half
// — a logo that is already a full URL must not be prefixed again — is asserted in
// verify-package, which builds a Site that has one.
check(
  'the Feed absolutises a site-relative logo under the Site base',
  feed.includes(`<url>${ORIGIN}${BASE}logo.svg</url>`),
  feed.match(/<url>[^<]*<\/url>/)?.[0]
)

const feedItems = feed.split('<item>').slice(1)
const creatorsIn = (item) =>
  [...item.matchAll(/<dc:creator>([^<]*)<\/dc:creator>/g)].map((m) => m[1])
check(
  'every Feed item names its Author',
  feedItems.length > 0 &&
    feedItems.every((item) => creatorsIn(item).length > 0),
  `${feedItems.filter((item) => creatorsIn(item).length === 0).length} item(s) without a creator`
)
check(
  'a co-authored Post lists every Author in the Feed',
  feedItems.some((item) => creatorsIn(item).length === 2)
)
check(
  'Author names are XML-escaped',
  feed.includes('<dc:creator>Guest &amp; One</dc:creator>') &&
    !feed.includes('<dc:creator>Guest & One<')
)
// Regression guard: if an email ever appears in an Author, `feed` would start emitting its
// own `<author>` too, and the Feed would name the same person twice.
check('no Author email leaks into the Feed', !/<author>/.test(feed))

section('Authors')
const newest = read('posts/vue-3-5.html')
check('renders the byline', newest.includes('vp-blog-ui-byline-name'))
check(
  'resolves the Gravatar hash to an avatar URL',
  newest.includes('gravatar.com/avatar/')
)
check('keeps the @ on a handle', newest.includes('>@youyuxi<'))
check('uses rel=noopener on external links', newest.includes('rel="noopener"'))
check(
  'does not contain the reference site’s `noopnener` typo',
  !newest.includes('noopnener')
)

// The playground's Author Scope is `docs`, which covers its `docs/` tree. This fixture
// credits no Author of its own, so its byline can only come from the scope's Default
// Author. (`docs/welcome` would not do: it states its Authors, so it exercises nothing.)
const scopedPost = read('docs/demo/author-scope.html')
check(
  'applies an Author Scope Default Author',
  scopedPost.includes('weinibuliu')
)

// The demo keeps its fixtures under `docs/demo/`, which the playground's Collection Scope
// (`docs/**/*.md`) picks up.
const guest = read('docs/demo/co-authors.html')
const avatars = (guest.match(/class="vp-blog-ui-byline-avatar"/g) ?? []).length
check(
  'renders every co-Author',
  // The fixture's first Author carries an `&`, so this also covers HTML escaping in the
  // rendered byline rather than only in the Feed.
  guest.includes('Guest &amp; One') && guest.includes('Guest Two')
)
check(
  'gives each co-Author their own avatar',
  avatars === 1,
  `${avatars} avatar(s)`
)

section('Page identity')
check(
  '`layout: home` renders the Blog index',
  home.includes('vp-blog-content-index')
)
// The `layout: page` fixture lives with the other demo files under `docs/demo/`; it was
// moved there from the Site root's `about.md`, and this path was left behind.
const plainPage = read('docs/demo/page.html')
check(
  '`layout: page` renders a document, not a Post',
  plainPage.includes('vp-blog-content-doc') &&
    !plainPage.includes('vp-blog-content-post-title')
)
check(
  '`layout: page` still gets VitePress typography',
  plainPage.includes('vp-doc')
)

// VitePress deliberately server-renders the 404 page as an empty shell and fills
// it in on the client (`render.ts`: `<div id="app">${page === '404.md' ? '' : content}`),
// so the only place its markup can be asserted from a build is the client bundle.
// Chunks live in a subdirectory of `assets`, so this walks.
const clientJs = readAll(path.join(dist, 'assets'), '.js')
check(
  '404 ships the Theme’s NotFound copy',
  clientJs.includes('404 Page Not Found')
)
// The 404's reason for existing is the location that failed to resolve, and its markup
// cannot be read back from `404.html` — so what is asserted here is that the element
// carrying it, and the modifier that centres the page between the nav and the footer, ship
// in the bundle. The CSS half of the modifier is checked with the rest of the Style Layer.
check(
  '404 renders the location that failed to resolve',
  clientJs.includes('vp-blog-content-not-found-route-path')
)
check('404 asks the shell to centre it', clientJs.includes('is-not-found'))

section('Post navigation')
// A Post's neighbour is the next one on the Blog's sorting key, so the links are read out of the
// built pages and checked as a chain. Which way the chain runs is pinned down by the fixtures at
// the end of this section, against the reference site's own content; that the chain is one chain
// over the whole Blog is derived, because naming a "first" and a "last" fixture only says what
// the playground happens to publish today.
const NAV_LINK =
  /vp-blog-content-post-nav-title">(Next|Previous) Article<\/h2><a class="vp-blog-link" href="([^"]+)"/g

/**
 * Every navigation href as the document wrote it, before `siteRelative` strips the prefix. The
 * chain below is checked in Site-relative terms; this is what keeps the prefix itself asserted.
 */
const rawNavHrefs = []

/**
 * The navigation links a built Post page carries, by the labels they are under, in the
 * Site-relative form the rest of this section reasons in.
 */
function navLinks(url) {
  const links = { next: undefined, previous: undefined }
  for (const [, label, href] of read(`${url}.html`).matchAll(NAV_LINK)) {
    rawNavHrefs.push(href)
    if (label === 'Next') links.next = siteRelative(href)
    else links.previous = siteRelative(href)
  }
  return links
}

const navigation = new Map(listedPosts.map((url) => [url, navLinks(url)]))
const chainStarts = listedPosts.filter((url) => !navigation.get(url).previous)
const chainEnds = listedPosts.filter((url) => !navigation.get(url).next)

check(
  'every Post navigation link is mounted under the Site base',
  rawNavHrefs.length > 0 && rawNavHrefs.every((href) => href.startsWith(BASE)),
  rawNavHrefs.filter((href) => !href.startsWith(BASE)).join(', ')
)

check(
  'the Blog is one chain: exactly one Post starts it and one ends it',
  chainStarts.length === 1 && chainEnds.length === 1,
  `starts ${chainStarts.join(', ') || 'nowhere'}; ends ${chainEnds.join(', ') || 'nowhere'}`
)
check(
  'every navigation link points at a Post the Blog lists',
  [...navigation.values()].every(({ next, previous }) =>
    [next, previous].every(
      (href) => href === undefined || listedPosts.includes(href)
    )
  )
)
check(
  'the links agree with each other: one Post’s Next is that Post’s Previous',
  listedPosts.every((url) => {
    const { next } = navigation.get(url)
    return next === undefined || navigation.get(next)?.previous === url
  })
)
// A Draft is not in the Blog, so it cannot be on the chain — the Posts published around it link
// to each other across it — and its own page finds no Post, so it renders no navigation at all.
// Neither follows from the checks above, where a Draft is simply absent from `posts` by the time
// the chain is built, so the rule is named here rather than left to follow from the skip. An
// excluded file is not even a page.
const drafts = [
  DRAFT.url,
  '/docs/en-us/not-ready-for-production',
  '/docs/zh-cn/not-ready-for-production'
]
const neighbours = [...navigation.values()].flatMap(({ next, previous }) => [
  next,
  previous
])
check(
  'no navigation link points at a Draft or an excluded file',
  [DRAFT.url, EXCLUDED.url].every((url) => !neighbours.includes(url))
)
check(
  'a Draft carries no navigation of its own',
  drafts.every((url) => {
    const { next, previous } = navLinks(url)
    return next === undefined && previous === undefined
  }),
  drafts.join(', ')
)
// Following Next from the start has to arrive at every Post once. A fork would leave two Posts
// claiming the same neighbour and a break would strand the rest of the Blog, and both look like
// a chain from any single page.
const walked = []
for (
  let url = chainStarts[0];
  url !== undefined && !walked.includes(url);
  url = navigation.get(url)?.next
) {
  walked.push(url)
}
check(
  'following Next from the first Post visits the whole Blog once',
  walked.length === listedPosts.length,
  `${walked.length} of ${listedPosts.length} Posts`
)

// Which end of the chain carries which label is the one thing the chain cannot settle, so it is
// read from the reference site's own content. On blog.vuejs.org `posts/vue-3-one-piece` is the
// oldest Post and carries "Next Article", pointing at the Post published after it. An offset into
// the Blog's array points that link at nothing, or at the row above it; the sorting key points it
// at the newer Post, which is what the words mean.
const oldest = navigation.get('/posts/vue-3-one-piece')
check(
  'the oldest Post carries Next, and points at the Post published after it',
  oldest?.next === '/posts/hello-2021' && oldest.previous === undefined,
  JSON.stringify(oldest)
)
const middle = navigation.get('/posts/vue-3-2')
check(
  'a middle Post links to the Posts published before and after it',
  middle?.next === '/posts/vue-3-as-the-new-default' &&
    middle.previous === '/posts/hello-2021',
  JSON.stringify(middle)
)
// "Back to the blog" is `/`, which is the mount path and not the domain root: on this Site the
// two are different pages, and only one of them is the Blog.
check(
  'every Post links back to the Blog, under the Site base',
  guest.includes(`class="vp-blog-link" href="${BASE}"`) &&
    guest.includes('Back to the blog')
)

section('TOC')
// A Post's TOC is a tree the build collects and the components render — `markdown.headers`
// into `pageData.headers`, then `resolveToc`. What is worth checking is the one thing those
// two halves can disagree about on their own: whether the list the reader is handed is the
// page the reader is on. A heading the TOC lists but the page does not have, or one the page
// has and the TOC leaves out, is invisible from inside either half.
//
// The pages are walked rather than named, because the playground's own Posts are already the
// awkward input this has to survive: headings nested in a `:::tip` (`vue-3-3`), Chinese
// headings whose ids are not ASCII (`welcome`), a Post with no headings at all (`demo/draft`),
// and a `layout: page` document that must keep its own typography and no TOC (`demo/page`).

/** Every built HTML file, as a path relative to `dist`. */
function pages(dir = dist, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) return pages(path.join(dir, entry.name), relative)
    return entry.name.endsWith('.html') ? [relative] : []
  })
}

/**
 * The part of a page that is a Post's body.
 *
 * `vp-blog-prose` is what tells a Post apart from a `layout: page` document — that one carries
 * `vp-doc` alone — and therefore which pages this section is about.
 */
function proseOf(html) {
  const start = html.indexOf('vp-doc vp-blog-prose')
  return start === -1 ? '' : html.slice(start)
}

const headingsOf = (html) =>
  [...html.matchAll(/<h([23])\s[^>]*id="([^"]+)"/g)].map((match) => match[2])

const tocLinksOf = (html) =>
  [...html.matchAll(/class="vp-blog-ui-toc-link" href="#([^"]+)"/g)].map(
    (match) => match[1]
  )

let listMismatch
let copyMismatch
let headinglessWithToc
const postsWithHeadings = []
const headinglessPosts = []

for (const page of pages()) {
  const html = read(page)
  const prose = proseOf(html)
  if (!prose) continue

  const headings = headingsOf(prose)
  const links = tocLinksOf(html)

  if (headings.length === 0) {
    // Nothing to list, so nothing is rendered — not the list and not the label over it.
    headinglessPosts.push(page)
    if (html.includes('vp-blog-ui-toc')) headinglessWithToc ??= page
    continue
  }

  postsWithHeadings.push(page)

  // The list is rendered twice — once for the frame's column, once inside the disclosure —
  // from the same tree, so the halves have to match each other and the page.
  const half = links.length / 2
  const column = links.slice(0, half)
  const disclosure = links.slice(half)
  if (links.length % 2 !== 0 || column.join('|') !== disclosure.join('|')) {
    copyMismatch ??= `${page}: ${links.length} link(s)`
  }
  if (column.join('|') !== headings.join('|')) {
    listMismatch ??= `${page}: TOC has ${column.length}, page has ${headings.length}`
  }
}

check(
  'the column and the disclosure render the same list',
  copyMismatch === undefined,
  copyMismatch
)
check(
  'a Post with no headings renders no TOC',
  headinglessWithToc === undefined,
  headinglessWithToc
)
// Without this, the three checks above would pass on a build that rendered no TOC at all, or
// on one whose pages this section never recognised as Posts.
check(
  'the playground has both kinds of Post for those checks to mean anything',
  postsWithHeadings.length > 5 && headinglessPosts.length > 0,
  `${postsWithHeadings.length} with headings, ${headinglessPosts.length} without`
)

// Read here rather than reused from the Style Layer section below, which reads the same
// stylesheet: hoisting its `const` above these checks would only couple the two sections.
const tocCss = readAll(path.join(dist, 'assets'), '.css')
check(
  'ships the TOC styles: the column’s copy sticky, the narrow bar fixed, and one rendering hidden at each width',
  /\.vp-blog-ui-toc\{[^}]*position:sticky/.test(tocCss) &&
    /\.vp-blog-ui-toc-nav[^{}]*\{display:none\}/.test(tocCss) &&
    /\.vp-blog-ui-toc-bar[^{}]*\{[^}]*position:fixed/.test(tocCss) &&
    /\.vp-blog-ui-toc-bar[^{}]*\{display:none\}/.test(tocCss) &&
    /\.vp-blog-ui-toc-panel\{[^}]*position:fixed/.test(tocCss) &&
    /\.vp-blog-ui-toc-panel\{display:none\}/.test(tocCss)
)

section('Shell')
// The nav is exactly what the Site configured, in order, and nothing else.
//
// The Theme used to append its own RSS item: a layout decision that belongs to the Site, that
// could not be removed, and that rendered even when no Feed file had been generated. The
// expected list mirrors `playground/.vitepress/config.ts`, which no longer carries the reference
// site's three links — `welcome` replaced them with the Theme's own repository and its Feed — so
// what this asserts is the Site's own decision rather than the reference layout.
//
// It reads the nav element's own links rather than searching the page, because the page is not
// only the nav: the index's Post excerpts mention GitHub as well. That a `home.includes('Github')`
// ever told the two apart is a matter of capitalisation, which is not a distinction to rely on.
const navHtml = home.slice(0, home.indexOf('</nav>'))
const navTexts = [
  ...navHtml.matchAll(/class="vp-blog-layout-nav-link"[^>]*>([^<]+)</g)
].map((match) => match[1].trim())
check(
  'the nav holds exactly the Site’s links, in order',
  navTexts.join('|') === ['Github', 'RSS Feed'].join('|'),
  navTexts.join(', ')
)
// Where a link points is the half its text cannot state. A Site writes its nav in Site-relative
// paths — `/feed.rss` — and VitePress's `base` is what turns those into deployed URLs. A Theme
// that passes them through renders them at the domain root, where nothing is.
const navAnchors = [
  ...navHtml.matchAll(
    /<a\b[^>]*class="[^"]*\bvp-blog-layout-nav-link\b[^"]*"[^>]*>/g
  )
].map((match) => match[0])
const navHrefs = navAnchors.map(
  (anchor) => anchor.match(/href="([^"]+)"/)?.[1] ?? ''
)
check(
  'every internal nav link is mounted under the Site base',
  navHrefs.length > 0 &&
    navHrefs.every(
      (href) => href.startsWith('https://') || href.startsWith(BASE)
    ),
  navHrefs.join(', ')
)
check(
  'the RSS nav link reaches the Feed the build wrote',
  navHrefs.includes(`${BASE}feed.rss`),
  navHrefs.join(', ')
)
// The one check a href cannot make. VitePress's client router handles every same-origin link
// itself unless its anchor carries `target` (`router.js`: `link.hasAttribute("target")` returns
// early), and it decides a URL is a page route from a list of extensions that does not include
// `.rss`. So an internal Feed link is rendered as a route and the reader gets the 404 component
// — with a 200, because the document was already loaded and never reloads. The Feed file being
// correct is what makes this look like a routing bug rather than a Feed bug.
const rssAnchor = navAnchors.find((anchor) =>
  anchor.includes(`href="${BASE}feed.rss"`)
)
check(
  'the Feed link carries a target, so the router lets the browser fetch it',
  Boolean(rssAnchor && /\btarget="/.test(rssAnchor)),
  rssAnchor ?? 'no Feed link in the nav'
)
// The reference site has no site footer, so this playground has none either. Footer
// rendering is covered by `verify-package.mjs`, whose consuming Site configures one.
check(
  'no footer is rendered when the Site configures none',
  !home.includes('vp-blog-layout-footer')
)

section('Document and chrome')
// VitePress declares no favicon at all, so before this the tab icon existed only because
// browsers probe /favicon.ico on their own and the playground happens to have one. Stating it
// is what makes it controllable — and it has to be stated under the mount path, because that
// is where the file is served from.
check(
  'declares the favicon, defaulted rather than left to browser convention',
  home.includes(`<link rel="icon" href="${BASE}favicon.ico">`),
  home.match(/<link rel="icon"[^>]*>/)?.[0]
)
// The general form of the rule the checks above sample. `base` is the only place the mount path
// is stated, so an internal URL that leaves it out points at somebody else's page — or at
// nothing at all, which is what `/feed.rss` and `/favicon.ico` did on this Site.
const looseInternalUrls = [...home.matchAll(/(?:href|src)="(\/[^/][^"]*)"/g)]
  .map((match) => match[1])
  .filter((url) => !url.startsWith(BASE))
check(
  'no internal URL in the document leaves out the Site base',
  looseInternalUrls.length === 0,
  looseInternalUrls.join(', ')
)
// The brand label is hidden on the index (the H1 carries the title) and below 768px. That is
// right when a logo is there to be the brand, and wrong when there is not — which is the case
// the consuming Site in verify-package covers. This half guards the other direction: a Site
// that does have a logo must not start repeating its title on the index.
const brandOf = (page) =>
  page.match(/<a class="vp-blog-layout-brand"[\s\S]*?<\/a>/)?.[0] ?? ''
check(
  'the brand link is mounted under the Site base',
  brandOf(home).includes(`href="${BASE}"`),
  brandOf(home).match(/href="[^"]*"/)?.[0]
)
check(
  'the logo is served from under the Site base, with no doubled slash',
  brandOf(home).includes(`src="${BASE}logo.svg"`),
  brandOf(home).match(/src="[^"]*"/)?.[0]
)
check(
  'a Site with a logo shows it alone on the index',
  brandOf(home).includes('vp-blog-layout-logo') &&
    !brandOf(home).includes('vp-blog-layout-brand-label')
)
check(
  'a Site with a logo also shows its name off the index',
  brandOf(newest).includes('vp-blog-layout-logo') &&
    brandOf(newest).includes('vp-blog-layout-brand-label')
)

section('Style Layer')
// The Theme does not extend VitePress's default theme, so it must supply its own
// design tokens and Markdown typography. Both of these were missing at one point,
// with the build still passing green: every `--vp-c-*` reference resolved to
// nothing, and Post bodies rendered unstyled.
const css = readAll(path.join(dist, 'assets'), '.css')

/**
 * The backgrounds the contrast checks measure against, read from the built CSS.
 *
 * These were hard-coded, and that went wrong the moment the Theme adopted the reference
 * site's dark background: the checks kept measuring against VitePress's old `#1b1b1f`, so
 * they would have passed against a colour no longer on the page. Reading them out of the
 * stylesheet is what keeps the two honest.
 */
function effectiveBackground(mode) {
  // No fallback: light declares nothing *itself* and inherits VitePress's `:root`, so this
  // has to find that declaration rather than assume it. A fallback would have made the
  // check pass even if the value it depended on had gone away.
  const declared = cssCustomProperty(mode, '--vp-c-bg')
  // Contrast needs channels. Returning `undefined` for anything else makes a check fail
  // with the value in its message rather than measuring something unrelated.
  if (!declared || !/^#[0-9a-fA-F]{3,8}$/.test(declared)) return undefined
  return normalizeHex(declared)
}

const lightBackground = effectiveBackground(':root')
const darkBackground = effectiveBackground('.dark')
check(
  'the backgrounds the contrast checks measure against are the ones on the page',
  lightBackground === '#ffffff' && darkBackground === '#0f172a',
  `light ${lightBackground}, dark ${darkBackground}`
)
check('ships the colour tokens', /--vp-c-bg:\s*\S/.test(css))
check('ships a dark palette', /\.dark\s*\{[^}]*--vp-c-bg/.test(css))
check('ships Markdown typography', css.includes('.vp-doc'))
check('ships code block styling', css.includes('.vp-code'))
check('resolves the brand colour', /--vp-c-brand-1:/.test(css))
check('styles the Theme’s own classes', css.includes('.vp-blog-layout-shell'))
check('styles the Blog index', css.includes('.vp-blog-content-list'))
// The CSS half of the 404's modifier. The class ships in the bundle either way; this is
// what makes it do something, and without it the page would sit at the top of the shell.
check(
  '404 centres between the nav and the footer',
  css.includes('.vp-blog-layout-shell.is-not-found') &&
    css.includes('.vp-blog-layout-shell.is-not-found .vp-blog-layout-main'),
  'the is-not-found height chain is missing from the built CSS'
)

// The label's escape hatch from its own width-based hiding, for a Site with no logo.
check(
  'the brand label can show at any width when it is the only brand',
  /\.vp-blog-layout-brand-label\.is-solo\s*\{[^}]*display:\s*inline/.test(css)
)

/**
 * The declarations of the first rule whose selector mentions `selector` and that colours its
 * links through one of the Theme's own link variables.
 *
 * VitePress ships its own `.vp-doc a` rule, so a plain "does a rule exist" test would pass on
 * VitePress's styling while the Theme's override was missing.
 */
function themedAnchorRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`([^{}]*${escaped}[^{}]*)\\{([^}]*)\\}`, 'g')
  for (const match of css.matchAll(pattern)) {
    if (/--vp-blog-(content-)?link/.test(match[2])) return match[2]
  }
  return undefined
}

// Every element the Theme injects HTML into has to style its own anchors. `v-html` content
// arrives with no styling of it, so a link inside would fall back to the browser's default
// blue — a colour this Theme uses nowhere else.
//
// The hero's subtext was the one missing from this set. What let it through is that the
// assertions only checked the markup reached the output, never that anything styled it:
// "the rule exists" and "the rule reaches the element" are different claims, and this is the
// third time that distinction has mattered in this file.
for (const [label, selector] of [
  ['a Post body and its excerpt', '.vp-doc a'],
  ['the footer text', '.vp-blog-layout-footer-text a'],
  ['the hero subtext', '.vp-blog-content-index-hero-subtext a']
]) {
  check(
    `anchors in ${label} are themed, not browser blue`,
    Boolean(themedAnchorRule(selector)),
    `no rule for ${selector} setting --vp-blog-link or --vp-blog-content-link`
  )
}

// The TOC's current entry is the Theme's one "you are here" state, and it is stated in the
// same lever for the same reason: a Site that retints its links — or adopts one of
// `presets/` — gets a TOC that follows, without a colour that exists only for this line. The
// test is the one above, so it asserts the rule reads the lever rather than that it happens to
// look right in this playground's palette.
check(
  'the TOC’s current entry follows the Site’s link colour',
  Boolean(themedAnchorRule('.vp-blog-ui-toc-link.is-active')),
  'no rule for .vp-blog-ui-toc-link.is-active setting --vp-blog-link'
)

// The Theme's default background is the reference site's. Light needs no declaration —
// VitePress's `#ffffff` is already what the reference shows — so this asserts the effective
// value rather than a rule, and that nothing crept in to tint it. Dark is a declaration,
// because the reference's `slate-900` differs from VitePress's neutral `#1b1b1f`.
const darkBackgroundAlt = cssCustomProperty('.dark', '--vp-c-bg-alt')
check(
  'the light background stays the reference site’s white',
  /--vp-c-bg:#fff/.test(css) || /--vp-c-bg:#ffffff/.test(css),
  'VitePress’s light background is missing'
)
check(
  'the dark background is the reference site’s navy',
  darkBackground === '#0f172a'
)
// Without this, `--vp-c-bg-alt` stays VitePress's `#161618`, which measures 1.01:1 against
// the navy — a code block with no visible surface. Asserted as a rule here, and as a
// contrast ratio further down, because "the rule exists" and "the rule reaches the code
// block" are different claims.
check(
  'the dark code-block surface is derived from the navy, not left neutral',
  /^color-mix\(in srgb, ?var\(--vp-c-bg\) 50%, ?#000\)$/.test(
    darkBackgroundAlt ?? ''
  ),
  `effective --vp-c-bg-alt is ${darkBackgroundAlt}`
)
check('the sample Site’s cream background is gone', !css.includes('#fdf6e3'))

const themeClassesInMarkup = new Set(
  [home, newest, guest, plainPage]
    .flatMap((document) => [...document.matchAll(/class="([^"]+)"/g)])
    .flatMap((match) => match[1].split(/\s+/))
    .filter((name) => name.startsWith('vp-blog-'))
)
const unstyled = [...themeClassesInMarkup].filter(
  (name) => !css.includes(`.${name}`)
)
check(
  'every Theme class in the markup has a rule',
  unstyled.length === 0,
  unstyled.join(', ')
)

// A custom theme inherits none of VitePress's default theme, so it has to import each
// stylesheet it depends on. Forgetting one does not fail the build: the CSS still
// compiles and the property silently resolves to nothing. That is exactly how the code
// block's copy button lost its icon — `vp-doc.css` *references* `--vp-icon-copy`, but
// `icons.css` is what defines it.
//
// Only the namespaces the Theme is answerable for are checked. `--shiki-*` is set
// inline by Shiki at render time, and the default theme declares a few variables on its
// own layout element that this Theme does not use; both are legitimate rather than
// missing.
const NOT_DECLARED_IN_CSS = new Set(['--vp-layout-top-height'])

const customPropertiesDefined = new Set(
  [...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1])
)
const customPropertiesUsed = new Set(
  [...css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((match) => match[1])
)
// A `var(--x, fallback)` is a deliberate way to expose an *optional* override: the
// theme reads the variable but never sets it, so a Site can pre-declare it without being
// overridden. Those names are answers, not omissions, so they count as defined.
const customPropertiesWithFallback = new Set(
  [...css.matchAll(/var\(\s*(--[a-z0-9-]+)\s*,/g)].map((match) => match[1])
)
const unresolved = [...customPropertiesUsed]
  .filter((name) => name.startsWith('--vp-') || name.startsWith('--vp-blog-'))
  .filter((name) => !customPropertiesDefined.has(name))
  .filter((name) => !customPropertiesWithFallback.has(name))
  .filter((name) => !NOT_DECLARED_IN_CSS.has(name))
  .toSorted()
check(
  'every VitePress custom property it uses is defined',
  unresolved.length === 0,
  unresolved.join(', ')
)
check(
  'the copy button’s icon is defined',
  css.includes('--vp-icon-copy:') &&
    css.includes('background-image:var(--vp-icon-copy)')
)

// The Theme's public CSS interface: eight variables in three groups, and the two
// properties that keep it from growing. This is a public contract, so it is asserted
// rather than left to review.
//
// The interesting half is the *kind* of each variable. `layout` is declared, so overriding
// it is ordinary cascade. The rest are read through a `var()` fallback and never declared,
// which is what lets a Site set them before the stylesheet loads; declaring one by reflex
// would silently break that, and nothing else would notice.
//
// What counts as declared is what `:root` declares. A custom property on a component's own
// class is internal — the narrow TOC bar's height is one, and it exists so the bar and the
// `scroll-margin-top` arithmetic that assumes its height cannot drift apart. Reading the whole
// stylesheet instead would make every such variable look like part of this contract.
const interfaceDeclared = new Set(
  [...css.matchAll(/:root\s*\{([^}]*)\}/g)].flatMap((block) =>
    [...block[1].matchAll(/(--vp-blog-[a-z-]+)\s*:/g)].map((match) => match[1])
  )
)
const interfaceReadWithFallback = new Set(
  [...css.matchAll(/var\(\s*(--vp-blog-[a-z-]+)\s*,/g)].map((match) => match[1])
)

const LAYOUT_VARIABLES = [
  '--vp-blog-layout-measure',
  '--vp-blog-layout-measure-wide',
  '--vp-blog-layout-gutter'
]
const LINK_VARIABLES = [
  '--vp-blog-link',
  '--vp-blog-link-hover',
  '--vp-blog-content-link',
  '--vp-blog-content-link-hover'
]
// Read through a fallback like the link variables, but deliberately defaulting to a literal
// rather than a `--vp-c-*` token: the reference site's Post-body rule (`#e5e7eb`) does not
// follow its chrome divider, and reproducing that is the whole point of the variable.
const CONTENT_DIVIDER_VARIABLE = '--vp-blog-content-divider'

check(
  'declares exactly the layout variables',
  [...interfaceDeclared].toSorted().join(',') ===
    LAYOUT_VARIABLES.toSorted().join(','),
  [...interfaceDeclared].toSorted().join(', ')
)
check(
  'layout carries no colour',
  !LAYOUT_VARIABLES.some((name) => {
    const value = css.match(new RegExp(`${name}:\\s*([^;}]+)`))?.[1] ?? ''
    return /var\(--vp-c-|#[0-9a-fA-F]{3,6}|rgba?\(/.test(value)
  })
)
const readOnlyVariables = [...LINK_VARIABLES, CONTENT_DIVIDER_VARIABLE]
check(
  'the read-only variables are read, never declared',
  readOnlyVariables.every((name) => interfaceReadWithFallback.has(name)) &&
    readOnlyVariables.every((name) => !interfaceDeclared.has(name)),
  readOnlyVariables.filter((name) => interfaceDeclared.has(name)).join(', ') ||
    undefined
)
// Order, not "selector X does not mention variable Y": `--vp-blog-link` is a prefix of
// `--vp-blog-content-link`, so a negative match on substring is easy to get wrong, and an
// earlier version of this check passed for that reason rather than for the right one.
const positionOfProseLink = css.search(/\.vp-blog-prose a[^{]*\{/)
const positionOfUiLink = css.search(/\.vp-blog-link(?![a-z-])[^{]*\{/)
check(
  'a Post body reads the content link variable',
  positionOfProseLink !== -1 &&
    css
      .slice(positionOfProseLink, positionOfProseLink + 220)
      .includes('--vp-blog-content-link')
)
check(
  'UI links read the UI link variable, and the two rules are separate',
  positionOfUiLink !== -1 &&
    css
      .slice(positionOfUiLink, positionOfUiLink + 220)
      .includes('--vp-blog-link,') &&
    positionOfProseLink !== positionOfUiLink
)
// A Post body's `---` must not ride on `--vp-c-divider`: that token is the chrome's, and the
// reference site keeps the two at visibly different weights. Falling back to it would
// silently undo the distinction.
const positionOfProseHr = css.search(/\.vp-blog-prose hr[^{]*\{/)
check(
  'a Post body’s divider reads the content divider variable',
  positionOfProseHr !== -1 &&
    css
      .slice(positionOfProseHr, positionOfProseHr + 220)
      .includes(`${CONTENT_DIVIDER_VARIABLE},`)
)

// The Theme's own default accent is green, and it must stay green *and* stay readable.
//
// The comparison is a resolved one on purpose. The Theme declares
// `--vp-c-brand-1: var(--vp-c-green-1)`, and VitePress defines that green differently per
// mode, so the value the Theme actually ships is only knowable from the two together.
// Reading the green out of the bundle (rather than hard-coding it here) is also what
// keeps this honest if VitePress ever revises its palette.
section('Default accent')

function cssCustomProperty(selector, name) {
  // A property may be declared in several blocks for the same selector — the compiled
  // stylesheet has many `:root` and `.dark` blocks, and VitePress's own tokens arrive
  // before the Theme's — so this returns the **last** declaration, which is the one the
  // cascade actually uses. Returning the first, as this once did, quietly measured
  // contrast against a background the page no longer had.
  const pattern = new RegExp(
    `${selector.replace(/[.:]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\}`,
    'g'
  )
  let found
  for (const block of css.matchAll(pattern)) {
    // Any syntax, not just hex: the Theme's own dark background surface is a `color-mix`,
    // and a hex-only reader would have skipped it and handed back VitePress's declaration
    // instead — silently answering with a value the page no longer uses.
    const value = block[1]
      .match(new RegExp(`${name}:\\s*([^;}]+)`))?.[1]
      ?.trim()
    if (value) found = value
  }
  return found
}

const brandPointsAtGreen = /--vp-c-brand-1:\s*var\(--vp-c-green-1\)/.test(css)
check('the default accent is VitePress’s green', brandPointsAtGreen)

const defaultBrandLight = cssCustomProperty(':root', '--vp-c-green-1')
const defaultBrandDark = cssCustomProperty('.dark', '--vp-c-green-1')
check(
  'green is defined per mode',
  Boolean(defaultBrandLight) && Boolean(defaultBrandDark),
  `light ${defaultBrandLight}, dark ${defaultBrandDark}`
)

// Defined below, next to the preset checks that also need it.
if (defaultBrandLight) {
  const ratio = contrastRatio(defaultBrandLight, lightBackground)
  check(
    'the default light green clears AA on white',
    ratio >= 4.5,
    `${ratio.toFixed(2)}:1`
  )
}
if (defaultBrandDark) {
  const ratio = contrastRatio(defaultBrandDark, darkBackground)
  check(
    'the default dark green clears AA on the dark background',
    ratio >= 4.5,
    `${ratio.toFixed(2)}:1`
  )
}

// The brand presets ship a separate value per mode, and the whole point of that is
// contrast: a hue that reads well on white is usually too dark on near-black. Editing a
// preset by eye is how a dark mode ends up unreadable, so the ratio is computed here
// rather than trusted.
section('Brand presets')

const presetDir = path.join(root, 'packages/theme/presets')
const presetNames = readdirSync(presetDir)
  .filter((name) => name.endsWith('.css'))
  .map((name) => name.replace(/\.css$/, ''))

check('ships brand presets', presetNames.length > 0, presetNames.join(', '))

for (const name of presetNames) {
  const preset = readFileSync(path.join(presetDir, `${name}.css`), 'utf8')

  // Named for the token rather than `read`, which would shadow the file-reading helper
  // above and make this loop unable to read anything else.
  const readBrandToken = (mode, token) => {
    // Take the token from the block for the mode we care about. `:root` and `.dark` are
    // the only two blocks a preset is allowed to use.
    const block = preset.match(
      mode === 'dark' ? /\.dark\s*\{([\s\S]*?)\}/ : /:root\s*\{([\s\S]*?)\}/
    )
    return block?.[1].match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`))?.[1]
  }

  const light = readBrandToken('light', '--vp-c-brand-1')
  const dark = readBrandToken('dark', '--vp-c-brand-1')
  check(`${name}: defines a light brand colour`, Boolean(light), light)
  check(`${name}: defines a dark brand colour`, Boolean(dark), dark)

  // Measured against the backgrounds the Theme actually uses: a preset changes only the
  // brand, so it has to clear AA on whatever the page background turns out to be.
  if (light) {
    const ratio = contrastRatio(light, lightBackground)
    check(
      `${name}: light brand clears AA on white`,
      ratio >= 4.5,
      `${ratio.toFixed(2)}:1`
    )
  }
  if (dark) {
    const ratio = contrastRatio(dark, darkBackground)
    check(
      `${name}: dark brand clears AA on the dark background`,
      ratio >= 4.5,
      `${ratio.toFixed(2)}:1`
    )
  }
}

section('Tabs')

/**
 * Tabs, read off the demo page.
 *
 * This is the one place the whole chain is exercised at once, which is why it matters more than
 * the assertions look: the playground states `markdown: { tabs: true }`, VitePress spreads that
 * object onto the markdown-it instance it builds, and the Theme's hook reads it back off
 * `md.options` — an arrangement VitePress does not document, so a VitePress that stopped
 * spreading it would otherwise switch Tabs off in silence. It cannot do so here: with the hook
 * returning early, a `tabs` container is not a container at all, and this page's `::: tabs`
 * would reach the HTML as text.
 */
const tabsPage = read('docs/demo/tabs.html')
// Vue's server renderer marks fragment boundaries with comments, which would otherwise sit
// inside the text of a title and make every comparison below a comparison against markup.
const tabsMarkup = tabsPage.replace(/<!--[\s\S]*?-->/g, '')

const tabGroups = (tabsMarkup.match(/class="vp-blog-tabs"/g) ?? []).length
// Every `button` on the page, narrowed to the row's own: a code block's copy button is a
// `button` too, and it would otherwise be counted as a Tab.
const tabButtons = [
  ...tabsMarkup.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)
]
  .filter(([, attributes]) => /vp-blog-tabs-tab/.test(attributes))
  .map(([, attributes, title]) => ({
    chosen: /\bis-active\b/.test(attributes),
    title: title.trim()
  }))
const chosenTabs = tabButtons.filter((button) => button.chosen)
const tabPanes = (tabsMarkup.match(/role="tabpanel"/g) ?? []).length

check(
  'the demo page renders Tab Groups',
  tabGroups > 0,
  'no vp-blog-tabs in the built page — the markdown hook never ran'
)
check(
  'every Tab Group has exactly one chosen Tab',
  tabGroups > 0 && chosenTabs.length === tabGroups,
  `${tabGroups} group(s), ${chosenTabs.length} chosen`
)
// `@tab:active` is the Post's word for which Tab a group opens on, and the first group's own
// default is the fallback. Both are asserted, because "the marker was ignored" and "the default
// was wrong" are the same page from the outside.
check(
  'an @tab:active marker decides the Tab its group opens on',
  tabButtons.some((button) => button.chosen && button.title === 'Go') &&
    tabButtons.some((button) => !button.chosen && button.title === 'Rust'),
  'the group that marks Go did not open on Go'
)
check(
  'a Tab title is rendered as inline Markdown',
  tabButtons.some((button) => button.title === '<code>pnpm</code>'),
  tabButtons.map((button) => button.title).join(' | ')
)
// A pane that is not the chosen one still has to be in the HTML: the panes are hidden by CSS, so
// a printed page — or one whose stylesheet never arrived — shows all of them, and the reader of
// a linked group has somewhere to switch to. One pane per Tab is what says so, and it is counted
// rather than sampled for a sentence, which a group that rendered only its first pane would
// still contain.
check(
  'every Tab has a pane, not only the chosen one',
  tabButtons.length > 0 && tabPanes === tabButtons.length,
  `${tabButtons.length} tab(s), ${tabPanes} pane(s)`
)
check(
  'a pane is a template, so Vue runs inside it',
  tabGroups > 0 && tabsMarkup.includes('Two plus two is 4.'),
  'the Vue expression in a pane was left as written'
)
check(
  'a Tab’s value and chosen state reach its content',
  tabsMarkup.includes(
    'This pane reads <code>value</code> as <code>shown</code>'
  ) && tabsMarkup.includes('<code>isActive</code> as <code>true</code>'),
  'the value/isActive slot props did not arrive'
)
check(
  'the row is a tablist and the panes are tabpanels',
  tabsMarkup.includes('role="tablist"') &&
    tabsMarkup.includes('role="tabpanel"') &&
    /role="tablist"[^>]*aria-label="[^"]+"/.test(tabsMarkup),
  'the row or its panes lost their roles'
)

// Code Groups are VitePress's container, so what is asserted here is the Theme's whole part in
// them: VitePress still parses the container, group-icons' `data-title` still reaches the
// labels, exactly one panel is chosen while the rest ship hidden, and the stylesheet both
// catches them from VitePress and dresses them in the Tab Group's shape.
const codeGroups = (tabsMarkup.match(/class="vp-code-group"/g) ?? []).length
const codeGroupTitles = [
  ...tabsMarkup.matchAll(/<label data-title="([^"]+)"/g)
].map((match) => match[1])
const codeGroupPanels = [
  ...tabsMarkup.matchAll(/<div class="(language-sh[^"]*)"/g)
]
const chosenCodePanels = codeGroupPanels.filter(([, classes]) =>
  /\bactive\b/.test(classes)
)
check(
  'the demo page renders Code Groups',
  codeGroups > 0,
  'no vp-code-group in the built page — VitePress did not parse the container'
)
check(
  'a Code Group label carries the fence title, which is where its icon comes from',
  ['npm', 'yarn', 'pnpm'].every((title) => codeGroupTitles.includes(title)),
  codeGroupTitles.join(' | ')
)
check(
  'a Code Group renders every panel and marks exactly one chosen',
  codeGroupPanels.length === 3 && chosenCodePanels.length === 1,
  `${codeGroupPanels.length} panel(s), ${chosenCodePanels.length} chosen`
)
// The rule VitePress hides panels with lives in a stylesheet only the default theme imports, so
// this is the check that says the Theme imported it: without it every panel shows at once.
check(
  'the stylesheet hides every Code Group panel but the chosen one',
  /\.vp-code-group div\[class\*=language-\][^{}]*\{[^}]*display:none/.test(
    css
  ) &&
    /\.vp-code-group div\[class\*=language-\]\.active[^{}]*\{[^}]*display:block/.test(
      css
    ),
  'the hide/show rules for Code Groups are missing from the built CSS'
)
// And this is the Theme's own half: the box, row and chosen title restated to match
// `.vp-blog-tabs`, which is the whole reason the feature looks native here.
check(
  'the Theme dresses Code Groups as it dresses Tab Groups',
  /\.vp-code-group\{[^}]*border:1px solid var\(--vp-c-divider\)[^}]*border-radius:8px/.test(
    css
  ) &&
    /\.vp-code-group \.tabs\{[^}]*background-color:var\(--vp-c-bg-soft\)/.test(
      css
    ) &&
    /\.vp-code-group \.tabs input:checked\+label\{[^}]*color:var\(--vp-c-brand-1\)/.test(
      css
    ),
  'the Code Group alignment rules are missing from the built CSS'
)

// The Tab classes are checked against the built stylesheet as the other Theme classes are: the
// class-coverage pass above only reads the four pages it names, and this page is not one of them.
const tabClasses = new Set(
  [...tabsMarkup.matchAll(/class="([^"]+)"/g)]
    .flatMap((match) => match[1].split(/\s+/))
    .filter((name) => name.startsWith('vp-blog-tabs'))
)
const unstyledTabClasses = [...tabClasses].filter(
  (name) => !css.includes(`.${name}`)
)
// Written to fail on an empty set as well: a page with no Tabs has no classes to check, and a
// check that passes because it has nothing to look at is the failure this whole section exists
// to catch.
check(
  'every Tabs class in the markup has a rule',
  tabClasses.size > 0 && unstyledTabClasses.length === 0,
  unstyledTabClasses.length > 0
    ? unstyledTabClasses.join(', ')
    : 'no Tabs classes found in the markup'
)

console.log(`\n${checks - failures}/${checks} checks passed`)
if (failures) process.exit(1)
