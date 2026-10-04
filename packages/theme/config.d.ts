import type { HeadConfig, TransformContext, UserConfig } from 'vitepress'

/**
 * The Theme's base VitePress config, given the Site root. A Site extends it from its own
 * config:
 *
 * ```ts
 * import path from 'node:path'
 * import blogConfig from 'vitepress-theme-vuejsblog/config'
 *
 * export default defineConfig<ThemeConfig>({
 *   extends: blogConfig(path.resolve(import.meta.dirname, '..')),
 *   themeConfig: { blog: { title: 'My Blog', author: 'Me' } }
 * })
 * ```
 *
 * `root` is required rather than discovered: the Theme reads the Site's Markdown while the
 * config is loading, to turn `exclude: true` into VitePress's `srcExclude`, and the Site is the
 * only party that can say where its root is.
 */
declare function blogConfig(root: string): UserConfig

export default blogConfig

/**
 * The Theme's `<link rel="icon">`, as a `transformHead` hook. Exported so a Site that needs a
 * `transformHead` of its own can still get this entry: VitePress replaces rather than composes
 * hooks, so a Site that defines its own loses this one unless it calls it.
 */
export declare function blogHead(ctx: TransformContext): HeadConfig[]
