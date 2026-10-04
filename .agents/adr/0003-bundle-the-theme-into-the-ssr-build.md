# Bundle the Theme into the SSR build, from the Theme's own base config

A VitePress theme that ships `.vue` components must be listed in Vite's
`ssr.noExternal` by every Site that consumes it, because VitePress externalises
dependencies and Node's ESM loader cannot read a `.vue` file. Without it a production
build fails in the final "rendering pages" phase with

```
Unknown file extension ".vue" for .../node_modules/vitepress-theme-vuejsblog/dist/layouts/Layout.vue
```

The Theme cannot fix this from its own package, so it puts the entry in the base config
it already asks Sites to extend (`vitepress-theme-vuejsblog/config`). VitePress merges
_and deep-merges_ an extended config's `vite` block, so a Site gets the fix by doing what
it was going to do anyway.

This was nearly missed. Both the workspace playground and an `npm install` from a local
`file:` path pass **without** this setting, because npm installs a local path as a
symlink and Vite then follows it and compiles the Theme as source. The failure only
appears for a genuine registry install, which is the only install that matters for a
published package. Verification therefore has to include building a project that
installs a packed tarball.

## Considered Options

- **Pre-compile the `.vue` files into JavaScript** so nothing externalised is
  unreadable. This trades one problem for a worse one: the Theme would need its own SFC
  build pipeline, and `@vitejs/plugin-vue` — which every consuming Site already has —
  would no longer be doing the work.
- **Document the setting and ask Sites to add it.** Rejected: it is a required incantation
  whose omission produces an error that points at the Theme's own internals, so it would
  be reported as a Theme bug regardless.
