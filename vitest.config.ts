import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The Theme's tests are TypeScript and reach into its `src/`; the scaffolder's are
    // plain ESM, because the package they test is plain ESM and has no build step. The
    // vendored VitePress checkout under `vitepress/` has its own suite with its own
    // aliases and is not ours to run.
    include: [
      'packages/theme/__tests__/**/*.test.ts',
      'packages/create-vitepress-theme-vuejsblog/__tests__/**/*.test.mjs'
    ],
    root: import.meta.dirname
  }
})
