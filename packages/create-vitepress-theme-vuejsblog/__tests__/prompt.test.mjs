import { describe, expect, it } from 'vitest'
import { confirm, isInteractive, select, text } from '../src/prompt.mjs'

/**
 * The non-interactive contract, which is the only one a test can observe: with no TTY
 * every prompt answers from its `fallback`, so a piped shell or a `--yes` run produces a
 * Site rather than blocking.
 *
 * Skipped when the suite is run from a real terminal, because then `isInteractive()` is
 * true by definition and asking would wait for a human. CI has no TTY, which is where
 * these matter.
 */
describe.skipIf(isInteractive())('prompts without a TTY', () => {
  it('reports that it cannot ask', () => {
    expect(isInteractive()).toBe(false)
  })

  it('takes the fallback, or the initial when there is none', async () => {
    expect(
      await text({ message: 'Blog title', initial: 'a', fallback: 'b' })
    ).toBe('b')
    expect(await text({ message: 'Blog title', initial: 'a' })).toBe('a')
  })

  it('answers a choice from its fallback', async () => {
    const options = [{ value: 'default' }, { value: 'rose' }]

    expect(
      await select({
        message: 'Brand palette',
        options,
        initial: 0,
        fallback: 'rose'
      })
    ).toBe('rose')
  })

  it('answers a confirmation from its fallback', async () => {
    expect(
      await confirm({ message: 'Install?', initial: true, fallback: false })
    ).toBe(false)
    expect(await confirm({ message: 'Install?', initial: false })).toBe(false)
  })
})
