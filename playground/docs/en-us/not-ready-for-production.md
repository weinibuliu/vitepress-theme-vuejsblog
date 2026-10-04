---
title: Not Ready for Production?
date: 2026-10-02
draft: true
---

Not every markdown file is ready for production. You can [hide](#hide-file) or [exclude](#exclude-file) them.

<!-- more -->

---

## Hide File

> [!CAUTION]
> Drafts are always rendered. We simply hide them from the post list in production. **ANYBODY** can still access them via [URL](../demo/draft.md).

A file marked as draft means it will not be included in post-list in **production**.

You can set `draft: true` to mark this file is a draft at frontmatter.

```markdown
---
title: Unpublished Draft
date: 2026-10-02
draft: true # <- Marked as Draft
---
```

Also, any file without a `date` will be treated as a draft.

```markdown
---
title: A No-Date Post
---
```

If files are marked as draft, we will output:

```bash
[blog] not in the Blog: /posts/notes/a.md — draft: true
# or
[blog] not in the Blog: /posts/notes/b.md — no date
```

## Exclude File

Sometimes a file should not be part of the site at all — no page, no URL.

Unlike draft, excluded files are **NOT reachable** at all in **production**.

In order to debug, it can still be accessed via [URL](./demo/exclude.md) in **dev**, but it not will be in post-list.

### Marked as exclude (Recommended)

```markdown
---
title: An Excluded File
date: 2026-10-02
exclude: true # <- Marked as exclude
---
```

### ThemeConfig

It is for files that are not Posts — a `README.md` sitting in a content directory.

If the file is post, we recommend to mark as excluded at `frontmatter`.

```ts
// .vitepress/config.ts

export default defineConfig<ThemeConfig>({
  extends: blogConfig(path.resolve(import.meta.dirname, '..')),
  srcExclude: ['docs/README.md']
})
```

---

If files are marked as excluded, we will output:

```bash
[blog] not in the Blog: /docs/demo/c.md — exclude: true
```
