# Ship the Theme as self-contained hand-written CSS, not Tailwind utilities

A VitePress theme that gets installed as an npm package cannot rely on Tailwind
utility classes. Tailwind v3 resolves its config relative to the directory of the
CSS file it is processing, so CSS living under `node_modules/<theme>/` looks for a
`tailwind.config.js` _there_, not in the Site. Measured on the reference site:
with the theme moved into `node_modules`, the Site's `tailwind.config.js` was never
read and Tailwind generated no utility classes at all — the built stylesheet was a
6.9 kB stub containing only preflight. Precompiling Tailwind at publish time would
work but would permanently deny Site authors the ability to use utility classes in
their own Markdown. So the Theme ships hand-written CSS with scoped component
styles, matching how VitePress's own default theme and most distributed VitePress
themes are built. The reference site's Tailwind class names are a translation
source for the visual design, not an implementation to inherit.

## Considered Options

- **Precompiled Tailwind at publish time** — reliable, but Site authors could never
  use Tailwind utilities in their content without building a second, conflicting setup.
- **Theme ships its own `tailwind.config.js` beside its CSS** — fixes utility
  generation but injects preflight globally and leaves two configs competing.

## Consequences

Writing the CSS by hand means the Theme cannot lean on VitePress's default theme for its
design tokens or its Markdown typography either. A custom theme does not _extend_ the
default one, it **replaces** it: `@theme/index` resolves to either the Site's
`.vitepress/theme/` or to `theme-default`, never both
(`src/client/app/index.ts` imports `@theme/index`; `src/node/config.ts` sets `themeDir` to
one or the other). Every one of the default theme's stylesheets — including `base.css`,
the closest thing to a global reset — is imported by that theme's own entry point, so
**nothing is injected globally**.

VitePress does provide the app shell regardless of theme: `<Content />`, `useData()`, the
router, head management, and the `useCopyCode()` / `useCodeGroups()` behaviour behind the
code block's copy button. That is exactly why the copy button exists, works, and had no
icon — the behaviour is VitePress's, the icon is the theme's.

Three things had to be supplied explicitly, and **all three were missed on the first
pass, each leaving the build green**:

- Every `--vp-c-*` reference resolved to nothing, so the Theme had no palette.
- Post bodies rendered unstyled, because VitePress emits the `vp-doc` class only on the
  default theme's own wrapper.
- The code block's copy button lost its icon. `vp-doc.css` _references_
  `--vp-icon-copy`, but `icons.css` is what _defines_ it, so the button rendered as an
  empty mask.

What the Theme now imports:

- `src/vitepress.css` re-exports VitePress's published `vars.css`, `base.css`,
  `icons.css`, `vp-doc.css`, `vp-code.css` and `custom-block.css`. Importing the
  stylesheets rather than copying them keeps the real palette, the real icons and the
  real typography without vendoring ~700 lines that would drift.
- `<Content />` in a Post carries `vp-doc`.

One of those imported stylesheets is overridden on purpose, and the exception is the price
of importing them whole. `vp-doc.css` gives every `h2` a `border-top`; the reference site's
Tailwind Typography does not. A Post that writes `## ` directly after `---` therefore draws
the rule twice — the `<hr>` and the heading's own border, about 48px apart — where the
reference draws one. `src/style.css` drops that border inside `.vp-blog-prose` and adopts
Tailwind Typography's own `hr` margins and `hr + *` reset, so `---` stays the only divider a
Post body draws and the heading keeps the reference's distance below it.

The same rule has to take the reference's divider _colour_, which `vp-doc.css` gets wrong for
this design in the other direction. Tailwind Typography's Post-body rule is a fixed
`#e5e7eb` that does not follow the chrome, so in dark mode the reference's body dividers stay
bright while its chrome divides with `slate-200/5`. `--vp-c-divider` is the chrome's, and
tables and blockquotes share it, so it cannot carry both weights — thinning it to the
chrome's dark value would take the table borders with it. A Post body therefore reads a
`--vp-blog-content-divider` of its own, falling back to the reference's literal.

Both overrides are confined to Post bodies: a standalone `layout: page` document keeps
`vp-doc` as imported. Importing the stylesheets whole is what bought the real palette, icons
and typography without vendoring ~700 lines that would drift; these are the places where the
borrowed typography had to be corrected rather than inherited.

`scripts/verify-build.mjs` asserts all of it, including the general shape of the third
failure: every `vp-blog-*` class in the markup has a rule, and every `--vp-*` custom
property the stylesheet _uses_ is one it _defines_. That last check is what would have
caught the missing icon at the time.

## Recolouring goes through VitePress's tokens, not Theme Config

There is deliberately no `themeConfig.blog.color` or `background`. VitePress's
`--vp-c-*` custom properties already are the theming API — every one of them is declared
as a `var()` chain ending in a leaf token (`--vp-c-brand-1: var(--vp-c-green-1)`,
VitePress ships indigo there), so a Site reskins the Theme by overriding a handful of
leaves, in its own CSS, in its own repo. Adding a config key on top would create a second,
competing mechanism for the same job, and the Theme would then owe its users a colour
model, a validation story and a migration path for a surface VitePress already owns.

The Theme's own default accent is green, set by pointing the brand tokens at VitePress's
existing green scale rather than by inventing four hex values. The reference site's green
was measured and rejected: `#3eaf7c` — the `--c-brand` in `blog/.vitepress/theme/style.css`,
which nothing there actually uses — reaches only 2.75:1 on white, below WCAG AA for text,
and 1.94:1 against the code-block background. VitePress's `#18794e` / `#3dd68c` pair is
already per-mode and already checked, and `scripts/verify-build.mjs` recomputes both ratios
from the built stylesheet so the default cannot regress.

The Theme also ships four alternative brand presets as importable stylesheets
(`vitepress-theme-vuejsblog/presets/*.css`), because the awkward part of a brand palette is
not knowing _which_ tokens to change but knowing that each mode needs its own value and its
own contrast check. The same script computes the WCAG ratio for every preset in both modes,
so a future edit to one cannot silently leave dark mode unreadable.
