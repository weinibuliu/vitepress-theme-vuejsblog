import { computed } from 'vue'
import { useData } from 'vitepress'
import type { BlogThemeConfig } from './types.js'
import { withDefaults } from './config.js'

/**
 * The client-side half of reading Theme Config.
 *
 * `useData()` is a VitePress *client* API and does not exist in the Node build, so it must
 * not live in a module that Node reaches. `config.ts` handles the Node side (a Site's
 * VitePress config, a `buildEnd` hook); this file handles components.
 *
 * Both paths must resolve the same defaults — including `lang` falling back to VitePress's
 * site-level `lang` — or the interface strings would differ between a server-rendered page
 * and that same page after hydration.
 */

/**
 * The Theme Config as a Vue computed.
 *
 * Reads from the reactive `site` data rather than the global, so a Site editing its config
 * during `dev` is reflected without a reload.
 */
export function useBlogConfig() {
  const { theme, lang } = useData()
  return computed(() =>
    withDefaults(
      (theme.value as { blog?: Partial<BlogThemeConfig> } | undefined)?.blog,
      lang.value
    )
  )
}
