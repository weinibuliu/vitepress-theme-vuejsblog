/**
 * The class every External Link carries, wherever it sits — the Theme's public hook.
 *
 * A Site hangs its own "you are leaving this Site" prompt off it, so the name is part of the
 * Theme's contract and is stated here once: `config.js` (through `dist`) puts it on every
 * external link in Markdown, and the templates put it on the ones they render themselves.
 * The arrow is not this class's doing — see the External Arrow section of `style.css`.
 */
export const EXTERNAL_LINK_CLASS = 'vp-blog-external-link'

/**
 * Whether a link leaves the Site: the question `target="_blank"`, the hook class and the
 * External Arrow are all asked, and the one an `external` flag on a link is deliberately
 * *not*: that flag only says "do not let the client router take this one", which a
 * same-origin file such as the Feed needs without leaving the Site at all.
 *
 * The answer is purely syntactic, so it is the same while the page is rendered on the server
 * and in the browser. VitePress renders every page on the server first, where there is no
 * `location` to compare an origin against; a rule that needed one would classify every
 * link as internal in the HTML and then correct itself on hydration, which is both a
 * mismatch and a first paint with no arrow. VitePress's own `isExternal` reads the same way.
 *
 * `mailto:`, `tel:`, `javascript:` and a bare `#` are not External Links. They have no
 * origin to leave, and the first two open a mail client or a dialler rather than a page, so
 * the Theme gives them neither the hook class nor the arrow.
 *
 * The cost of the syntactic answer is that a Site linking to its own absolute URL — the same
 * origin, written out — is read as external. Nothing at build time can tell the difference.
 */
export function isExternal(href: string): boolean {
  if (!href) return false
  if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return false
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)
}
