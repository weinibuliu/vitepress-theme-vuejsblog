import type {
  Author,
  BlogThemeConfig,
  ExternalArrowOptions,
  ResolvedBlogConfig,
  ResolvedExternalArrow,
  ResolvedSort,
  SortSetting
} from './types.js'

/**
 * Reading Theme Config on the Node side — a Site's VitePress config, a `buildEnd`
 * hook, or a data loader.
 *
 * This module must not import Vue or any VitePress client API: it is reached from
 * `config.js` and `dist/feed.js`, both of which Node loads directly. The
 * client-side helper lives in `useBlogConfig.ts`.
 */

/**
 * The Theme Config a Site gets when it configures only the required keys.
 *
 * `author` is required by the public type, but a Site may still reach us through a
 * config that predates the Theme, so the runtime fallback is a name-only author.
 */
const FALLBACK_AUTHOR: Author = 'Anonymous'

const DEFAULT_POSTS = 'posts/*.md'

/**
 * The Blog is ordered by date unless a Site says otherwise. Ordering the whole Blog by
 * `order` is the deliberate choice, because it is the one that makes `order` required, so
 * it is never what a Site gets without asking.
 */
const DEFAULT_SORT: ResolvedSort = { mode: 'date', direction: 'desc' }

/**
 * The marker that ends a Post's excerpt.
 *
 * `<!-- more -->` rather than the `---` of the reference site, because `---` is also a
 * horizontal rule and a table's header row: a Post could end its excerpt without meaning to.
 * A Site whose Posts are written the old way can say `excerptSeparator: '---'` and keep them.
 */
const DEFAULT_EXCERPT_SEPARATOR = '<!-- more -->'

/**
 * A Post shows its TOC unless the Site says otherwise.
 *
 * On rather than off, because the thing it lists is the Post's own structure: a Post long
 * enough to have headings is one a reader may want to jump around in, and a short Post has
 * too few headings to render a TOC at all. A Site that does not want one says so once, and
 * a single Post can decline on its own — where the choice is really made, because whether a
 * TOC helps depends on the Post rather than on the Blog.
 */
const DEFAULT_TOC = true

/**
 * The External Arrow is drawn in every region unless a Site says otherwise.
 *
 * On rather than off, because the arrow is the one cue that a link leaves the Blog, and a
 * Site that wants none says so once. The regions are independent: switching one off says
 * nothing about the other two.
 */
const DEFAULT_EXTERNAL_ARROW: ResolvedExternalArrow = {
  nav: true,
  footer: true,
  content: true
}

/**
 * Defaults are applied in one place rather than at every use site.
 *
 * `siteLang` is VitePress's own site-level `lang` — the one that sets `<html lang>`.
 * Since a Site has to set that anyway for the document to be correct, the Theme reads it
 * rather than asking for the same information twice.
 */
export function withDefaults(
  blog: Partial<BlogThemeConfig> | undefined,
  siteLang?: string
): ResolvedBlogConfig {
  return {
    siteTitle: blog?.siteTitle,
    siteSubtext: blog?.siteSubtext,
    baseUrl: blog?.baseUrl,
    author: blog?.author ?? FALLBACK_AUTHOR,
    authorScopes: blog?.authorScopes,
    posts: blog?.posts ?? DEFAULT_POSTS,
    logo: blog?.logo,
    favicon: blog?.favicon ?? '/favicon.ico',
    hero: blog?.hero,
    nav: blog?.nav ?? [],
    navSeparator: blog?.navSeparator ?? '·',
    footer: {
      text: blog?.footer?.text,
      items: blog?.footer?.items ?? []
    },
    locale: blog?.locale ?? siteLang,
    dateFormat: blog?.dateFormat,
    sort: readSort(blog?.sort),
    toc: blog?.toc ?? DEFAULT_TOC,
    excerptSeparator: readExcerptSeparator(blog?.excerptSeparator),
    feed: blog?.feed,
    externalArrow: readExternalArrow(blog?.externalArrow)
  }
}

