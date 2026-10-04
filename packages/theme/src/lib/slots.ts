/**
 * Slot forwarding, pulled out of `Layout.vue` so it can be tested.
 *
 * Vue slots belong to the component that declares them, so a slot written inside `Home`
 * can only be filled through `Home`. The child components are not exported, so Layout —
 * the only component a Site reaches — has to pass each one down by name. When it does not,
 * the slot is unreachable while still looking implemented, which is precisely what
 * happened: nine documented slots and only `layout-top` / `layout-bottom` ever rendered.
 *
 * `CHILD_SLOTS` is therefore the single list of what has to be forwarded, and a test
 * compares it against the slots the components actually declare. Adding a slot to `Home`
 * without listing it here fails that test rather than silently doing nothing.
 */

/** Every slot declared by a component Layout renders, keyed by that component. */
export const CHILD_SLOTS = {
  notFound: ['content-not-found'],
  home: [
    'content-index-hero',
    'content-index-title',
    'content-index-subtext',
    'content-index-before',
    'content-index-pin',
    'content-index-after'
  ],
  article: [
    'content-post-before',
    'content-post-pin',
    'content-post-main-before',
    'content-post-main-after',
    'content-post-after'
  ],
  doc: []
} as const

/**
 * The subset of `names` that `slots` actually provides, in the order given.
 *
 * Forwarding only what was filled is what preserves a child's fallback content: passing an
 * empty slot still counts as *providing* it, so Vue would skip the child's own default.
 * `NotFound`'s 404 heading is exactly that case.
 */
export function filledSlots(
  slots: Record<string, unknown>,
  names: readonly string[]
): string[] {
  return names.filter((name) => Boolean(slots[name]))
}
