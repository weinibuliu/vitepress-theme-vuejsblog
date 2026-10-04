# The TOC's headings come from the build, not from the rendered page

A Post's TOC lists the Post's own headings, and it lists them in the server-rendered HTML. The
headings are `pageData.headers`, which VitePress collects when `markdown.headers` is on — and
the Theme turns that option on in its own base config, with `shouldAllowNested: true` so that a
heading inside a `:::tip` or a blockquote is collected too.

VitePress's own default theme does the opposite: it reads the headings back out of the rendered
page with `document.querySelectorAll('.VPDoc h1, … h6')`, in `onContentUpdated`. That is not a
preference, it is the only thing available to it. `markdown.headers` is **off** by default
(VitePress's docs say so), and a theme cannot turn a Site's markdown option on — a theme is
reached through `vitepress/theme`, not through `defineConfig`. This Theme is both: a Site
reaches it as `extends: blogConfig(root)`, and VitePress deep-merges an extended config
(`mergeConfig` → `mergeMarkdownConfig`), so an option stated in the Theme's base config arrives
as the Site's own and survives whatever `markdown` the Site states itself.

## What that buys

- **The TOC is in the HTML.** It is there in the first paint, it is there with scripting off,
  and hydration does not make it appear. A DOM-read TOC is built after the page is interactive,
  so it pops in — during which the reader watches the left column fill itself in.
- **The tree is already built.** `@mdit-vue/plugin-headers` walks the Markdown token stream
  with a stack and produces nested `{ level, title, slug, link, children }`, which is exactly
  the shape a nested TOC wants. Deciding what to show is then a filter, `resolveToc`, which is
  pure and covered by unit tests. The DOM route means re-implementing the plugin's own
  `serializeHeader` rules — which classes to skip (`header-anchor`, `VPBadge`, `footnote-ref`,
  `ignore-header`), what to do with `code_inline` — and none of that is exported: it lives in
  `src/client/theme-default/composables/outline.ts`, reachable only by a deep import into an
  alpha package's internals.
- **The decisions stay in `lib/`.** The repo's habit is that judgements live in pure functions
  with tests (`resolvePosts`, `withDefaults`, `formatDate`); the DOM route would put the
  Theme's newest piece of logic somewhere that only a browser can test it.

## Considered Options

- **Read the headings from the DOM, as the default theme does.** Rejected: it gives up the
  server-rendered TOC, and it makes the Theme depend on VitePress internals that are not
  exported. Its real advantage is robustness — the DOM is what the reader actually sees — and
  the cost of giving that up is bounded and stated below.
- **A hybrid: build-time headings, DOM as a fallback when the build collected none.** Rejected:
  the fallback path is the code above, kept alive for a case that is rare and visible (an author
  sees an empty TOC), and it would still pop in wherever it triggered.
- **Ask `@mdit-vue/plugin-headers` for the `[2, 3]` range directly, instead of collecting
  h2–h6 and filtering.** Rejected: which levels a TOC shows is a display decision, and the
  plugin is asked once per Site, so a range asked for there could not later be changed per Post.

## Consequences

- A Site that states `markdown: { headers: false }` of its own gets no TOC. The merge means
  only an explicit `false` — stating `markdown` for another reason keeps the TOC.
- A heading that only exists at render time is not in the TOC. Markdown is collected before it
  is rendered, so a markdown-it plugin that injects headings, or a Vue component that renders
  one into the page, produces a heading the TOC does not know about.
- The TOC and a Post's own `[[toc]]` container can disagree, because `shouldAllowNested` is set
  here and not there: the container keeps its top-level-only default, so on a Post whose headings
  sit inside another block the TOC lists them and `[[toc]]` does not. The Post that prompted this
  is `playground/posts/vue-3-3.md`, whose `:::tip` is closed by an indented `:::` and so never
  closes at all. The disagreement is deliberate. The TOC stands in for the default theme's
  _outline_, which reads the rendered page and lists what is on it; `[[toc]]` is a different
  feature, a list inside the body with a rule of its own.
