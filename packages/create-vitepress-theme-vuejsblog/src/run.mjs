import path from 'node:path'
import process from 'node:process'
import { readFileSync } from 'node:fs'

import { HELP, UsageError, npmForwardingHint, parseArgs } from './args.mjs'
import { createFiles } from './files.mjs'
import { detectPnpmVersion, initGit, installDependencies } from './install.mjs'
import { closePrompts, note } from './prompt.mjs'
import { collectAnswers, willPrompt } from './questions.mjs'
import { targetState, writeFiles } from './write.mjs'
import { PACKAGE_NAME } from './constants.mjs'

const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)

const DEV_COMMAND = {
  pnpm: 'pnpm dev',
  npm: 'npm run dev',
  yarn: 'yarn dev',
  bun: 'bun run dev'
}

/**
 * The whole run, in order.
 *
 * It both prints and returns a summary, deliberately: the shape of a run is worth
 * testing, and a function whose only output is `process.exit` cannot be asked what it
 * did. The exit code is still set here, because that is the part the shell sees.
 */
export async function run(argv, options = {}) {
  const cwd = options.cwd ?? process.cwd()

  let args
  try {
    args = parseArgs(argv)
  } catch (error) {
    if (!(error instanceof UsageError)) throw error
    process.exitCode = 1
    note(`\n${error.message}`)
    const hint = npmForwardingHint()
    if (hint) note(hint)
    note('Run with --help to see the options.')
    return { ok: false, reason: error.message }
  }

  if (args.help) {
    note(HELP)
    return { ok: true, help: true }
  }

  if (args.version) {
    note(manifest.version)
    return { ok: true, version: true }
  }

  note(
    `\n${PACKAGE_NAME} v${manifest.version} — a blog with the vuejsblog theme\n`
  )

  if (!args.yes && !willPrompt(args)) {
    note(
      'No TTY was found, so the defaults are used. Flags choose anything else.\n'
    )
  }

  // A flag npm swallowed leaves no error behind, only a question that should not
  // have been asked, so the hint belongs where a prompt is about to be.
  if (willPrompt(args)) {
    const hint = npmForwardingHint()
    if (hint) note(`${hint}\n`)
  }

  const answers = await collectAnswers(args)

  // Readline holds stdin until it is told to let go, and the install below wants to
  // inherit the terminal. Closing here rather than in a `finally` because nothing
  // after this point asks a question.
  closePrompts()

  const target = path.resolve(cwd, answers.targetDir)
  const relativeTarget = path.relative(cwd, target) || '.'

  const state = targetState(target)

  // `.` resolves to wherever the caller is standing, which is a normal thing to want;
  // a directory holding their shell state is `occupied` by then, so the check below
  // covers it too.
  if (state === 'not-a-directory') {
    const reason = `${target} exists and is not a directory`
    note(`\n${reason}.`)
    process.exitCode = 1
    return { ok: false, reason }
  }

  if (state === 'occupied' && !args.force) {
    const reason =
      `${target} is not empty. Pass --force to write into it — only the files this ` +
      'scaffolder generates are overwritten, and nothing is deleted.'
    note(`\n${reason}`)
    process.exitCode = 1
    return { ok: false, reason }
  }

  const files = createFiles(answers, {
    today: options.today ?? new Date(),
    pnpmVersion: options.pnpmVersion ?? detectPnpmVersion()
  })

  const written = writeFiles(target, files)
  note(`  ${written.length} files written to ${relativeTarget}/`)

  if (answers.install) {
    note(`\nInstalling dependencies with ${answers.packageManager}...`)
    const installed = installDependencies(target, answers.packageManager)
    if (!installed.ok)
      note(`  ! ${installed.reason}. Run the install yourself.`)
  }

  if (answers.git) {
    const committed = initGit(target)
    if (!committed.ok) note(`  ! git: ${committed.reason}`)
  }

  note('\nDone. Next steps:\n')
  if (relativeTarget !== '.') note(`  cd ${relativeTarget}`)
  if (!answers.install) note(`  ${answers.packageManager} install`)
  note(`  ${DEV_COMMAND[answers.packageManager]}`)
  note('')
  note(
    `The Blog itself is configured in ${path.join(relativeTarget, '.vitepress/config.ts')}.`
  )

  const todos = []
  if (!answers.author) todos.push('name the default author')
  if (!answers.baseUrl) todos.push('set baseUrl to get the RSS feed')
  if (todos.length > 0) {
    note('')
    note(
      `Still to do: ${todos.join(', ')} — the config has a commented line for each.`
    )
  }
  note('')

  return { ok: true, answers, target, written }
}
