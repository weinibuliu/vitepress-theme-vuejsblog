---
title: Tabs Demo
date: 2026-09-30
draft: true
---

Tabs, inspired by [Vuepress Theme Hope](https://theme-hope.vuejs.press/guide/markdown/content/tabs.html)

> [!NOTE]
> Different from [Vuepress Theme Hope](https://theme-hope.vuejs.press/guide/markdown/content/tabs.html), tab id's choice will **NOT** be stored and persisted. It's by designed.

<!-- more -->

---

## Enable Tabs

For enable tabs, you should edit config file first:

```ts{7}
// .vitepress/config.ts

export default defineConfig<ThemeConfig>({
  // ...
  themeConfig: {
    markdown: {
      tabs: true
    }
  }
})
```

## A Tab Group

::: tabs

@tab apple

An apple.

@tab banana

A banana.

:::

## The default Tab

`@tab:active` marks the Tab a group opens on. A group that marks none opens on its first.

::: tabs

@tab Rust

Rust is shown only when a reader picks it.

@tab:active Go

Go is the default here, because its marker says so.

:::

## Titles are Markdown

A title is rendered as inline Markdown, so it can carry `code`, **emphasis** or a link to
[the guide](../zh-cn/welcome.md).

::: tabs

@tab `pnpm`

```bash
pnpm add vitepress-theme-vuejsblog
```

@tab **npm**

```bash
npm i vitepress-theme-vuejsblog
```

:::

## Linking Tab Groups

Tab Groups that state the same Tab Id show the same choice: pick one below and the other group
follows, by value rather than by position — which is what the `#value` suffix is for.

The package manager this repository uses:

::: tabs#package-manager

@tab npm

npm ships with Node.

@tab pnpm

pnpm is what this repository is developed with.

:::

Installing the Theme with it:

::: tabs#package-manager

@tab Using npm#npm

```bash
npm i vitepress-theme-vuejsblog
```

@tab Using pnpm#pnpm

```bash
pnpm add vitepress-theme-vuejsblog
```

:::

## A Tab's Value

`#value` also names a Tab for its own content, which reads it as `value` — along with
`isActive`, so a pane can say something about itself:

::: tabs

@tab Shown#shown

This pane reads `value` as `{{ value }}` and `isActive` as `{{ isActive }}`.

@tab Hidden#hidden

This pane reads `value` as `{{ value }}` and `isActive` as `{{ isActive }}`.

:::

Markdown works inside a pane, including callouts and Vue expressions:

::: tabs

@tab A callout

> [!TIP]
> A pane is ordinary Markdown.

@tab Vue

Two plus two is {{ 2 + 2 }}.

:::
