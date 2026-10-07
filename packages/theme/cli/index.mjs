/**
 * The programme's surface, for tests and for anyone embedding it.
 *
 * The executable itself is only `bin.mjs` → `run` → `init`. Everything else is
 * exported so that a test can ask what the scaffolder *decided* rather than reading it
 * back off the disk, and so that the decisions are documented by their own signatures.
 */

export {
  HELP,
  OPTION_DEFAULTS,
  ROOT_HELP,
  UsageError,
  parseArgs
} from './args.mjs'
export {
  collectAnswers,
  init,
  isInteractive,
  scaffold,
  targetState
} from './init.mjs'
export { detectPnpmVersion, initGit, installDependencies } from './install.mjs'
export { manifest } from './manifest.mjs'
export { run } from './run.mjs'
export { template } from './templates.mjs'
export {
  detectPackageManager,
  escapeHtml,
  escapeXml,
  isoDate,
  literal,
  packageNameFromDirectory,
  quote,
  titleFromDirectory
} from './values.mjs'
