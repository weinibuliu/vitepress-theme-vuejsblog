# Tabs are the `@mdit` parser and a component of the Theme's own

Two decisions, taken together because each is the other's reason: the `tabs` container is parsed
by `@mdit/plugin-tab`, and what it produces is a Vue component — `<BlogTabs>`, with a slot per
Tab — rather than plain HTML the Theme would animate from the browser.

**The parser is not ours.** `@mdit/plugin-tab` is the sibling of `@mdit/plugin-container`, which is
what VitePress 2 already builds its own `::: tip` containers on, and its author is the same. It
turns the markers into tokens: the container's `#id`, each Tab's title and `#value`, which one
carried `@tab:active`. Reimplementing it would mean owning the parts that are genuinely hard to
get right — indentation, the escape before `#`, auto-closing an unterminated container, nesting
inside another container — in exchange for nothing visible, since the author-facing syntax is
fixed by the reference (`vuepress-theme-hope`'s own documentation) either way. What the plugin
gives the Theme is a documented seam: four renderer callbacks, from which the Theme writes the
Markdown's output itself.

**The output is a component.** The Theme renders those callbacks as one component per container
with a slot per Tab (`#titleN`, `#tabN`), which is what makes a pane a template rather than a
string: the pane's own Markdown is still rendered by VitePress, Vue expressions and components
work inside it, and a pane can read the `value` and `isActive` the component passes to its slots.
The tags are produced by the renderer and never written in the source, so markdown-it's HTML block
rules never see them — the container is a block-level rule, and its output goes to the page as
produced.

The alternative the plugin itself offers — plain `<div>`s with `data-` attributes, switched by a
DOM script it ships (`register()`) — was rejected for the reason
`docs/adr/0009-headings-come-from-the-build.md` rejected a DOM-read TOC: the choice would then be
made in the browser, so the server-rendered HTML could not contain it. Every pane would ship
either all-visible or with the wrong one chosen, and a reader with scripting off would get a stack
of panes rather than a page.

## Considered Options

- **Hand-write the block rules** in `src/lib/`, as the Theme's own judgements (ordering, excerpts,
  the TOC) are hand-written and tested. Rejected: those are decisions with a defensible answer,
  while this is a grammar whose answer is fixed by the feature's reference. Owning it would buy
  control no Site would ever see, at the cost of the boundary cases that make a parser a parser.
- **Emit the panes as plain HTML and switch them with a small client script.** Rejected above: no
  server-rendered choice, and a page that degrades to a stack.
- **A parent and a child component, the child naming its own Tab through `provide`/`inject`**
  (the shape `vitepress-plugin-tabs` uses). This works in VitePress and is what an author of a
  VitePress-native plugin would reach for. Rejected here because the slot shape says the same
  thing with one component: the container's renderer callback already knows every title before
  the body arrives, so there is nothing for a child to register.
- **CSS-only tabs** — `:checked` radio inputs, no JavaScript at all. Rejected: `#id` linking
  between Tab Groups is a decision that has to be shared, and a pane that reads `value` or
  `isActive` needs Vue in scope. A reader who cannot run the script gets the fallback the
  stylesheet states instead — `print` and `scripting: none` hide the row and show every pane under
  its own title — which is the behaviour that matters when a script fails.
- **Persistence, as the reference does it** — a Tab Group's choice kept in `localStorage` and
  restored on the next visit. Rejected: it writes to a reader's browser to remember something
  they did not ask to be remembered, and the feature works without it. A choice lives while the
  page does: `lib/tabsLinking.ts` holds it, and leaving the page — or reloading it — forgets it.

## Consequences

- The Theme has a third runtime dependency (`@mdit/plugin-tab`, alongside `feed` and
  `gray-matter`). It is Node-side — reached from `config.js`, never from the browser bundle — and
  it costs every Site that installs the Theme, whether or not it states `markdown: { tabs: true }`.
  The alternative is not "no dependency" but "a parser to maintain", which is the trade recorded
  above.
- Every pane is in the DOM, and the stylesheet hides the ones that are not chosen, rather than the
  `hidden` attribute doing it. Paper and a browser that reports `scripting: none` show all of them
  under their own titles, because the row cannot be clicked there and is hidden instead; a
  browser without the `scripting` media feature keeps the row and the chosen pane, which is the
  page's ordinary state.
- The Theme's styles are its own: the reference's folder-shaped tabs are not reproduced, and the
  colours come from VitePress's tokens instead of the reference's own variables, which do not
  exist here. That is not a separate decision — it is the Style Layer doing what
  `docs/adr/0001-hand-written-css-over-tailwind.md` already settled, and the look is a few rules
  in `style.css` that a Site can override.
- The default `value` of a Tab is its **raw** title rather than the rendered one, which is a
  deliberate divergence from the reference: linked Tab Groups match on that value, and two groups
  that write the same title must produce the same value even when the title contains Markdown.
