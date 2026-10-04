# Take the Author social icons from VitePress's own icon pipeline

The Theme's Author social icons render through VitePress's `useIcon`, imported from the
bare `vitepress` entry point, with names drawn from `@iconify-json/simple-icons` —
`simple-icons:x`, `simple-icons:github`, `simple-icons:facebook` and
`simple-icons:instagram`. That collection is a dependency of `vitepress` itself
(`vitepress/package.json`), and VitePress resolves the collections it depends on from its
own `node_modules` (`ownCollections` in `vitepress/src/node/icons.ts`), so the names work
for a Site with **zero installation**: no new dependency, and no icon payload shipped by
the Theme. VitePress collects the names into `SSGContext.vpIcons` during SSR and emits one
hashed stylesheet, `vp-icons.<hash>.css`, at build time (`vitepress/src/node/icons.ts`,
`vitepress/src/node/build/render.ts`). Each icon is a CSS mask filled with `currentColor`,
so it follows the palette like any other token.

Deliberately **not** `VPIcon` from `vitepress/theme`: that entry point also pulls in the
default theme's stylesheets and components, which a standalone blog theme would ship and
never use. This is the same reasoning already recorded in `packages/theme/src/vitepress.css`,
whose comment explains it. Reusing VitePress's published assets rather than vendoring them
is likewise what ADR 0001 already does with `vars.css`, `base.css` and `icons.css`, so
taking its icon pipeline extends that decision rather than reversing it.

simple-icons is a brands-only collection and has no generic envelope icon — only
`maildotcom`, `maildotru` and the `gmail` brand mark — so the `mail` icon is one
hand-written inline envelope SVG that the Theme ships itself.

## Considered Options

- **Hand-write all five platform SVGs**, keeping the Theme fully self-contained and owing
  nothing to a collection's coverage. Rejected: four brand marks are exactly what a brand
  collection is for, and VitePress already ships one with the icon pipeline.
- **Depend on a general collection** such as `@iconify-json/lucide` or `@iconify-json/mdi`,
  which would supply a generic envelope. Rejected because `loadCollectionFromFS` resolves
  collections from the **Site** root, not from the Theme, so the Site — not the Theme —
  would have to install it.

## Consequences

Any icon collection other than simple-icons requires the Site to install it. That boundary
is what the hand-written `mail` SVG marks: rather than introduce a second collection and
push an install onto every Site, the Theme spends one inline SVG to stay install-free.
