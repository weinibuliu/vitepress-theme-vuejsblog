import { defineConfig } from 'vitepress'

import {
  groupIconMdPlugin,
  groupIconVitePlugin
} from 'vitepress-plugin-group-icons'

import { readThemeConfig } from './dist/lib/config.js'
import { faviconHead } from './dist/lib/favicon.js'
import { scanExcluded } from './dist/lib/scanExcluded.js'
import { tabsMarkdown } from './dist/lib/tabs.js'
/**
 * The Theme's base VitePress config, given the Site root.
 *
 * A Site extends it from its own config:
 *
 * ```ts
 * import path from 'node:path'
 * import { defineConfig } from 'vitepress'
 * import blogConfig from 'vitepress-theme-vuejsblog/config'
 * import type { ThemeConfig } from 'vitepress-theme-vuejsblog'
 *
 * export default defineConfig<ThemeConfig>({
 *   extends: blogConfig(path.resolve(import.meta.dirname, '..')),
 *   themeConfig: { blog: { title: 'My Blog', author: 'Me' } }
 * })
 * ```
 *
 * This file must stay plain JavaScript. A Site's config is loaded by Node's own
 * ESM loader, so a `.ts` file reached through `node_modules` fails with
 * `ERR_UNKNOWN_FILE_EXTENSION` — see
 * `docs/adr/0002-content-discovery-in-the-theme-package.md`.
 *
 * It sets no `titleTemplate` and no `themeConfig` defaults: a Site's `title` becomes the
 * HTML title suffix (`Post | Site`), and the Blog's own name reaches the document through the
 * Theme's components. The one head entry it adds is the favicon, through `blogHead` below —
 * the tab icon is the one piece of the document the Theme's components cannot reach.
 *
 * ## Why `root` is a parameter
 *
 * The Theme has to read the Site's Markdown while this config is being loaded, in order to
 * turn `exclude: true` into `srcExclude` before VitePress resolves its pages. It cannot
 * discover the root itself: VitePress knows it but never hands it to a config, an `extends`
 * config function is called with no arguments at all, and the injected `import.meta.dirname`
 * only describes the Site's own config file — a bare import from `node_modules` keeps its
 * own path. The Site is the only party that can say where it lives.
 */
