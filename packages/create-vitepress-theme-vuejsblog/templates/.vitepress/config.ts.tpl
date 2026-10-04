import path from 'node:path'
import { defineConfig } from 'vitepress'
import blogConfig from '%s/config'
import { genFeed } from '%s/feed'
import type { ThemeConfig } from '%s'

/**
 * This Site. It extends the Theme's base config and then describes the Blog.
 *
 * Everything the Theme is told about the Site and its Blog lives under
 * `themeConfig.blog`. The exception is Tabs, which is stated in VitePress's own
 * `markdown` options because it changes how a Post is read rather than what the
 * Site says about itself.
 *
 * `blogConfig(root)` supplies what is not a choice — the SSR bundling that lets
 * the Theme ship `.vue` components, the code-block theme, the favicon hook, and
 * the files whose frontmatter says `exclude: true`. The Site root is passed in
 * because the Theme reads the Markdown while this config loads, and cannot
 * discover where this file lives on its own.
 */
export default defineConfig<ThemeConfig>({
  extends: blogConfig(path.resolve(import.meta.dirname, '..')),
  srcDir: '.',
  title: %s,
%s  lang: %s,
  // GitHub Pages serves the site from https://<user>.github.io/<repo>/, so a
  // blog deployed there has to name its repository. Uncomment and fill it in:
  // base: '/<repo>/',
  // Tabs — a `tabs` container of `@tab` panes — are off until a Site asks for
  // them, and this is where a Site asks.
  markdown: { tabs: true },
  buildEnd: (config) => genFeed(config),
  themeConfig: {
    blog: {
      title: %s,
%s      logo: '/logo.svg',
      favicon: '/logo.svg',
      nav: %s,
      footer: %s,
      feed: { language: %s }
    }
  }
})
