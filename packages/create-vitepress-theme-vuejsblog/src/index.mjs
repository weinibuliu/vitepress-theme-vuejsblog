/**
 * The programme's surface, for tests and for anyone embedding it.
 *
 * The CLI itself is only `index.mjs` → `init`. Everything else is exported so that a
 * test can ask what the scaffolder *decided* rather than reading it back off the
 * disk, and so that the decisions are documented by their own signatures.
 */

export {
  HELP,
  OPTION_DEFAULTS,
  UsageError,
  npmForwardingHint,
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
