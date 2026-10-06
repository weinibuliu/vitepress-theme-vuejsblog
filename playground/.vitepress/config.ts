import path from 'node:path'
import { defineConfig } from 'vitepress'
import blogConfig from 'vitepress-theme-vuejsblog/config'
import { genFeed } from 'vitepress-theme-vuejsblog/feed'
import type { ThemeConfig } from 'vitepress-theme-vuejsblog'

/**
 * The playground is a real consuming Site. It is the Theme's end-to-end
 * verification: its `posts/` is the same content the reference site publishes, so
 * if the playground builds, the Theme works on real writing rather than on
 * fixtures written to flatter it.
 */
export default defineConfig<ThemeConfig>({
  extends: blogConfig(path.resolve(import.meta.dirname, '..')),
  title: 'Vitepress Theme Vuejs Blog',
  description: 'The website of vitepress-theme-vuejsblog',
  lang: 'zh-CN',
  base: '/vitepress-theme-vuejsblog/',
  ignoreDeadLinks: true,
  buildEnd: (config) => genFeed(config),
  // Tabs are off unless a Site asks for them. This Site asks, so that the demo page exercises
  // the whole path — the option, the markdown hook that reads it, and the rendered component.
  markdown: { tabs: true },
  themeConfig: {
    blog: {
      toc: false,
      posts: ['posts/*.md', 'docs/**/*.md'],
      excerptSeparator: '---',
      hero: {
        title: 'Vitepress Theme Vuejs Blog',
        avatar: false,
        subtext:
          "This is not the official <a href='https://vuejs.org'>Vue.js</a> website. We just cite <a href='https://blog.vuejs.org'>blogs</a> to verify rendering."
      },
      // The nav links to `/feed.rss`, so the Feed has to exist; `origin` is what makes its
      // links absolute, which RSS requires. It is the origin alone: this Site is mounted
      // under `base` above, and repeating that path here would publish a Feed of dead links.
      origin: 'https://weinibuliu.github.io',
      author: {
        name: 'weinibuliu',
        gravatar:
          '2b9643e3e2b5062b1bf581ed52213805389cbd628f87967816dd6a8d3c0bf951',
        github: 'https://github.com/weinibuliu'
      },
      authorScopes: {
        'docs/': {
          name: 'weinibuliu',
          gravatar:
            '2b9643e3e2b5062b1bf581ed52213805389cbd628f87967816dd6a8d3c0bf951',
          github: 'https://github.com/weinibuliu'
        },
        'docs/en-us': {
          name: 'WEINIBULIU',
          gravatar:
            '2b9643e3e2b5062b1bf581ed52213805389cbd628f87967816dd6a8d3c0bf951',
          github: 'https://github.com/weinibuliu',
          x: 'https://x.com/example',
          facebook: 'https://facebook.com/example',
          instagram: 'https://instagram.com/example'
        }
      },
      logo: '/logo.svg',
      nav: [
        {
          text: 'Github',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>`,
          link: 'https://github.com/weinibuliu/vitepress-theme-vuejsblog'
        },
        // `external: true` is not about leaving the Site here: VitePress's client router takes a
        // same-origin link for a page route unless its anchor carries `target`, and `.rss` is not
        // one of the extensions it knows are files — so an internal Feed link renders the 404 page
        // instead of fetching the Feed. Opening it in a new tab is what a reader wants anyway.
        { text: 'RSS Feed', link: '/feed.rss', external: true }
      ],
      feed: { language: 'en-US' },
      locale: 'en-US'
    }
  }
})
