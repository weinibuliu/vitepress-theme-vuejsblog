---
title: Tabs Demo
date: 2026-09-30
draft: true
---

Tabs, inspired by [Vuepress Theme Hope](https://theme-hope.vuejs.press/guide/markdown/content/tabs.html).

> [!NOTE]
> Different from Vuepress Theme Hope, tab id's choice will **NOT** be stored and persisted.

<!-- more -->

---

## Enable Tabs

For enable tabs, you should edit config file first:

```ts{5} [.vitepress/config.ts]
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

:::: details Raw

```md
::: tabs

@tab apple

An apple.

@tab banana

A banana.

:::
```

::::

::: tabs

@tab apple

An apple.

@tab banana

A banana.

:::

## The default Tab

:::: details Raw

```md
::: tabs

@tab Rust

Rust is shown only when a reader picks it.

@tab:active Go

Go is the default here, because its marker says so.

:::
```

::::

`@tab:active` marks the Tab a group opens on. A group that marks none opens on its first.

::: tabs

@tab Rust

Rust is shown only when a reader picks it.

@tab:active Go

Go is the default here, because its marker says so.

:::

## Titles are Markdown

:::: details Raw

````md
::: tabs

@tab `pnpm`

```bash [pnpm]
pnpm add vitepress-theme-vuejsblog
```

@tab **npm**

```bash [npm]
npm i vitepress-theme-vuejsblog
```

:::
````

::::

A title is rendered as inline Markdown, so it can carry `code`, **emphasis** or a link to
[the guide](../zh-cn/welcome.md).

::: tabs

@tab `pnpm`

```bash [pnpm]
pnpm add vitepress-theme-vuejsblog
```

@tab **npm**

```bash [npm]
npm i vitepress-theme-vuejsblog
```

:::

## Linking Tab Groups

Tab Groups that state the same Tab Id show the same choice: pick one below and the other group
follows, by value rather than by position — which is what the `#value` suffix is for.

The package manager this repository uses:

:::: details Raw

````md
::: tabs#package-manager

@tab npm

npm ships with Node.

@tab pnpm

pnpm is what this repository is developed with.

:::

Installing the Theme with it:

::: tabs#package-manager

@tab Using npm#npm

```bash [npm]
npm i vitepress-theme-vuejsblog
```

@tab Using pnpm#pnpm

```bash [pnpm]
pnpm add vitepress-theme-vuejsblog
```

:::
````

::::

::: tabs#package-manager

@tab npm

npm ships with Node.

@tab pnpm

pnpm is what this repository is developed with.

:::

Installing the Theme with it:

::: tabs#package-manager

@tab Using npm#npm

```bash [npm]
npm i vitepress-theme-vuejsblog
```

@tab Using pnpm#pnpm

```bash [pnpm]
pnpm add vitepress-theme-vuejsblog
```

:::

## A Tab's Value

`#value` also names a Tab for its own content, which reads it as `value` — along with
`isActive`, so a pane can say something about itself:

:::: details Raw

```md
::: tabs

@tab Shown#shown

This pane reads `value` as `{{ value }}` and `isActive` as `{{ isActive }}`.

@tab Hidden#hidden

This pane reads `value` as `{{ value }}` and `isActive` as `{{ isActive }}`.

:::
```

::::

::: tabs

@tab Shown#shown

This pane reads `value` as `{{ value }}` and `isActive` as `{{ isActive }}`.

@tab Hidden#hidden

This pane reads `value` as `{{ value }}` and `isActive` as `{{ isActive }}`.

:::

Markdown works inside a pane, including callouts and Vue expressions:

:::: details Raw

```md
::: tabs

@tab A callout

> [!TIP]
> A pane is ordinary Markdown.

@tab Vue

Two plus two is {{ 2 + 2 }}.

:::
```

::::

::: tabs

@tab A callout

> [!TIP]
> A pane is ordinary Markdown.

@tab Vue

Two plus two is {{ 2 + 2 }}.

:::
