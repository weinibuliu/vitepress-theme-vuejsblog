import process from 'node:process'

import { log } from '@clack/prompts'

import { ROOT_HELP } from './args.mjs'
import { init } from './init.mjs'
import { manifest } from './manifest.mjs'

/**
 * The programme's one entry point, and the only place a command name is read.
 *
 * The package is a Theme that also carries the CLI that scaffolds a Site for itself,
 * so the surface is deliberately small: `init`, plus the two flags a shell asks a
 * programme before choosing anything. `init` keeps its own parser untouched — once the
 * command is stripped, it sees exactly the arguments it always did, and its `--help`
 * and `--version` still answer for it alone.
 *
 * It resolves rather than throws for an unknown command, the way `init` does for a bad
 * flag: the caller typed something wrong, which is a message rather than a crash.
 */
export async function run(argv = process.argv.slice(2), options = {}) {
  const stdout = options.stdout ?? process.stdout
  const [command, ...rest] = argv

  if (command === undefined || command === '--help' || command === '-h') {
    stdout.write(ROOT_HELP)
    return { ok: true, help: true }
  }

  if (command === '--version' || command === '-v') {
    stdout.write(`${manifest.version}\n`)
    return { ok: true, version: true }
  }

  if (command === 'init') return init(rest, options)

  const reason = `Unknown command "${command}". Run \`vitepress-theme-vuejsblog --help\` to see the commands.`
  log.error(reason)
  process.exitCode = 1
  return { ok: false, reason }
}
