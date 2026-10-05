/**
 * Every user-visible string in the Theme, in one place.
 *
 * Nothing else in the Theme should contain prose. Adding a locale is a matter of adding a
 * table here — no component changes.
 */
export interface LangStrings {
  nextArticle: string
  previousArticle: string
  backToBlog: string
  readMore: string
  updated: string
  notFound: string
  /**
   * The 404's second line: the heading names the page, this says what happened. The Theme
   * cannot know why a URL failed, so this is deliberately about the reader's situation
   * rather than about a cause.
   */
  notFoundText: string
  /**
   * The label in front of the location that failed to resolve, on the 404. The location
   * itself is not a string — it is whatever the reader asked for, taken from the route.
   */
  notFoundRoute: string
  authors: string
  name: string
  /**
   * The platform names, used as a Social Link's accessible name when the Site gave no
   * label of its own. Keyed by platform so a component can index this table directly.
   *
   * The four brand names are the same in every language — they are proper nouns, and
   * translating them would be wrong. They are here anyway, because this table is the one
   * place the Theme keeps anything its reader can see.
   */
  x: string
  github: string
  facebook: string
  instagram: string
  mail: string
  published: string
  /**
   * The label over a Post's TOC — the list of its own headings. Also what a reader below
   * 1280px sees on the control that reveals the list, so it has to read as a label in both
   * places rather than as an instruction to open something.
   */
  tocTitle: string
  /**
   * A pinned Post's accessible name — the badge beside its title. A screen reader hears
   * this where a sighted reader sees the pin.
   */
  pinned: string
  /**
   * The accessible name of a Tab Group's row of titles. A Post states no label of its own, so
   * this is the Theme's generic word for what the row is, not a description of the choice it
   * offers — the titles themselves are what carry that.
   */
  tabsLabel: string
  empty: string
}

const en: LangStrings = {
  nextArticle: 'Next Article',
  previousArticle: 'Previous Article',
  backToBlog: 'Back to the blog',
  readMore: 'Read more',
  updated: 'Updated',
  notFound: 'Page Not Found',
  notFoundText:
    'The page you asked for does not exist. It may have been moved or removed.',
  notFoundRoute: 'Requested path',
  authors: 'Authors',
  name: 'Name',
  x: 'X',
  github: 'GitHub',
  facebook: 'Facebook',
  instagram: 'Instagram',
  mail: 'Email',
  published: 'Published on',
  tocTitle: 'On this page',
  pinned: 'Pinned',
  tabsLabel: 'Tabs',
  empty: 'No posts yet. Add Markdown files under your Collection Scope.'
}

const zhCN: LangStrings = {
  nextArticle: '下一篇',
  previousArticle: '上一篇',
  backToBlog: '返回博客',
  readMore: '阅读全文',
  updated: '更新于',
  notFound: '页面不存在',
  notFoundText: '访问的页面不存在，它可能已被移动或删除。',
  notFoundRoute: '请求的路径',
  authors: '作者',
  name: '姓名',
  x: 'X',
  github: 'GitHub',
  facebook: 'Facebook',
  instagram: 'Instagram',
  mail: '邮箱',
  published: '发布于',
  tocTitle: '本页目录',
  pinned: '置顶',
  tabsLabel: '选项卡',
  empty: '暂无文章。请在你的 Collection Scope 下添加 Markdown 文件。'
}

const tables: Record<string, LangStrings> = {
  en,
  zh: zhCN
}

/**
 * The string table for a language tag, falling back to English.
 *
 * Matching is on the primary subtag, so `zh`, `zh-CN` and `zh-Hans` all resolve to the
 * same table, and an unknown tag resolves to English rather than to nothing.
 */
export function useLang(lang = 'en'): LangStrings {
  const normalized = lang.toLowerCase()
  const base = normalized.split('-')[0]
  return tables[base] ?? tables[normalized] ?? en
}

/**
 * The language tags the Theme has a table for.
 */
export function availableLangs(): string[] {
  return Object.keys(tables)
}
