import { tab } from '@mdit/plugin-tab'
import type { MarkdownRenderer } from 'vitepress'
import { TABS_COMPONENT } from './tabsName.js'

/**
 * Tabs: the hook a Site's `markdown: { tabs: true }` installs, as VitePress states it.
 *
 * ## What a Post writes, and what comes out
 *
 * A Post wraps its panes in a `tabs` container and separates them with `@tab` markers — the
 * syntax `vuepress-theme-hope` documents, reproduced here because that is where this Theme's
 * readers learned it:
 *
 * ```md
 * ::: tabs#fruit
 *
 * @tab apple
 *
 * An apple.
 *
 * @tab:active banana
 *
 * A banana.
 *
 * :::
 * ```
 *
 * `@mdit/plugin-tab` turns those markers into tokens — the container's `#fruit` id, the
 * titles, which Tab is marked active — and this hook renders the tokens as one component with
 * a slot per Tab, so the panes' own Markdown is still rendered by VitePress and a Post's Vue
 * can read `value` and `isActive` inside a Tab.
 *
 * The tags are therefore produced *by the renderer*, not written in the source: they are part
 * of the HTML markdown-it was asked for, and never pass through markdown-it's own HTML block
 * rules. See `docs/adr/0013-tabs-are-the-mdit-parser-and-a-component.md`.
 *
 * ## Why the hook reads the instance's options
 *
 * The Site states the switch where VitePress states its own Markdown features —
 * `markdown: { tabs: true }` — and the only way this hook can see it is `md.options`: VitePress
 * spreads the whole resolved `markdown` object into the markdown-it instance it builds
 * (`new MarkdownItAsync({ html: true, linkify: true, highlight, ...options })`), and
 * markdown-it keeps every key it is handed on `md.options`. `markdown.config(md)` is handed the
 * instance and nothing else, and the Site's Theme Config cannot be reached from here at all: it
 * is site data, and a config that registers markdown-it plugins is resolved before it exists.
 * See `docs/adr/0012-tabs-are-switched-on-in-markdown-options.md`.
 *
 * That also makes this the one place a change in VitePress could switch Tabs off without a word,
 * which is why `scripts/verify-build.mjs` renders a `tabs` container through the option: a
 * VitePress that stopped spreading `markdown` onto the instance fails that check instead.
 *
 * ## Why the hook is installed by the Theme's base config
 *
 * Because a Site states the switch in VitePress's own namespace, and VitePress composes a Site's
 * `markdown.config` after the base config's rather than replacing it — so a Site that needs a
 * markdown-it plugin of its own keeps both.
 */
export function tabsMarkdown(md: MarkdownRenderer): void {
  if (!askedFor(md)) return

  tab(md, {
    name: 'tabs',

    openRenderer: ({ active, data, id }) => {
      const titles = data.map(({ title }) => md.renderInline(title))
      // The value a Tab is known by: what its marker states after `#`, or — when it states
      // nothing — its title. Linked Tab Groups match on it, which is why the raw title is used
      // rather than the rendered one: two groups that write the same title must produce the
      // same value even when that title is written in another language or with Markdown in it.
      const values = data.map(({ title, id: value }) => value ?? title)

      return (
        `<${TABS_COMPONENT} :data='${prop(values.map((value) => ({ id: value })))}'` +
        // -1 is the plugin's "no Tab is marked active", which is the component's own default.
        (active === -1 ? '' : ` :active="${active}"`) +
        (id === undefined ? '' : ` tab-id="${md.utils.escapeHtml(id)}"`) +
        '>\n' +
        titles
          .map(
            (title, index) =>
              `<template #title${index}="{ value, isActive }">${title}</template>\n`
          )
          .join('')
      )
    },

    closeRenderer: () => `</${TABS_COMPONENT}>\n`,

    // Two slots per Tab: the row shows one, the pane shows the same one above its content for
    // paper, where the row is hidden.
    tabOpenRenderer: ({ index }) =>
      `<template #tab${index}="{ value, isActive }">\n`,

    tabCloseRenderer: () => '</template>\n'
  })
}

/**
 * Whether the Site asked for Tabs.
 *
 * Read through `md.options`, whose type knows nothing about it: `tabs` is VitePress's key, and
 * one it has never heard of — the cast is the cost of a Theme adding a name to a namespace
 * VitePress owns. See the note above.
 */
function askedFor(md: MarkdownRenderer): boolean {
  return Boolean((md.options as { tabs?: boolean }).tabs)
}

/**
 * A prop value for a single-quoted attribute.
 *
 * The value is JSON, which the Vue compiler reads back as the array literal a `:data` binding
 * wants. `'` is the one character JSON leaves alone that would also end the attribute, so it is
 * written as an entity — which the compiler decodes straight back, so an apostrophe in a title
 * survives.
 */
function prop(value: { id: string }[]): string {
  return JSON.stringify(value).replaceAll("'", '&#39;')
}
