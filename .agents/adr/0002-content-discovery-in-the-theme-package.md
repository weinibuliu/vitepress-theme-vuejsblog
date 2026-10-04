# Content discovery lives inside the Theme package

The Theme ships its own VitePress data loader (`posts.data.ts`) instead of asking each
Site to author one. VitePress resolves data loaders with a plain Vite `load` hook keyed
on the module id (the `staticDataPlugin` filter is `/\.data\.m?(j|t)s($|\?)/`), and that
id is matched wherever it resolves from — a loader inside `node_modules/<theme>/` is
handled exactly like one in the Site's own `.vitepress/`. This was verified by
installing the Theme as a real npm dependency and confirming that its loader produced
the post list rendered into the built HTML.

The alternative — documenting a three-line `posts.data.ts` that every Site must create —
was rejected because "便于其他用户使用" is the entire point of the package, and because a
Site that forgets the file gets a silently empty blog rather than an error. The cost we
accepted is that the Theme now depends on `createContentLoader`'s glob being the single
source of truth for Collection Scope, so scope is configured through Theme Config
(`themeConfig.blog.posts`) rather than by editing a loader.

Note the one hard constraint found while verifying this: any sub-path a **Site's config**
imports must ship as JavaScript. A Site's VitePress config is loaded by Node's own ESM
loader, so a `.ts` file reached through `node_modules` fails with
`ERR_UNKNOWN_FILE_EXTENSION`. That applies to `./config` and to `./feed` (which a Site
wires into `buildEnd`), and it is why the Theme is compiled with `tsc` into `dist/`
rather than published as raw source.

Two things are deliberately _not_ compiled, because `tsc` cannot express them and a
consuming Vite is happy to handle them:

- the `.vue` components, which the Site's `@vitejs/plugin-vue` compiles; `tsc` only
  copies them into `dist/` so that `dist/index.js` can keep a plain
  `./layouts/Layout.vue` import, and
- `posts.data.ts`, whose type depends on non-exported internals of
  `createContentLoader` and so cannot produce a nameable `.d.ts`. It is handed to
  VitePress as TypeScript, which resolves it with its own Vite pipeline.

Consequence worth knowing: because `dist/index.js` and `posts.data.ts` are compiled
and raw respectively, they must not import each other. The loader is reached from the
components, not from the entry point.

## Consequences

`tsconfig.build.json` emits declarations for the Node-facing modules only. The Theme is
therefore published as `dist/` plus the uncompiled `posts.data.ts`, and `dist/` is
cleaned before every build — an orphaned `posts.data.js` left over from an earlier
full compile was served as a **stale loader**, which VitePress picked up in preference
to the real one.
