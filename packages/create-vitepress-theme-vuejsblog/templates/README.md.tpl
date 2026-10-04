# %s

%s

## Getting started

```bash
%s
%s
```

`%s` writes the production site to `.vitepress/dist`.

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
date: %s
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

%s## Learn more

- [VitePress documentation](https://vitepress.dev)
- `themeConfig.blog` — every option, plus layout slots, in the Theme's own README
