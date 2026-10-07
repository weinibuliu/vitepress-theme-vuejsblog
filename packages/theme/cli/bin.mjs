#!/usr/bin/env node
import process from 'node:process'
import { run } from './run.mjs'

/**
 * The `vitepress-theme-vuejsblog` executable.
 *
 * Thin on purpose: everything it could get wrong lives in `run.mjs` and `init.mjs`,
 * where a test can reach it. `run` resolves rather than throws for the ordinary
 * failures — an unknown command, a bad flag, a directory it must not touch — so by the
 * time control returns here the only thing left is an unexpected error, and that
 * deserves a stack-free one-liner rather than a V8 trace in the middle of a scaffold.
 */
run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`\nvitepress-theme-vuejsblog: ${message}\n`)
  process.exitCode = 1
})
