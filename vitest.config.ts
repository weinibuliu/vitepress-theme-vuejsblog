import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The Theme's tests are TypeScript and reach into its `src/`; the CLI's are plain
    // ESM under `cli/`, because it is plain ESM and has no build step. Both live under
    // `packages/theme/__tests__/`. The vendored VitePress checkout under `vitepress/`
    // has its own suite with its own aliases and is not ours to run.
    include: [
      'packages/theme/__tests__/**/*.test.ts',
      'packages/theme/__tests__/**/*.test.mjs'
    ],
    root: import.meta.dirname
  }
})
