---
title: 'Welcome'
date: 2026-10-02
toc: true
pin: 0
author:
  - name: weinibuliu
    gravatar: 2b9643e3e2b5062b1bf581ed52213805389cbd628f87967816dd6a8d3c0bf951
    github: https://github.com/weinibuliu
  - name: Example 1
  - name: Example 2
    x: https://x.com/example
    github: https://github.com/example
    mail: example@example.com
    customSocial:
      icon:
        svg: >-
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="19" r="3"/><path d="M2 10v4c4.4 0 8 3.6 8 8h4c0-6.6-5.4-12-12-12Z"/><path d="M2 3v4c8.3 0 15 6.7 15 15h4C21 11.6 12.4 3 2 3Z"/></svg>
      label: RSS
      link: /feed.rss
---

<script setup>
import { BlogAuthor } from "vitepress-theme-vuejsblog"
</script>

`vitepress-theme-vuejsblog` 是一个仅为**博客**设计的主题。它**并非**为文档设计，**没有太多**的自定义选项，但足够我使用。或许你也会喜欢。

本文将介绍主题的用法。

<!-- more -->

---

> [!TIP]
> `vitepress-theme-vuejsblog` 的外观灵感来自于 <https://blog.vuejs.org> ，其源码位于 [Github](https://github.com/vuejs/blog)

[[TOC]]

---

## 快速开始

首先，通过脚手架应用快速初始化。

> `--yes` 参数会为所有参数应用默认值。

:::tabs

@tab pnpm

```bash
pnpm create vitepress-theme-vuejsblog@latest my-blog --yes
cd my-blog
pnpm install
pnpm dev
```

@tab npm

```bash
npm create vitepress-theme-vuejsblog@latest my-blog -- --yes
cd my-blog
npm install
npm dev
```

:::

现在应该可以通过 <http://localhost:5173> 访问到开发服务器。

## Markdown 拓展

