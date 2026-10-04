import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CHILD_SLOTS, filledSlots } from '../src/lib/slots.js'

const componentsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/components'
)

/**
 * Every `<slot name="…">` a component declares, each name once.
 *
 * A name may be declared more than once — the index renders its heading slots in both the
 * hero and the plain-head branches, which are mutually exclusive — and that is still one
 * slot as far as a Site is concerned.
 */
function declaredSlots(file: string): string[] {
  const source = readFileSync(path.join(componentsDir, file), 'utf8')
  return [
    ...new Set(
      [...source.matchAll(/<slot\s+name="([^"]+)"/g)].map((match) => match[1])
    )
  ]
}

describe('filledSlots', () => {
  it('keeps only the slots actually provided', () => {
    const slots = {
      'content-index-before': () => null,
      'content-index-title': () => null
    }
    // Declaration order, not the order they appear in the slots object.
    expect(filledSlots(slots, CHILD_SLOTS.home)).toEqual([
      'content-index-title',
      'content-index-before'
    ])
  })

  it('drops a slot that was not provided, which is what preserves a fallback', () => {
    // This is the whole point: if `content-not-found` were forwarded as an empty slot,
    // Vue would treat it as *provided* and skip `NotFound`'s own 404 heading.
    expect(filledSlots({}, CHILD_SLOTS.notFound)).toEqual([])
    expect(
      filledSlots({ 'content-not-found': () => null }, CHILD_SLOTS.notFound)
    ).toEqual(['content-not-found'])
  })

  it('preserves the declared order, so forwards read predictably', () => {
    const all = Object.fromEntries(
      CHILD_SLOTS.article.map((name) => [name, () => null])
    )
    expect(filledSlots(all, CHILD_SLOTS.article)).toEqual([
      ...CHILD_SLOTS.article
    ])
  })
})

describe('CHILD_SLOTS matches what the components declare', () => {
  // The defect this file exists for: nine slots were documented and implemented inside the
  // components, but Layout forwarded none of them, so they were unreachable and nothing
  // failed. A list that drifts from the components reintroduces exactly that.
  const byComponent: Array<[keyof typeof CHILD_SLOTS, string]> = [
    ['notFound', 'NotFound.vue'],
    ['home', 'Home.vue'],
    ['article', 'Article.vue'],
    ['doc', 'BlogDoc.vue']
  ]

  for (const [key, file] of byComponent) {
    it(`${file} declares exactly the forwarded slots`, () => {
      expect([...declaredSlots(file)].toSorted()).toEqual(
        [...CHILD_SLOTS[key]].toSorted()
      )
    })
  }

  it('lists no component twice and no slot twice', () => {
    const all = Object.values(CHILD_SLOTS).flat()
    expect(new Set(all).size).toBe(all.length)
  })

  it('covers every component that declares a slot', () => {
    const declaredAnywhere = readdirSync(componentsDir)
      .filter((name) => name.endsWith('.vue'))
      .flatMap((name) => declaredSlots(name))
    const forwarded = Object.values(CHILD_SLOTS).flat()

    expect(declaredAnywhere.toSorted()).toEqual([...forwarded].toSorted())
  })
})
