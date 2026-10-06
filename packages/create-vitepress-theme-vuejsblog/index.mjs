#!/usr/bin/env node
import { init } from './src/init.mjs'

/**
 * The `create-vitepress-theme-vuejsblog` executable.
 *
 * Thin on purpose: everything it could get wrong lives in `src/`, where a test can
 * reach it. `init` resolves rather than throws for the ordinary failures — a bad flag,
 * a directory it must not touch — so by the time control returns here the only thing
 * left is an unexpected error, and that deserves a stack-free one-liner rather than a
 * V8 trace in the middle of a scaffold.
 */
init().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`\ncreate-vitepress-theme-vuejsblog: ${message}\n`)
  process.exitCode = 1
})
