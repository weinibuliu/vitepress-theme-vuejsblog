# The narrow TOC is a fixed bar over a native popover

Below 1280px the frame has no left column, so the TOC gets a second rendering: a bar fixed to
the top of the viewport whose trigger reveals the list in a **native popover**. The bar is hidden
until the site nav has scrolled away and is out of flow, so it never takes room from the Post.

**Fixed, not sticky.** A sticky bar that enters the flow at the moment the reader earns it would
insert its own 47px into the document and push the Post down as it appears — the page would jump
under their finger. `position: fixed` is out of flow from the start, so showing it costs the Post
nothing. The default theme reaches the same conclusion for a page with no sidebar: its
`.VPLocalNav` has a `.fixed` modifier for exactly that case.

**A popover, not a disclosure.** `<details>` would give the Theme the toggle for free, but the
platform's popover also brings light dismiss, Escape, and the top layer — all declaratively, and
all working before hydration and with scripting off. The top layer is what frees the panel from
the column's stacking context and from any `overflow` between it and the viewport, which is the
part a disclosure would have had to reproduce with `position: absolute`. `<details>` would also
have needed script for the parts it does not have: close on a heading click, close on a new page,
and an exit animation, since `::details-content` is only newly available.

This is the same property ADR 0009 and ADR 0013 protect from the other side. The list is in the
server-rendered HTML, and a reader whose script fails can still open it: `popovertarget` is
declarative, so the button works untouched. A JavaScript state machine — which is what the default
theme's own `VPLocalNavOutlineDropdown` is — cannot say that, because a panel behind a client-only
`v-if` does not exist until the script does.

**Script keeps to what the platform will not do.** Three things, none of them the opening:

- **When the bar appears.** The rule is the default theme's: once the site nav has scrolled away.
  Measured on mount and on every content update, never on scroll — a layout read per scroll event
  is what makes a scroll handler cost anything, and this component already says so about the
  highlight. The measurement rides the throttled scroll handler the highlight uses.
- **`aria-expanded`.** The platform does not set it for a popover invoker. The trigger's copy is
  updated from the popover's own `toggle` event. Without script the panel still opens and closes;
  only the state a screen reader hears stays at its server-rendered "closed". The chevron is
  driven from `:popover-open` in CSS instead, so it does not share that limitation.
- **Closing.** Neither the platform nor the markup closes the panel when the reader clicks a
  heading link inside it, or when a client-side navigation replaces the page under a component
  that survives it. Both are one call to `hidePopover()`.

**The height is not a free choice.** The bar is `2.9375rem` — 47px — because that is what
`vp-doc.css` already assumes a page's top chrome takes: `.vp-doc [id]`'s `scroll-margin-top` starts
at `2.9375rem`, which is also what the default theme's local nav measures. Being that tall is what
makes an anchor jump land below the bar without the Theme restating the offset, so the height is
declared privately on `.vp-blog-ui-toc` rather than added to the documented variables in `:root`,
where a Site changing it would silently break the arithmetic.

## Considered Options

- **A client-side disclosure, as the default theme writes it** — an `open` ref, a click-outside
  listener, an Escape handler, a body scroll lock, and a `Transition`. Rejected: it buys a body
  scroll lock and an exit animation at the cost of the panel not existing without script. The
  panel is a short list in a box that already scrolls on its own; neither is worth that.
- **`<details>`, kept and restyled as the bar.** Rejected above: the toggle is free, but light
  dismiss, Escape and the top layer are not, and the Theme would be writing script anyway to get
  the last two — so the platform feature it gave up is the larger one.
- **The bar visible from the first paint**, rather than earned by scrolling. Rejected as the
  default theme's behaviour is the opposite and the reader does not need a TOC control while the
  title and the byline are still on screen saying what the page is. It is a threshold, not a
  feature: moving it is one comparison.
- **Sticky in the flow, with a spacer that absorbs the jump.** Rejected: it is the same problem
  with an extra element to keep in step with the bar's height, and the spacer is wrong the moment
  the bar's font size changes.
- **The site nav's class as a coupling to avoid** — measuring the frame's own position instead.
  Rejected: that position moves between the narrow and wide layouts, so the threshold would be
  stale after a resize, and the nav is the mark the rule is actually about. Both ends are the
  Theme's own markup.
- **`::backdrop` styling and a body scroll lock while open.** Rejected: the backdrop's job here
  is light dismiss, which the platform already does, and the panel contains its scrolling with
  `overscroll-behavior` rather than by freezing the page behind it.

## Consequences

- The narrow rendering is anchored to the viewport, so it is the one piece of chrome that does
  not move with the Post's measure. Its inner row shares `--vp-blog-layout-measure` and
  `--vp-blog-layout-gutter` with the Post, so the trigger sits on the text's own left edge.
- A reader who widens the window while the panel is open keeps a panel that CSS then hides, and
  gets it back, still open, if they narrow it again. The alternative is a resize listener for a
  state the reader can see and dismiss.
- The `aria-expanded` the trigger reports is a copy, so a browser with no script reports the
  state it was rendered with. The panel opens regardless; the accessible name is the only part
  that is wrong, and only in that case.
- `returnToTop` is a new string in every table in `lib/i18n.ts`, which `i18n.test.ts` enforces the
  same shape of across locales.
