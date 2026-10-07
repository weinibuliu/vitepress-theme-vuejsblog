/**
 * This Site's own styling, and the place to change how it looks.
 *
 * The Theme paints with VitePress's own custom properties, so overriding one
 * token moves every surface that reads it.
 */

<% if (preset === 'default') { %>/**
 * The brand palette is the Theme's own default: VitePress's green scale, which
 * is already defined per mode and already contrast-checked. For one of the Theme's
 * four presets instead, uncomment the import below — the names are `emerald`,
 * `rose`, `violet` and `amber`.
 *
 * Importing a preset is worth preferring over pasting hex values: it is a file
 * inside the Theme's package, so it stays correct when the Theme is upgraded.
 */

/* @import '<%= brandPresetDir %>/emerald.css'; */
<% } else { %>/**
 * The brand palette, imported from the Theme's `<%= preset %>` preset. It sets
 * only the brand tokens, so the layout, background and typography are untouched.
 * The other names are `emerald`, `rose`, `violet` and `amber`; the default green
 * needs no import.
 */

@import '<%= brandPresetDir %>/<%= preset %>.css';
<% } %>
/**
 * Your own colours, instead of a preset. Both modes need their own value: a hue that
 * reads well on white is usually too dark on near-black.
 *
 * Pick them by contrast, not by eye. `--vp-c-brand-1` is used as text — links, the
 * "Read more →" on every Post, the byline — so it needs >= 4.5:1 against the
 * background. `--vp-c-brand-3` is easy to forget: the Theme never uses it, but
 * VitePress's `:::tip` and `:::note` callouts do.
 */
/*
:root {
  --vp-c-brand-1: #047857;
  --vp-c-brand-2: #059669;
  --vp-c-brand-3: #10b981;
  --vp-c-brand-soft: rgba(16, 185, 129, 0.16);
  --vp-c-brand: var(--vp-c-brand-1);
}

.dark {
  --vp-c-brand-1: #34d399;
  --vp-c-brand-2: #6ee7b7;
  --vp-c-brand-3: #10b981;
  --vp-c-brand-soft: rgba(16, 185, 129, 0.16);
  --vp-c-brand: var(--vp-c-brand-1);
}
*/
