/**
 * The programme's surface, for tests and for anyone embedding it.
 *
 * The CLI itself is only `index.mjs` → `run`. Everything else is exported so that a
 * test can ask what the scaffolder *decided* rather than reading it back off the
 * disk, and so that the decisions are documented by their own signatures.
 */

export { HELP, OPTION_DEFAULTS, UsageError, parseArgs } from './args.mjs'
export {
  collectAnswers,
  detectPackageManager,
  packageNameFromDirectory,
  titleFromDirectory,
  willPrompt
} from './questions.mjs'
export { createFiles, isoDate, literal, quote } from './files.mjs'
export {
  TargetError,
  resolveInside,
  targetState,
  writeFiles
} from './write.mjs'
export { detectPnpmVersion, initGit, installDependencies } from './install.mjs'
export { run } from './run.mjs'
