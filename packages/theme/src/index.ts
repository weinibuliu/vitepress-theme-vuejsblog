import type { Theme } from 'vitepress'

import './vitepress.css'
import './style.css'
import 'virtual:group-icons.css'

import Layout from './layouts/Layout.vue'
import BlogTabs from './components/BlogTabs.vue'
import { TABS_COMPONENT } from './lib/tabsName.js'

/**
 * Components which the site can place itself. The index hero is not among them: it belongs to the
 * index, driven by `themeConfig.blog.hero`.
 *
 * They are not public components intended for use by users, even though they can be successfully imported.
 */
export { default as BlogDate } from './components/BlogDate.vue'
export { default as BlogAuthor } from './components/BlogAuthor.vue'
export { default as BlogSocialLinks } from './components/BlogSocialLinks.vue'
export { default as BlogPin } from './components/BlogPin.vue'

export type {
  Author,
  Authors,
  BlogThemeConfig,
  CustomSocial,
  FeedOptions,
  FooterConfig,
  FooterItem,
  HeroConfig,
  NavItem,
  Post,
  PostNeighbour,
  PriorityConflict,
  ResolvedAuthor,
  ResolvedBlogConfig,
  ResolvedSocial,
  ResolvedSocialIcon,
  ResolvedSort,
  ResolvePostsResult,
  SkippedPost,
  SocialPlatform,
  SocialValue,
  SortDirection,
  SortMode,
  SortOptions,
  SortSetting,
  ThemeConfig
} from './lib/types.js'

export { resolvePosts } from './lib/resolvePosts.js'
export type { ResolvePostsOptions } from './lib/resolvePosts.js'
export { anchorExcerptLinks } from './lib/excerpt.js'
export type { LangStrings } from './lib/i18n.js'
export {
  resolveAuthor,
  resolveAuthors,
  matchAuthorScope,
  socialAriaLabel,
  socialCaption
} from './lib/author.js'
export {
  formatDate,
  parseDate,
  toISODate,
  DEFAULT_DATE_FORMAT
} from './lib/date.js'
export { withDefaults, readThemeConfig } from './lib/config.js'
export { useBlogConfig } from './lib/useBlogConfig.js'
export { heroSubtextHtml, resolveHeroAvatar } from './lib/hero.js'
export { absoluteUrl } from './lib/url.js'
export { faviconHead } from './lib/favicon.js'

/**
 * The Theme.
 *
 * A Site consumes it by re-exporting it from its own
 * `.vitepress/theme/index.ts`, and configures it under `themeConfig.blog`.
 *
 * `BlogTabs` is registered globally rather than offered as an import, because the Markdown
 * writes it: `lib/tabs.ts` emits the tag while rendering a `tabs` container, so there is no
 * import statement anywhere for it to resolve through. Its name comes from `lib/tabsName.ts`,
 * which both ends of that contract read.
 */
const theme: Theme = {
  Layout,

  enhanceApp({ app }) {
    app.component(TABS_COMPONENT, BlogTabs)
  }
}

export default theme
