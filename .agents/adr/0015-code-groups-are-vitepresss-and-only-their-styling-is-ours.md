# Code Groups are VitePress's, and only their styling is ours

The Theme supports two things a reader would call a Tab, and they are implemented on opposite
sides of the boundary. `::: tabs` is the Theme's own feature: `@mdit/plugin-tab` parses it and
`<BlogTabs>` renders it, with styles, linking and a fallback of its own (ADR
`0013`). `::: code-group` is left entirely to VitePress — its markdown config registers the
container and its client app switches the panels — and the Theme's whole part in it is the
stylesheet that switching is expressed in, plus a few rules that dress it in `::: tabs`' shape.

That is not an accident of history. VitePress has no general tab container to reuse: its one
tab-shaped feature is `code-group`, and it is hard-wired to code. Its open renderer
(`src/node/markdown/plugins/containers.ts`) walks the container's tokens looking only for
`fence` tokens of tag `code` and for `html_block` tokens, and takes each Tab's title from the
fence's `[title]` — or, failing that, from its language. Everything `::: tabs` needs is therefore
absent from it: panes of arbitrary Markdown and Vue, a `value` and an `isActive` a pane can read,
`#id` linking between groups (VitePress names its radios `group-${index}`, so its groups are
independent by construction), and a chosen pane the server can render — it switches the panels
with a DOM script (`client/app/composables/codeGroups.ts`), which is the shape ADR `0013`
rejected for Tabs in the first place.

The two features overlap in appearance, not in scope. So this decision is not "we chose
VitePress's parser over the `@mdit` one for the same job"; it is that the job was never the same.

## Considered Options

- **Render `::: code-group` through `<BlogTabs>`**, so a page writing either form gets one
  component and one stylesheet. Rejected: VitePress's container rule has already run by the time
  the Theme's markdown hook sees the instance, so the Theme would have to re-scan the tokens for
  fence titles and wrap each fence in a slot template — taking over the grammar ADR `0013`
  deliberately refused to own, and duplicating a title extraction VitePress may change — in
  exchange for a look that importing one stylesheet already provides.
- **Give Code Groups a switch of their own** (`markdown: { codeGroup: true }`, or folding them
  into `markdown.tabs`). Rejected: VitePress registers the container unconditionally and the
  client switches it unconditionally, so a switch could only stop the stylesheet from arriving,
  leaving every panel and its raw radio inputs visible. A switch that turns a page _worse_ is not
  a switch. This is also why Code Group is not a Markdown Feature in `CONTEXT.md`: the Site has
  nothing to turn on.
- **Copy VitePress's code-group rules into `style.css`** instead of importing the stylesheet.
  Rejected on the ground `src/vitepress.css` already states for every VitePress stylesheet it
  re-exports: a copy drifts, and the hide/show rules are the behaviour, not a detail.

## Consequences

- The Theme ships one more VitePress stylesheet (`components/vp-code-group.css`), imported in
  `src/vitepress.css` beside `vp-code.css`. It is the one VitePress reaches only through the
  default theme's entry point, which a custom theme does not use — the same reason that file
  exists at all.
- `style.css` carries a `/* code groups */` section that overrides the imported rules so a Code
  Group and a Tab Group look alike: the same bordered box, the same soft row, the same chosen
  title as a raised surface with the accent on its word, rather than VitePress's underline bar.
  The `[data-title]::before` icons `vitepress-plugin-group-icons` already emits keep working,
  because only the label's box and colours are restated.
- A Code Group keeps VitePress's behaviour on paper and under `scripting: none`: only the chosen
  panel is shown, and the row is drawn but does nothing. This is a deliberate divergence from
  Tabs, which shows every pane under its own title there. It cannot be closed in CSS — a Code
  Group's panels have no title element to print above them, so the fallback would stack
  indistinguishable code blocks. Closing it would mean taking the renderer over, which is the
  option rejected above.
- The Theme now depends on VitePress's `container_code-group_open` rule existing and keeping its
  shape, at the level of "is there a `.vp-code-group` with an `.active` panel". That dependency
  is not new — `vitepress-plugin-group-icons` already patches that same rule name — and
  `scripts/verify-build.mjs` asserts the rendered result rather than the rule, so a VitePress that
  changed either would fail the build rather than silently unstyle the page.
