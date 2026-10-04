import { resolveAuthor } from './author.js'
import type { Author, HeroConfig } from './types.js'

/**
 * The avatar the hero should show, or `undefined` for no avatar.
 *
 * Pulled out of the component because `avatar: false` is a decision, not a display detail:
 * it exists so a Site whose Author avatar belongs on bylines can keep it off the hero, and
 * that branch is the one worth testing rather than eyeballing.
 *
 * - absent  → the Site Author's avatar, so a personal blog states its picture once
 * - `false` → nothing, even when the Author has one
 * - string  → that URL, for a hero-only picture
 */
export function resolveHeroAvatar(
  hero: HeroConfig | undefined,
  author: Author
): string | undefined {
  const configured = hero?.avatar
  if (configured === false) return undefined
  return configured ?? resolveAuthor(author).avatar
}

/**
 * The hero's line when the Site wrote it as `hero.subtext`, which is HTML — or `undefined`
 * when the line falls back to the Blog's `description`.
 *
 * The distinction is the whole point. `hero.subtext` has one consumer, the hero's own `<p>`,
 * exactly like `footer.text`, so it can carry markup. `description` does not: the same value
 * is sent to the Feed, and it may legitimately contain a `<` — `'How to use <script> tags'`
 * is prose, not markup. Rendering that as HTML would swallow everything from the `<` to the
 * next `>`.
 */
export function heroSubtextHtml(
  hero: HeroConfig | undefined
): string | undefined {
  const value = hero?.subtext
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
