import { describe, expect, it } from 'vitest'
import { RenderError, render } from '../src/render.mjs'

/**
 * The substitution rule, on its own.
 *
 * `createFiles` is checked byte for byte by `files.test.mjs`, but that says nothing
 * about *why* a template with an odd value still comes out right. These are the
 * properties the generated files rest on.
 */

describe('render', () => {
  it('fills placeholders left to right', () => {
    expect(render('%s then %s', ['one', 'two'])).toBe('one then two')
  })

  it('leaves a template with no placeholder alone', () => {
    expect(render('nothing to fill', [])).toBe('nothing to fill')
  })

  it('reads %% as a literal percent', () => {
    expect(render('100%% of %s', ['it'])).toBe('100% of it')
  })

  it('does not rescan a value for placeholders', () => {
    // The bug this guards is a Blog title that moves every substitution after it: a
    // `String.replace` or `split`/`join` implementation would read the title's own
    // `%s` as the next placeholder. A title is arbitrary text, so this is reachable.
    expect(render('%s and %s', ['100%s', 'x'])).toBe('100%s and x')
    expect(render('%s', ['%%'])).toBe('%%')
  })

  it('refuses a value that is not a string', () => {
    // `undefined` is what a missing answer looks like. Writing the word into someone's
    // config is worse than stopping here.
    expect(() => render('%s', [undefined])).toThrow(RenderError)
    expect(() => render('%s', [42])).toThrow(/must be a string, got number 42/)
  })

  it('refuses a placeholder with no value', () => {
    expect(() => render('%s %s', ['one'])).toThrow(/%s` number 2 has no value/)
  })

  it('refuses a value the template has no place for', () => {
    // The failure a file-by-file refactor is most likely to introduce: a template
    // loses a placeholder and a value silently stops being written.
    expect(() => render('%s', ['one', 'two'])).toThrow(/Unused value/)
  })

  it('refuses a placeholder it does not define', () => {
    expect(() => render('%d', [])).toThrow(/unknown placeholder/)
  })

  it('refuses a template that ends with a lone percent', () => {
    expect(() => render('100%', [])).toThrow(/lone `%`/)
  })

  it('names the line the placeholder is on', () => {
    expect(() => render('one\ntwo\n%s', [])).toThrow(/line 3/)
  })
})
