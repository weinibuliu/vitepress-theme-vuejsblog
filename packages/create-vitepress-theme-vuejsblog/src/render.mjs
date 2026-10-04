/**
 * Filling a template with values, and nothing else.
 *
 * `%s` is replaced by the next value in order; `%%` is a literal `%`. There is no
 * conditional syntax, no expression language and no partial-include: a template says
 * *where* content goes, and `files.mjs` decides *what* content there is. That keeps the
 * rule small enough to hold in your head, and keeps every judgement — which block,
 * which command, which colour — in ordinary JavaScript, where the tests already look.
 *
 * Two properties matter more than they look:
 *
 * 1. **A value is appended, never rescanned.** `render('%s and %s', ['100%s', 'x'])` is
 *    `100%s and x`. `String.replace` and `split`/`join` both get this wrong, and a Blog
 *    title is arbitrary text that may legitimately contain a placeholder.
 * 2. **A `%` that begins neither `%s` nor `%%` is an error, not a literal.** Templates
 *    are text files a person may edit, and `width: 100%` typed into one would otherwise
 *    corrupt every substitution after it, silently. Write `100%%`.
 *
 * The count is checked in both directions. A template that gains a placeholder without
 * gaining a value fails on the next scaffold rather than shipping a literal `%s` to a
 * stranger, and a value whose template lost its placeholder fails rather than vanishing
 * — which is the one bug a file-by-file refactor like this is most likely to introduce.
 */

export class RenderError extends Error {
  constructor(message) {
    super(message)
    this.name = 'RenderError'
  }
}

/**
 * The rendered text. `values` are strings, one per `%s`, in the order they appear.
 *
 * Strings only, deliberately: `undefined` is what a missing answer looks like, and a
 * template that writes the word "undefined" into a stranger's blog is worse than one
 * that stops. The type check turns that mistake into an error at the seam.
 */
export function render(template, values = []) {
  let out = ''
  let index = 0
  let taken = 0

  while (index < template.length) {
    const char = template[index]

    if (char !== '%') {
      out += char
      index += 1
      continue
    }

    const kind = template[index + 1]

    if (kind === '%') {
      out += '%'
      index += 2
      continue
    }

    if (kind !== 's') {
      throw new RenderError(
        where(
          template,
          index,
          kind === undefined
            ? 'a template may not end with a lone `%`'
            : `unknown placeholder \`%${kind}\` — only \`%s\` and \`%%\` exist`
        )
      )
    }

    if (taken >= values.length) {
      throw new RenderError(
        where(template, index, `\`%s\` number ${taken + 1} has no value`)
      )
    }

    const value = values[taken]

    if (typeof value !== 'string') {
      throw new RenderError(
        where(
          template,
          index,
          `\`%s\` number ${taken + 1} must be a string, got ${describe(value)}`
        )
      )
    }

    out += value
    taken += 1
    index += 2
  }

  if (taken !== values.length) {
    const spare = values.length - taken
    throw new RenderError(
      `Unused value${spare === 1 ? '' : 's'}: the template takes ${taken}, ${values.length} ` +
        `${spare === 1 ? 'was' : 'were'} given`
    )
  }

  return out
}

/** A placeholder's position, as a line, so a template author can go to it. */
function where(template, index, message) {
  const line = template.slice(0, index).split('\n').length
  return `Template line ${line}: ${message}`
}

function describe(value) {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'object') return 'an object'
  return `${typeof value} ${JSON.stringify(value)}`
}