export default function blogConfig(root) {
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error(
      '[blog] blogConfig(root) needs the Site root, so that it can find the Markdown ' +
        'files whose frontmatter excludes them. Pass it from the Site config:\n' +
        '  import path from "node:path"\n' +
        "  extends: blogConfig(path.resolve(import.meta.dirname, '..'))"
    )
  }

  return defineConfig({
    srcExclude: scanExcluded(root),
    transformHead: blogHead,
    cleanUrls: true,
    markdown: {
      // Matches the reference site, where a code block always advertises its
      // language in the corner.
      theme: { light: 'github-light', dark: 'github-dark' },

      /**
       * Collect every page's headings into `pageData.headers`, which is what a Post's
       * TOC lists.
       *
       * VitePress leaves this off by default, and its own default theme therefore reads
       * the headings back out of the rendered DOM at runtime — it is a theme, and a theme
       * cannot turn a Site's markdown option on. The Theme can: a Site reaches this file
       * through `extends: blogConfig(root)`, and VitePress deep-merges an extended config,
       * so `markdown.headers` arrives here and survives whatever `markdown` a Site states
       * of its own. Taking the headings from the build is what puts the TOC in the
       * server-rendered HTML rather than appending it after hydration, and it hands the
       * components the tree `@mdit-vue/plugin-headers` already built instead of a list of
       * DOM nodes to serialize. A Site that states `markdown: { headers: false }` gets no
       * TOC — see `docs/adr/0009-headings-come-from-the-build.md`.
       *
       * All of h2–h6 are collected, though the TOC shows h2 and h3. Which levels are shown
       * is a display decision, and the plugin can only be asked once per Site, so asking it
       * for a range would make the range unchangeable per Post.
       *
       * `shouldAllowNested` is what makes the TOC a map of the headings a reader can see.
       * The plugin leaves it off, and then skips any heading whose Markdown sits inside
       * another block — a heading in a `:::tip`, or in a blockquote. VitePress's own
       * `[[toc]]` container is collected the same way and so skips them too, but that is a
       * different feature: a list inside the body, built from the same walk. The TOC stands
       * in for the default theme's outline, which reads the rendered page and therefore
       * lists them, so leaving them out would be the Theme quietly showing less than the
       * thing it reproduces.
       */
      headers: { shouldAllowNested: true },

      /**
       * Tabs, when the Site asks for them.
       *
       * The hook is where VitePress states its own Markdown features, so a Site's
       * `markdown: { tabs: true }` is read by it rather than by a Theme Config field — Theme
       * Config is site data, and this hook runs while the Site's config is still being
       * resolved. It does nothing until the Site states the option, so a Blog that never writes
       * a `tabs` container pays for one truthiness test. See
       * `docs/adr/0012-tabs-are-switched-on-in-markdown-options.md`.
       *
       * VitePress composes a Site's own `markdown.config` after this one rather than replacing
       * it, so a Site that needs a markdown-it plugin of its own keeps both — this Theme's first,
       * which is also why a Site's own `tabs` container rule would lose to this one.
       */
      config(md) {
        md.use(tabsMarkdown)
        md.use(groupIconMdPlugin)
      },

      /*
       * Mark `md-external` for all external links
       */
      externalLinks: {
        target: '_blank',
        rel: 'noreferrer noopener md-external' // TODO: css for md-external
      }
    },
    lastUpdated: false,
    vite: {
      plugins: [groupIconVitePlugin()],
      ssr: {
        /**
         * Bundle the Theme into the SSR build rather than letting Node import it.
         *
         * VitePress externalises dependencies, which is normally right — but the Theme
         * ships `.vue` components, and externalising them means Node's own ESM loader
         * tries to load a `.vue` file and dies with `ERR_UNKNOWN_FILE_EXTENSION` during
         * "rendering pages". The client build succeeds, so this only shows up at the
         * very end of a production build.
         *
         * This is easy to miss while developing, because a linked workspace package or
         * an `npm install ../theme` (which npm turns into a symlink) is followed by Vite
         * as source and never externalised. It only breaks once the Theme is installed
         * from a registry — see
         * `docs/adr/0003-bundle-the-theme-into-the-ssr-build.md`.
         */
        noExternal: ['vitepress-theme-vuejsblog']
      }
    }
  })
}

/**
 * The Theme's `<link rel="icon">`, as a `transformHead` hook.
 *
 * VitePress declares no favicon, so without this the tab icon works only because browsers
 * probe `/favicon.ico` on their own — and a Site that named its icon anything else, or put it
 * on a CDN, had no way to say so. `head` cannot help: its attributes are typed as strings, so
 * the value has to be known when the config is written, and this hook is the only one that
 * runs with the resolved Theme Config in hand.
 *
 * Exported so a Site that needs a `transformHead` of its own can still get this entry.
 * VitePress **replaces** rather than composes hooks (it only concatenates arrays), so a Site
 * that defines its own silently loses this one unless it calls it:
 *
 * ```ts
 * import blogConfig, { blogHead } from 'vitepress-theme-vuejsblog/config'
 *
 * export default defineConfig({
 *   extends: blogConfig(root),
 *   transformHead: (ctx) => [...blogHead(ctx), ['meta', { property: 'og:type', content: 'website' }]]
 * })
 * ```
 */
export function blogHead(ctx) {
  const { favicon } = readThemeConfig(ctx.siteConfig)
  // The decision itself lives in `src/lib/favicon.ts`, which a unit test can reach without a
  // build. `pnpm check` runs the tests before the build, so anything tested through this file
  // would be reading a stale `dist`.
  // The base comes from VitePress rather than from Theme Config: where the Site is mounted is
  // VitePress's to say, and the icon is one of the resources that follows from it.
  return faviconHead(ctx.siteConfig.head, favicon, ctx.siteConfig.site.base)
}
