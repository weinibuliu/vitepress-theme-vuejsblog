# <%= title %>

<%= description || readmeDescription %>

## Getting started

```bash
<%= installCommand %>
<%= devCommand %>
```

`<%= buildCommand %>` writes the production site to `.vitepress/dist`.

## Layout

```
.vitepress/
  config.ts      the Blog: its title, author, nav, footer and Feed
  theme/
    index.ts     hands the Theme to VitePress
    theme.css    your own styles and brand colours
index.md         the Blog index (layout: home)
about.md         a Page (layout: page), not a Post
posts/           Collection Scope: every file here is a Post
public/          served as-is; logo.svg is the nav mark and the favicon
```

## Writing posts

A Post is a Markdown file in `posts/` with a `title` and a `date`:

```md
---
title: A post
date: <%= date %>
description: Shown on the index and used as the Feed summary.
---

The body. It starts at `##` — the `title` becomes the page heading.
```

| Field         | Required | Meaning                                                      |
| ------------- | -------- | ------------------------------------------------------------ |
| `title`       | yes      | Post title                                                   |
| `date`        | yes      | `2024-09-01`. A Post with no date is rendered but not listed  |
| `author`      | no       | Overrides `themeConfig.blog.author`; a list co-authors Posts  |
| `description` | no       | Index blurb and Feed summary; falls back to the first paragraph |
| `updated`     | no       | Shown under the title, exactly as written                     |
| `draft`       | no       | `true` keeps it out of the Blog and the Feed in a build       |

<% if (!author) { %>The default author is not set yet. Add `author: { name: 'Your Name' }` under
`themeConfig.blog` in `.vitepress/config.ts`, or give each Post its own `author`.

<% } %><% if (!baseUrl) { %>## The Feed

No RSS feed is generated yet: `themeConfig.blog.baseUrl` is not set, and every link in
a Feed has to be absolute. Set it to this site's origin in `.vitepress/config.ts` —
`baseUrl: 'https://example.com'` — and the build writes `feed.rss`.

<% } %><% if (deploy) { %>## Deploying

- **GitHub Pages** — `.github/workflows/deploy.yml` builds and publishes on every push
  to `main`. Turn on Pages for the repository with "GitHub Actions" as the source. A
  project site is served from `https://<user>.github.io/<repo>/`, so uncomment `base`
  in `.vitepress/config.ts` and name the repository.
- **Vercel** — `vercel.json` sets the build command and output directory, so importing
  the repository is enough.

<% } %><% if (preset !== 'default') { %>## Looks

The brand palette comes from the Theme's `<%= preset %>` preset, imported in
`.vitepress/theme/theme.css`. Change the import for another preset, or comment it out
and use the colours in the block below it.

<% } %>## Learn more

- [VitePress documentation](https://vitepress.dev)
- `themeConfig.blog` — every option, plus layout slots, in the Theme's own README
