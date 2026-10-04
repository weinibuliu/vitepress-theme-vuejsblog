import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'

/**
 * Writing the generated tree, carefully.
 *
 * A scaffolder is one of the few tools that routinely writes to a path a person typed
 * by hand, so the two things worth being deliberate about are refusing to write where
 * it should not, and never deleting. `--force` overwrites the files this package
 * generates and leaves everything else in the directory alone; emptying the directory
 * the way some generators do is a data-loss bug waiting for a typo.
 */

export class TargetError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TargetError'
  }
}

/**
 * What is at `dir` right now. `occupied` is not an error by itself — only the caller
 * knows whether `--force` was passed, and the distinction is worth a named state
 * rather than a boolean.
 */
export function targetState(dir) {
  if (!existsSync(dir)) return 'absent'
  if (!statSync(dir).isDirectory()) return 'not-a-directory'
  return readdirSync(dir).length === 0 ? 'empty' : 'occupied'
}

/**
 * Assert that `candidate` really is inside `dir`.
 *
 * Unreachable today, since every key in the file set is a literal written by this
 * package. It is here because the cost of being wrong is writing outside the
 * directory the caller named, and the check is one `path.relative`.
 */
export function resolveInside(dir, relative) {
  const absolute = path.resolve(dir, relative)
  const inside = path.relative(dir, absolute)
  if (inside === '' || inside.startsWith('..') || path.isAbsolute(inside)) {
    throw new TargetError(`Refusing to write outside the target: ${relative}`)
  }
  return absolute
}

/**
 * Write every file, creating directories as needed.
 *
 * Returns what it touched, so the summary can report it and a test can assert on the
 * order without reading the disk back.
 */
export function writeFiles(dir, files) {
  const written = []

  for (const [relative, contents] of Object.entries(files)) {
    const absolute = resolveInside(dir, relative)
    mkdirSync(path.dirname(absolute), { recursive: true })
    const existed = existsSync(absolute)
    writeFileSync(absolute, contents, 'utf8')
    written.push({ path: relative, existed })
  }

  return written
}