本主题支持**全部** Vitepress 默认主题的[markdown 拓展](https://vitepress.dev/zh/guide/markdown) 用法。

还支持**部分**来自 [Vuepress Theme Hope](https://theme-hope.vuejs.press) 的拓展用法:

- [Tabs](../demo/tabs.md)

## 主题配置

> [!TIP]
> 建议在修改主题配置文件后重启开发服务器。

本主题的配置文件位于 `./vitepress/config.ts`。
我们将在后文逐步介绍主题配置。

```ts
// .vitepress/config.ts

export default defineConfig<ThemeConfig>({
  // ...
  themeConfig: {
    blog: {
      title: 'My Blog',
      author: { name: 'Your Name' },
      logo: '/logo.svg',
      favicon: '/logo.svg',
      nav: [{ text: 'About', link: '/about' }],
      footer: { text: '© 2026 My Blog' },
      feed: { language: 'en' }
    }
  }
})
```

## 网站配置

### 网站标题与描述

> [!WARNING]
> 始终需要正确设置 `themeConfig.title` 与 `themeConfig.description` 。

通过 `themeConfig.title` 与 `themeConfig.description` 字段设置网站的标题与描述。

```ts
// .vitepress/config.ts

export default defineConfig<ThemeConfig>({
  // ...
  themeConfig: {
    title: 'The Website Title',
    description: 'The description of website',
    blog: {
      siteTitle: 'Another Title',
      siteSubtext: 'Another <a href="/">Description</a>' // siteSubtext 支持 HTML
    }
  }
})
```

### 首页 Hero

通过 `themeConfig.blog.hero` 字段设置首页 Hero 。

```ts
// .vitepress/config.ts

export default defineConfig<ThemeConfig>({
  // ...
  themeConfig: {
    title: 'The Website Title',
    description: 'The description of website',
    blog: {
      hero: {
        title: 'Vitepress Theme Vuejs Blog',
        avatar: false,
        // subText 支持 html 渲染
        subtext:
          "This is not the official <a href='https://vuejs.org'>Vue.js</a> website. We just cite <a href='https://blog.vuejs.org'>blogs</a> to verify rendering."
      }
    }
  }
})
```

## 网站语言

```ts
// .vitepress/config.ts

export default defineConfig<ThemeConfig>({
  // ...
  themeConfig: {
    lang: 'zh-CN' // 网站语言
    blog: {
      locale: 'en-US' // 日期渲染格式
    }
  }
})
```

## 文章位置

默认情况下，主题将会读取 `posts/` 目录下所有 `*.md` 文件。

可以通过修改 `themeConfig.blog.posts` 来调整目录结构。

```ts
// .vitepress/config.ts

export default defineConfig<ThemeConfig>({
  // ...
  themeConfig: {
    blog: {
      // ...
      posts: ['posts/*.md', 'docs/**/*.md']
    }
  }
})
```

调整之后，主题会同时读取 `posts/`下的全部 `*.md` 文件，并递归读取 `docs/` 目录下所有 `*.md` 文件。

### 首页顶栏

> 本站的顶栏设置。

```ts
// .vitepress/config.ts

export default defineConfig<ThemeConfig>({
  // ...
  themeConfig: {
    blog: {
      nav: [
        {
          text: 'Github',
          link: 'https://github.com/weinibuli/vitepress-theme-vuejsblog'
        },
        { text: 'RSS Feed', link: '/feed.rss', external: false }
      ]
    }
  }
})
```

## TOC

主题默认会为所有文章生成 TOC 侧栏，可以通过 `themeConfig.blog.toc: false` 禁用。

```ts
// .vitepress/config.ts

export default defineConfig<ThemeConfig>({
  // ...
  themeConfig: {
    blog: {
      toc: false
  }
})
```

也可以在 `frontmatter` 中单独启用/禁用某篇文章的 TOC 。

> 本站便是如此设置的

```md
---
# ...
toc: true
---
```

## 置顶文章

```md
---
pin: true
---
```

在 `frontmatter` 中使用 `pin` 字段来置顶文章。支持传入 `number | true`。传入 `true` 时，相当于 `pin: 0`。存在多个置顶文章时，优先级将按 `pin: {number}` 升序排列。

如果多个文章使用相同的优先级，构建时将会报错。请为每篇文章分配不同的优先级。

## 博客作者

主题提供了 `themeConfig.blog.author` 字段以设置主题层面的默认作者。

文章作者信息的优先级为：
文件级作者定义 > [域级](#按域定义作者)作者定义 > 主题级作者定义

```ts
// .vitepress/config.ts

export default defineConfig<ThemeConfig>({
  // ...
  themeConfig: {
    blog: {
      // ...
      author: {
        name: 'weinibuliu',
        gravatar:
          '2b9643e3e2b5062b1bf581ed52213805389cbd628f87967816dd6a8d3c0bf951',
        github: 'https://github.com/weinibuliu'
      }
      // 当然，也可以只提供一个字符串
      // author: 'Example 1'
    }
  }
})
```

始终可以在文章的 `frontmatter` 中覆盖主题层面的默认值。

提供一个字符串：

```md
---
author: Example 3
---
```

或者，提供一个对象：

```md
---
- name: weinibuliu
  gravatar: 2b9643e3e2b5062b1bf581ed52213805389cbd628f87967816dd6a8d3c0bf951
  github: https://github.com/weinibuliu
---
```

### 按域定义作者

可以按文件目录定义该域下的作者。被成功匹配的文章将使用对应的域级作者定义而非主题级作者定义。

需要注意的是：

- 域定义不支持通配符
- 始终尝试匹配更精确(更长)的路径而非按数组顺序匹配

> 以下配置的效果可参见[这篇文章](../en-us/not-ready-for-production.md)

```ts
// .vitepress/config.ts

export default defineConfig<ThemeConfig>({
  // ...
  themeConfig: {
    blog: {
      // ...
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
      }
    }
  }
})
```

### 合著

可以为 `author` 字段提供一个数组表示合著：

> 本文就是如此设置的

```md
---
# ...
author:
  - name: weinibuliu
    gravatar: 2b9643e3e2b5062b1bf581ed52213805389cbd628f87967816dd6a8d3c0bf951
    github: https://github.com/weinibuliu
  - name: Example 1
  - name: Example 2
    x: https://x.com/example
    github: https://github.com/example
    mail: example@example.com
    customSocial:
      icon:
        svg: >-
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="19" r="3"/><path d="M2 10v4c4.4 0 8 3.6 8 8h4c0-6.6-5.4-12-12-12Z"/><path d="M2 3v4c8.3 0 15 6.7 15 15h4C21 11.6 12.4 3 2 3Z"/></svg>
      label: RSS
      link: /feed.rss
---
```

### 作者头像

主题支持使用完整 URL(`author.avatar`) 和 [gravatar 标识符](https://docs.gravatar.com/rest/hash/)(`author.gravatar`) 提供作者头像。

> `author.avatar` 优先级大于 `author.gravatar`

```md
---
# ...
- author:
    - name: weinibuliu
      gravatar: 2b9643e3e2b5062b1bf581ed52213805389cbd628f87967816dd6a8d3c0bf951
    - name: Anyoumous
      avatar: https://gravatar.com/avatar
      gravatar: 2b9643e3e2b5062b1bf581ed52213805389cbd628f87967816dd6a8d3c0bf951
---
```

这将会渲染为：
<script>
const authors = [
  { name: 'weinibuliu', avatar: 'https://gravatar.com/avatar/2b9643e3e2b5062b1bf581ed52213805389cbd628f87967816dd6a8d3c0bf951' },
  { name: 'Anyoumous', avatar: 'https://gravatar.com/avatar/' }
]
</script>

<div class="vp-blog-content-post-frame">
  <BlogAuthor :authors="authors" />
</div>
