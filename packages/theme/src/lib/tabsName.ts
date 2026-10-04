/**
 * The name the Markdown emits and the Theme registers.
 *
 * One string, in a module of its own, because its two ends live on opposite sides of the
 * Theme: `lib/tabs.ts` writes the tag into the page while rendering Markdown, and `index.ts`
 * registers the component that tag has to resolve to. Two different strings would ship a page
 * whose tag resolves to nothing — a failure that shows up as an unresolved component in the
 * browser rather than anywhere near the line that caused it.
 *
 * `index.ts` must not reach for the constant through `lib/tabs.ts` instead: that module
 * imports a markdown-it plugin, which is Node's side of the Theme and has no business in the
 * browser bundle.
 */
export const TABS_COMPONENT = 'BlogTabs'