/**
 * The External Arrow switches, read from either spelling.
 *
 * `false` is the whole answer written short — no arrow anywhere — and `true` is the default
 * restated; the object is how a Site turns one region off without touching the others. A
 * region the object does not name is on, the same tolerance `sort` reads a partial setting
 * with, and the value is copied rather than handed out, so one caller cannot change the
 * default for the next.
 */
function readExternalArrow(
  setting: boolean | ExternalArrowOptions | undefined
): ResolvedExternalArrow {
  if (setting === false) {
    return { nav: false, footer: false, content: false }
  }
  if (setting === true || setting === undefined) {
    return { ...DEFAULT_EXTERNAL_ARROW }
  }
  return {
    nav: setting.nav ?? DEFAULT_EXTERNAL_ARROW.nav,
    footer: setting.footer ?? DEFAULT_EXTERNAL_ARROW.footer,
    content: setting.content ?? DEFAULT_EXTERNAL_ARROW.content
  }
}

/**
 * The Blog's order, from either spelling of `sort`.
 *
 * The mode alone is what almost every Site writes, and it means the Blog's own direction:
 * newest first under `date`. The written-out form exists for the one Site that wants its
 * listing the other way round, and the direction is read from it rather than derived.
 *
 * A Site's config is plain data, so a value the type forbids can still arrive — an unknown mode,
 * a direction that is not one. Both are read with the tolerance `date` and `pin` get: anything
 * unrecognised states nothing, and the default stands.
 */
function readSort(setting: SortSetting | undefined): ResolvedSort {
  const shorthand = typeof setting === 'string'
  const mode = shorthand ? setting : setting?.mode
  const direction = shorthand ? undefined : setting?.direction
  return {
    mode: mode === 'global' ? 'global' : DEFAULT_SORT.mode,
    direction: direction === 'asc' ? 'asc' : DEFAULT_SORT.direction
  }
}

/**
 * The excerpt marker, `false` to switch the excerpt off, or the default.
 *
 * `false` is carried through rather than defaulted away: switching the excerpt off is a
 * decision, and VitePress reads it as the decision to extract none, which is a different
 * thing from naming a marker no Post carries.
 *
 * Any other value that states nothing — absent, or whitespace — is read as absent, the same
 * tolerance `date` and `pin` are read with. Passing an empty string through would be worse
 * than useless: gray-matter reads it as no separator given at all and falls back to `---`,
 * quietly restoring the behaviour this default exists to leave behind.
 *
 * A real marker is not trimmed, because its own whitespace can be the point: the
 * `'\n---\n'` that pins a marker to a line is one this returns unchanged.
 */
function readExcerptSeparator(
  value: string | false | undefined
): string | false {
  if (value === false) return false
  return typeof value === 'string' && value.trim()
    ? value
    : DEFAULT_EXCERPT_SEPARATOR
}

interface SiteShape {
  lang?: string
  themeConfig?: { blog?: Partial<BlogThemeConfig> }
}

/**
 * Read the Site's Theme Config.
 *
 * VitePress 2 exposes the resolved site data on `globalThis.VITEPRESS_CONFIG`, and
 * `themeConfig` lives under `site` — the top-level `themeConfig` that VitePress 1
 * carried is gone, which is why the Theme targets 2.x only.
 *
 * Pass `config` when you already have a `SiteConfig` — a `buildEnd` hook, say — so
 * that the answer comes from the argument rather than from a global.
 */
export function readThemeConfig(config?: {
  site?: SiteShape
}): ResolvedBlogConfig {
  const resolved =
    config ??
    ((globalThis as Record<string, unknown>).VITEPRESS_CONFIG as
      | { site?: SiteShape }
      | undefined)
  return withDefaults(resolved?.site?.themeConfig?.blog, resolved?.site?.lang)
}
