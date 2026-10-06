# The generated Site's files

One template per file a scaffold writes, named after the file it becomes plus `.tpl`:
`templates/.vitepress/config.ts.tpl` is written to `.vitepress/config.ts`. `init.mjs`
decides what each answer and derived value is; these files are the text that ends up in
a stranger's blog.

## Why the suffix, rather than the output name exactly

A file called `.gitignore` inside a published tarball is not the file you wrote — `npm
pack` leaves it out entirely. `.gitignore.tpl` ships, so `.tpl` is on _every_ template
rather than being an exception for one of them. `__tests__/templates.test.mjs` checks
that the bare name never comes back.

## The engine

Templates are [Eta](https://eta.js.org). `<%= value %>` writes a value, `<% if (...) {
%>` … `<% } %>` decides what a Site says when that value is missing. There is no
partial-include: each template is the whole file, so a reader never has to follow a
second file to know what a config says. `src/templates.mjs` owns the one `Eta` instance.

Values are not escaped for you (`autoEscape: false`), because a title is raw Markdown in
`about.md`, a single-quoted TypeScript literal in `config.ts` and XML text in `logo.svg`.
Passing it through three different escapes is the template's job, and the helpers for it
are in `src/values.mjs` and in scope: `<%= quote(title) %>`, `<%= json(packageName) %>`,
`<%= xml(title) %>`. `scaffold` puts the raw answers, the derived strings and those
helpers in one data object.

## Whitespace

`autoTrim: false`: a tag emits nothing, and everything around it — including newlines —
is kept exactly as written. That makes the rules simple but unforgiving:

- A conditional that guards a whole line puts its tag at the start of the line and the
  line's newline inside the branch, so an inactive branch leaves no blank line behind.
- A conditional that guards a block ends the branch with the blank line that follows it,
  so the next heading sits two newlines away whether the branch ran or not.
- The end of a file is ordinary text: every template ends with exactly one newline, and
  `__tests__/scaffold.test.mjs` checks that every generated file does too.
