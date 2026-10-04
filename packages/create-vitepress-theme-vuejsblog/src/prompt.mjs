import { createInterface } from 'node:readline'
import process, { stdin, stdout } from 'node:process'

/**
 * The prompts, written against `node:readline` rather than a prompt library.
 *
 * The reason is the same one that keeps this package dependency-free: `npm create`
 * downloads a single tarball and runs it, so every dependency here is one more package
 * to trust and keep alive. The interaction is four shapes — a line of text, a choice, a
 * yes/no, and nothing at all — which is less than a library would cost to configure.
 *
 * Lines are queued rather than asked for with `readline.question`, which resolves one
 * question per line and silently drops the rest of a chunk. Pasting a block of answers
 * is not unusual, and with `question` it ends the run with readline's own "Aborted with
 * Ctrl+D" — a bad way to lose a scaffold. A queue makes the reader indifferent to how
 * the input arrives.
 *
 * Every prompt has a `fallback` for the non-interactive case. A piped shell is not an
 * error: `npm create` in CI should produce a working site from the flags it was given,
 * not block on a question nobody can answer.
 */

let rl = null
let closed = false

/** Prompts waiting for a line, oldest first. */
const waiting = []

/** Lines that arrived before anything asked for them. */
const buffered = []

/**
 * Whether there is a human on the other end.
 *
 * Both ends are checked because the prompt is written to stdout and the answer read
 * from stdin: redirecting either one means the visible prompt and the typed answer no
 * longer meet, and the questions would be noise in a log.
 */
export function isInteractive() {
  return Boolean(stdin.isTTY && stdout.isTTY)
}

function ensureReader() {
  if (rl) return

  rl = createInterface({ input: stdin, output: stdout })

  rl.on('line', (line) => {
    const resolve = waiting.shift()
    if (resolve) resolve(line)
    else buffered.push(line)
  })

  rl.on('SIGINT', cancel)

  rl.on('close', () => {
    // Only reachable with input still expected: `closePrompts` runs after the last
    // question. Whoever is waiting gets `null`, which the prompts treat as Ctrl+D.
    closed = true
    while (waiting.length > 0) waiting.shift()(null)
  })
}

function nextLine() {
  if (buffered.length > 0) return Promise.resolve(buffered.shift())
  if (closed) return Promise.resolve(null)
  ensureReader()
  return new Promise((resolve) => waiting.push(resolve))
}

/**
 * Write a prompt and take the next line.
 *
 * `readline` echoes what is typed, so the only job here is the prompt itself.
 */
async function ask(prompt) {
  stdout.write(prompt)
  const line = await nextLine()
  if (line === null) cancel()
  return line
}

export function note(message) {
  stdout.write(`${message}\n`)
}

/**
 * Stop reading, but keep the process alive so the caller can still write a summary.
 */
export function closePrompts() {
  if (rl) {
    rl.close()
    rl = null
  }
}

/**
 * Ctrl+C, or input ending while a question is open.
 *
 * `process.exit` rather than an exception: the caller has nothing to unwind into — the
 * scaffold may not have written anything yet — and 130 is the conventional exit code
 * for an interrupt.
 */
function cancel() {
  closePrompts()
  stdout.write('\n')
  process.exit(130)
}

/**
 * One line of free text.
 *
 * `initial` is what an empty answer means, so Enter is always a valid keypress and the
 * default is visible in the prompt rather than hidden behind it.
 */
export async function text({ message, initial = '', validate, fallback }) {
  if (!isInteractive()) return fallback ?? initial

  for (;;) {
    const hint = initial ? ` (${initial})` : ''
    const answer = (await ask(`${message}${hint} › `)).trim()
    const value = answer === '' ? initial : answer
    const problem = validate?.(value)
    if (!problem) return value
    note(problem)
  }
}

/**
 * A numbered choice.
 *
 * Numbers rather than arrow keys: raw-mode key handling is a surprising amount of
 * terminal state to restore on the way out, including on Ctrl+C, and the whole benefit
 * is saving one keypress. A number, or the value itself, both work.
 */
export async function select({ message, options, initial = 0, fallback }) {
  if (!isInteractive()) return fallback ?? options[initial].value

  note(message)
  for (const [index, option] of options.entries()) {
    const hint = option.hint ? `  ${option.hint}` : ''
    note(`  ${index + 1}) ${option.label}${hint}`)
  }

  for (;;) {
    const answer = (
      await ask(`Choose 1-${options.length} (${initial + 1}) › `)
    ).trim()

    if (answer === '') return options[initial].value

    const chosen = Number(answer)
    if (Number.isInteger(chosen) && chosen >= 1 && chosen <= options.length) {
      return options[chosen - 1].value
    }

    const byValue = options.find((option) => option.value === answer)
    if (byValue) return byValue.value

    note(`Enter a number between 1 and ${options.length}.`)
  }
}

export async function confirm({ message, initial = true, fallback }) {
  if (!isInteractive()) return fallback ?? initial

  const hint = initial ? 'Y/n' : 'y/N'

  for (;;) {
    const answer = (await ask(`${message} (${hint}) › `)).trim().toLowerCase()

    if (answer === '') return initial
    if (answer === 'y' || answer === 'yes') return true
    if (answer === 'n' || answer === 'no') return false
    note('Please answer y or n.')
  }
}
