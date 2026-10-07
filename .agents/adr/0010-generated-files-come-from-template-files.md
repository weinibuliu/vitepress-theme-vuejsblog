# The Scaffolder's generated files come from template files

> [!NOTE]
> The scaffolder has since been folded into the Theme package as its `init` command, so
> the `create-vitepress-theme-vuejsblog` package named below no longer exists. The
> decision this record documents — templates as files under `templates/` — is unchanged.

The `create-vitepress-theme-vuejsblog` package used to build every file it scaffolds
inside `src/files.mjs`: a function per file, an array of `lines.push(…)`, and the prose
a Site's author would end up reading embedded in JavaScript string literals. It now
keeps one file per generated file under `templates/`, named after the file it becomes
plus `.tpl`, and fills them through `%s` placeholders. `files.mjs` is left with the two
things a template cannot say: which answer becomes which value, and which of two blocks
applies.

This reverses a decision the module stated in its own comment — "Everything is generated
rather than copied from a `templates/` directory" — so the reasons it gave are answered
one by one rather than ignored.

- **"Three files carry the caller's own answers."** That was the argument against copying
  a directory of static files, and it is what placeholders are for. The values are still
  decided in JavaScript, by the same functions with the same tests.
- **"A dotfile inside a published tarball is not reliably the dotfile you wrote."** It is
  worse than that, and the comment was right to be suspicious: `npm pack` does not rename
  `.gitignore`, it leaves it out of the tarball entirely. The `.tpl` suffix makes the name
  one rule for every template instead of an exception for one, and
  `__tests__/templates.test.mjs` fails if the bare name comes back.
- **"One source of truth is worth more than a directory listing that looks like a template
  tree."** This is the one that lost. The listing is worth having when the thing being
  listed is prose: a generated README, a config with teaching comments, a CSS file whose
  comments explain which tokens to change. Reading and editing those as files, with syntax
  highlighting and without escaping, is worth more than keeping the file count down.

## Why `%s` and nothing more

A replacement of text with text, in order, with `%%` for a literal percent. Three things
it is deliberately not:

- **Not a conditional syntax.** `%if`/`%else` would be a small language this package owns
  and every future maintainer has to learn, invented to save moving four branches. The
  branches are the _decisions_, and the repository's habit is that decisions are ordinary
  JavaScript with tests — this keeps them there.
- **Not a template engine.** EJS, Handlebars or Mustache bring real conditionals, and a
  runtime dependency to a package that today has none and has to work offline from a
  tarball.
- **Not `String.replace`.** A value is appended, never rescanned, so a Blog title
  containing `%s` cannot shift the placeholder after it. The count of values is checked in
  both directions, so a template that gains a placeholder without gaining a value fails
  on the next scaffold rather than publishing a literal `%s` to a stranger.

A block that exists only in one case — a preset header, a TODO comment where an answer
would go, a README section — is a file under `templates/partials/`, chosen in
`files.mjs`. The prose stays with the prose; only the choice is code.

## Considered Options

- **Keep the files in JavaScript, as they were.** Rejected: it is where the content was
  hardest to read, and the reason the change was asked for.
- **Template only the prose-heavy files, and keep `package.json` and `vercel.json` as
  `JSON.stringify` calls.** Rejected: it leaves a seam a reader has to know rather than
  see — "why is `tsconfig.json` a file and `package.json` not?" The JSON manifests are
  templates too; the values that go into them are `JSON.stringify`d before they are
  substituted, so a package name containing a quote still cannot break the manifest.
- **Name the templates exactly as the files they become, and special-case `.gitignore`.**
  Rejected: the exception would be invisible in the directory listing and easy to undo.

## Consequences

- The package ships a `templates/` directory, so `files` in `package.json` lists it.
  Forgetting that line would pass every test in the repository and ship a scaffolder that
  cannot read its own templates.
- Templates are read through `import.meta.url`, not the working directory, because the CLI
  runs from wherever the caller is standing.
- The renderer substitutes text and nothing else, so **a value carries the whitespace it
  needs**: one that fills whole lines ends with a newline, and one whose absence must
  remove a line is placed where the line starts rather than alone on it. The convention is
  written down in `templates/README.md` because a template read on its own does not show
  it.
- The refactor is meant to be invisible in its output. The old `files.mjs` was kept as an
  oracle during the change and every combination of the answers that reach the generated
  text — 2172 scaffolds, including titles with quotes, backslashes, newlines and literal
  `%s` — was compared byte for byte.
