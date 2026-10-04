# Tabs are switched on in VitePress's markdown options

A Site turns Tabs on by stating `markdown: { tabs: true }` — a key in VitePress's own markdown
namespace, not a field of Theme Config. The Theme's base config installs the hook that reads it
(`markdown.config: tabsMarkdown`), and the hook finds the option on the markdown-it instance it
is handed, as `md.options.tabs`.

The reason the option cannot live in Theme Config is timing, and it is worth stating exactly,
because `themeConfig.blog.tabs` looks like the obvious spelling:

- **Markdown is read before Theme Config exists as data.** A Site writes
  `extends: blogConfig(root)` and `themeConfig: {...}` in the same object literal, and
  `blogConfig(root)` is evaluated first. There is no `themeConfig` to read at that point, and
  VitePress does not hand a config function anything to read it from either
  (`resolveConfigExtends` calls `config()` with no arguments — `src/node/config.ts`).
- **By the time Theme Config is resolved, the markdown-it instance is already built.** VitePress
  creates it inside the `vitepress` Vite plugin's `configResolved` hook, and it has the resolved
  site config — Theme Config included — right there (`src/node/markdownToVue.ts`), but it passes
  only `markdown` options down to `createMarkdownRenderer`. A markdown-it plugin is registered by
  `options.config(md)`, and that callback receives **the instance and nothing else**
  (`src/node/markdown/markdown.ts`).
- **A Site's own `markdown` object is not a back channel either.** The only keys that reach the
  renderer are the ones VitePress itself reads; everything else in that object is inert. So
  `markdown: { tabs: true }` is only meaningful because this Theme reads it, and the only place
  this Theme can read it is the instance.

That last point is the one undocumented dependency in this design. VitePress builds the instance
by spreading the whole resolved markdown object into it —
`new MarkdownItAsync({ html: true, linkify: true, highlight, ...options })` — and markdown-it
assigns every key it is handed onto `md.options`. `tabs` therefore arrives on the instance like
VitePress's own `math`, `headers` and `container` do. It is a property of markdown-it's public
API read through a detail of VitePress's construction, so a VitePress that started picking only
the keys it knows would silently drop it. `scripts/verify-build.mjs` is what makes that loud: the
playground states the option, and the check that the demo page renders Tab Groups fails if the
option ever stops arriving.

**Tabs are off until a Site asks.** A container name is global to the Site's Markdown — an
author who writes `::: tabs` means it — and a Blog theme that quietly claimed the name would be
taking a decision that belongs to the Site. Off by default also keeps the parser out of every
Site that never writes one. The Scaffolder states the option for the Sites it generates, so a
new Blog has Tabs from its first commit; the Theme's own playground states it for the same
reason, and so that the verification above has something to look at.

## Considered Options

- **Always on, no switch.** Rejected: the Theme would register a block rule for a container name
  the Site may already use for something else, and there would be no way to say no.
- **`themeConfig.blog.tabs`.** Rejected as impossible rather than as undesirable: Theme Config is
  site data, and the renderer is built before it is available. A half-switch — the parser always
  registered, the component registered conditionally — was rejected too, because it leaves the
  page emitting a tag nothing resolves when the option is off, which is worse than having no
  option.
- **`blogConfig(root, { markdown: { tabs: true } })`.** The one place a build-time switch _can_
  live, because the Site calls it. Rejected: it invents a second configuration surface, and a
  Theme Config that is sometimes the answer and sometimes not is a rule every reader has to
  learn twice.
- **The Theme exports the plugin and the Site wires it into `markdown.config` itself.**
  Rejected: it makes a feature of the Theme into plumbing the Site performs, and off-by-default
  plus hand-wiring means a reader of the Theme's syntax has no reason to suspect it exists.
- **Read the option from the page's `frontmatter` or per-locale options.** Rejected: the
  container is Markdown syntax, not a page's declaration, and a per-page switch would let one
  page of a Blog read differently from the next for no gain.

## Consequences

- The key is declared by the Theme, through module augmentation of VitePress's `MarkdownOptions`
  in `src/index.ts`, so a Site that writes `markdown: { tabs: true }` typechecks. It lives in the
  Theme's entry point rather than beside the hook because that is the file a Site imports, and
  because declaring it must not drag a Node-side markdown-it plugin into the browser bundle.
- VitePress **composes** a Site's own `markdown.config` after the Theme's rather than replacing it
  (`mergeMarkdownHooks`), so a Site that needs a markdown-it plugin of its own keeps both.
- A Site that installs a `tabs` container of its own registers it after this one, so the Theme's
  rule wins the name. That is the price of a switch the Site can state, and it is written down
  where the hook is installed.
- The Theme now ships a markdown-it dependency. That is the subject of
  `docs/adr/0013-tabs-are-the-mdit-parser-and-a-component.md`.
