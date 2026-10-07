---
title: Not Ready for Production?
date: 2026-10-02
draft: true
---

并非所有 `.md` 文件都应该出现在生产构建中。你可以[隐藏](#隐藏文件)或[排除](#排除文件)它们。

<!-- more -->

---

## 隐藏文件

> [!CAUTION]
> 需要注意的是，即便是在生产构建中，草稿也会被正常渲染。**任何人**都可以通过 [URL](../demo/draft.md) 访问。

生产环境中，一个被标记为草稿的文件不会出现在文章列表里，也不会参与上/下一篇文章的运算。

可以在 `frontmatter` 中设置 `draft: true` 来将文件标记为草稿。

```markdown
---
title: Unpublished Draft
date: 2026-10-02
draft: true # <- Marked as Draft
---
```

没有 `date` 字段的文件也会被视作草稿。

```markdown
---
title: A No-Date Post
---
```

当文件列表里存在草稿，终端将会输出以下内容：

```bash
[blog] not in the Blog: /posts/notes/a.md — draft: true
# or
[blog] not in the Blog: /posts/notes/b.md — no date
```

## 排除文件

部分文件应该被彻底的排除在流程之外——没有页面，也没有 URL。

与草稿不同的时，被排除的文件在生产环境中**完全不可达**。

为了便于调试，**开发环境中**，被排除的文件仍然可通过[URL](./demo/exclude.md) 访问，但不再出现在文章列表里。

### 标记为排除 (推荐)

```markdown
---
title: An Excluded File
date: 2026-10-02
exclude: true # <- Marked as exclude
---
```

### 调整主题配置

如果文件不是文章，或者不便于通过 `frontmatter` 进行排除 —— 比如一个在内容目录内的 `README.md` 文件(它可能需要在 Github 中进行渲染)。

```ts [.vitepress/config.ts]
export default defineConfig<ThemeConfig>({
  extends: blogConfig(path.resolve(import.meta.dirname, '..')),
  srcExclude: ['docs/README.md']
})
```

如果可以，我们推荐在 `frontmatter` 里标记为排除。

当文件列表里存在被标记为排除的文件，终端将会输出以下内容：

```bash
[blog] not in the Blog: /docs/demo/c.md — exclude: true
```
