import path from 'node:path'
import { defineConfig } from 'vitepress'
import blogConfig from '<%= themePackage %>/config'
import { genFeed } from '<%= themePackage %>/feed'
import type { ThemeConfig } from '<%= themePackage %>'

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
  title: <%= quote(title) %>,
<% if (description) { %>  description: <%= quote(description) %>,
<% } %>  lang: <%= quote(lang) %>,
  // GitHub Pages serves the site from https://<user>.github.io/<repo>/, so a
  // blog deployed there has to name its repository. Uncomment and fill it in:
  // base: '/<repo>/',
  // Tabs — a `tabs` container of `@tab` panes — are off until a Site asks for
  // them, and this is where a Site asks.
  markdown: { tabs: true },
  buildEnd: (config) => genFeed(config),
  themeConfig: {
    blog: {
      title: <%= quote(title) %>,
<% if (description) { %>      description: <%= quote(description) %>,
<% } %><% if (origin) { %>      origin: <%= quote(origin) %>,
<% } else { %>      // TODO: this Site's origin, e.g. https://example.com. No Feed is written
      // without it — every link in a Feed has to be absolute, and guessing the
      // origin would publish wrong ones.
      // origin: 'https://example.com',
<% } %><% if (author) { %>      author: { name: <%= quote(author) %> },
<% } else { %>      // TODO: the Author a Post gets when it credits no one itself.
      // author: { name: 'Your Name' },
<% } %>      logo: '/logo.svg',
      favicon: '/logo.svg',
      nav: <%= literal(nav, 6) %>,
      footer: <%= literal(footer, 6) %>,
      feed: { language: <%= quote(lang) %> }
    }
  }
})
