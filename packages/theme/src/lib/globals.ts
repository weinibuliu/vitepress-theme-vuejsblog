/**
 * Access to VitePress's resolved site config from outside a component.
 *
 * VitePress 2 exposes it on `globalThis.VITEPRESS_CONFIG`, with `themeConfig`
 * nested under `site` — the top-level `themeConfig` that VitePress 1 carried is
 * gone, which is why the Theme targets 2.x only. Its type is not on VitePress's
 * public surface, so the shape the Theme relies on is declared here once.
 */
export interface VitePressGlobals {
  srcDir?: string
  logger?: { warn(message: string): void; info(message: string): void }
  site?: { themeConfig?: { blog?: unknown } }
}

export function getVitePressGlobals(): VitePressGlobals {
  return ((globalThis as Record<string, unknown>).VITEPRESS_CONFIG ??
    {}) as VitePressGlobals
}

/**
 * Whether VitePress is serving (`dev`) rather than building for production.
 *
 * The distinction decides whether Drafts are listed: an author writing wants to see
 * them, a published Blog must not contain them.
 *
 * VitePress's resolved config does **not** expose its command, so the only reliable
 * signal here is `NODE_ENV`, which Vite itself sets to `production` for a build. The
 * default is deliberately "not dev": if the signal is ever missing, the safe failure
 * is a Blog without drafts rather than a published draft.
 */
export function isDev(): boolean {
  const nodeEnv = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env?.NODE_ENV
  return nodeEnv !== 'production'
}
