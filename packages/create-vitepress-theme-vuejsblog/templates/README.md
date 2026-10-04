# The generated Site's files

One template per file a scaffold writes, named after the file it becomes plus `.tpl`:
`templates/.vitepress/config.ts.tpl` is written to `.vitepress/config.ts`. `files.mjs`
maps answers to values; these files are the text that ends up in a stranger's blog.

## Why the suffix, rather than the output name exactly

A file called `.gitignore` inside a published tarball is not the file you wrote — `npm
pack` leaves it out entirely. `.gitignore.tpl` ships, so `.tpl` is on _every_ template
rather than being an exception for one of them. `__tests__/templates.test.mjs` checks
that the bare name never comes back.

## Placeholders

`%s` is the next value, in order; `%%` is a literal `%`. Nothing else exists: no
conditionals, no expressions, no includes. A `%` that begins neither `%s` nor `%%` is an
error, so a CSS `100%` typed here has to be written `100%%` — loudly, not silently. The
number of values is checked in both directions. See `src/render.mjs`.

Which block applies — a preset header or the default one, a TODO comment or a live
setting — is decided in `files.mjs`. When a block is prose, it is a file under
`templates/partials/` rather than a string built in JavaScript.

## Whitespace

The renderer substitutes text and does nothing else, so a value carries the whitespace
it needs and the template keeps the whitespace it always has. Three shapes cover every
case, and each one is written out below with a line from the template that uses it:

- **Whole lines.** The value sits where its first line starts and ends with the newline
  that ends its last one. The site-level description (`%s  lang: %s,`) and the group of
  `themeConfig.blog` fields (`%s      logo: '/logo.svg',`).
- **A blank-line-separated region.** The value ends with the blank line that follows it,
  and the template keeps the blank line before it. The README's optional sections
  (`%s## Learn more`) — the empty value has to collapse without leaving a gap.
- **The end of a file.** The value starts with the blank line that separates it, and the
  template keeps the newline that ends the file. `about.md`'s byline, the one optional
  thing no line follows.

Never put an optional value alone on a line of its own: substituting nothing leaves the
blank line behind, and substituting a block adds a break the value already has.

Every template and partial ends with exactly one newline.
