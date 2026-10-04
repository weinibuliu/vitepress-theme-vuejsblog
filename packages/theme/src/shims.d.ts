/**
 * Ambient shims for the two asset kinds `tsc` cannot resolve on its own.
 *
 * The Theme is compiled by the Site's Vite, which resolves `.vue` single-file
 * components and `.css` side-effect imports; `tsc` only needs to know the
 * specifiers are valid so that `pnpm typecheck` also covers the asset imports.
 *
 * `vite/client` declares the CSS half, but it is not resolvable from this package
 * under pnpm's strict `node_modules`, and referencing it would drag the
 * browser-side `import.meta.env` surface into the Node-side `feed.ts` as well.
 */
declare module '*.vue' {
  import type { Component } from 'vue'
  const component: Component
  export default component
}

/** Mirrors Vite: a plain `.css` import is a side effect and has no exports. */
declare module '*.css' {}
