/**
 * The facts the scaffolder would otherwise have to guess, in one place.
 *
 * Nothing here is fetched: a scaffold has to work offline and from a tarball, so
 * every version is a literal. `__tests__/constants.test.mjs` compares the two that
 * are a promise about the Theme against the Theme's own `package.json`, because a
 * drifted pin is the one mistake in this file that would not fail loudly here.
 */

export const PACKAGE_NAME = 'create-vitepress-theme-vuejsblog'

/**
 * The Theme this scaffolds a Site for.
 */
export const THEME_PACKAGE = 'vitepress-theme-vuejsblog'

/**
 * The Theme's version range. The Theme is a peer of no one, so a caret range is
 * right: the Site's config is stable across the Theme's minor releases.
 */
export const THEME_VERSION = '^0.1.3'

/**
 * VitePress 2 is an alpha and the Theme reads `globalThis.VITEPRESS_CONFIG.site`,
 * which 1.x does not provide, so this is pinned exactly rather than ranged — see
 * the Requirements section of the Theme's README.
 */
export const VITEPRESS_VERSION = '2.0.0-alpha.20'

/**
 * `vue` is a peer of VitePress, not of the Theme, but a VitePress alpha is not a
 * safe thing to let float either. Kept in step with the Theme's own playground.
 */
export const VUE_VERSION = '3.5.41'

export const NODE_TYPES_VERSION = '^22.10.0'

/**
 * The Theme's brand palettes. `default` is not a file — it is the green the Theme
 * already ships, and choosing it means importing nothing.
 */
export const PRESETS = ['default', 'emerald', 'rose', 'violet', 'amber']

/**
 * Each preset's light-mode `--vp-c-brand-1`, as a literal. Used only to colour the
 * generated `logo.svg`, so that the mark does not clash with a chosen palette; the
 * palette itself stays in the Theme's CSS, which is the only place it belongs.
 */
export const PRESET_MARKS = {
  default: '#18794e',
  emerald: '#047857',
  rose: '#be123c',
  violet: '#6d28d9',
  amber: '#b45309'
}

export const BRAND_PRESET_DIR = `${THEME_PACKAGE}/presets`

/**
 * The package managers the generated project's scripts and CI can be written for.
 */
export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn', 'bun']

/**
 * The default site directory, and the fallback for a `--yes` run.
 */
export const DEFAULT_TARGET = 'my-blog'

/**
 * The language the Theme's own interface strings fall back to. Not a prompt: the
 * Theme degrades to English for any tag it does not ship, so `--lang` is enough for
 * the people who need something else.
 */
export const DEFAULT_LANG = 'en'

/**
 * pnpm's version when it cannot be detected.
 *
 * Exact, not a range like `10`, because it is written into the Site's `packageManager`
 * field: Corepack refuses anything there that is not a semver version, and
 * `pnpm/action-setup` reads that same field to decide which pnpm to install. It mirrors
 * the version this repository pins for itself, so the fallback is a version the
 * templates are known to work with.
 */
export const FALLBACK_PNPM_VERSION = '12.8.1'
