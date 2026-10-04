# End the excerpt at `<!-- more -->`, not at `---`

The Blog index and the Feed show a Post's `description` from frontmatter, or — when it states
none — the text above a marker in its body. That marker now defaults to `<!-- more -->`, and
is stated once per Site as `themeConfig.blog.excerptSeparator`.

The Theme's first default was `---`, because that is what blog.vuejs.org writes. It is a bad
marker for a reason that has nothing to do with the reference site: `---` is also Markdown's
horizontal rule and a table's header row, and the marker is found as a plain substring rather
than on a line of its own. So a Post can end its excerpt inside its own typography — a table's
`| --- | --- |` row, a `---` written mid-sentence, a rule indented four spaces — and the
truncated result looks deliberate enough to survive review. `<!-- more -->` appears in prose
only when the author meant it.

A Post without the marker has **no** excerpt, and the index shows its title alone. That is the
Theme's usual refusal to guess, and it is the point of the marker: a summary is something an
author writes, not something a first paragraph becomes.

The marker is a Site-level default rather than a fixed choice because Blogs already written
the old way exist. `excerptSeparator: '---'` keeps a whole Site, and `excerpt_separator` in a
Post's frontmatter overrides the Site for that one Post — which is what makes migrating a
large Blog a Post-at-a-time job rather than a rewrite. `excerptSeparator: false` switches the
excerpt off, for a list that should carry titles and dates alone — stated as `false` rather
than as a marker nothing carries, because "extract none" is a decision, while a marker no Post
happens to contain is an accident.

## Considered Options

- **Keep `---`, and fall back to the first paragraph when there is none.** Rejected: it
  changes what a Post's list entry says without the author asking, and it makes the marker's
  absence mean two things — "show everything up to here" and "show whatever the Theme picked".
- **Require the marker to be a whole line of `---`.** Rejected _as this decision_: it fixes the
  table row and the mid-sentence rule, but not a `---` inside a fenced code block, so the
  marker would still mean two things. It is a refinement of whichever marker a Site states,
  not a reason to keep `---`.
- **Treat `---` and `<!-- more -->` alike, first one wins.** Rejected: a Post could then still
  be cut short by a rule it wrote for typography, which is the failure being fixed.
- **Key the marker by scope** — a directory or a glob with its own marker. Deferred: VitePress
  takes one `excerpt` per loader and gray-matter's excerpt hook is never told which file it is
  looking at, so a marker per scope means a loader per scope and a rule for overlapping globs.
  The Site-level marker plus the per-Post override covers the migration this decision is
  about; a Site that needs both conventions at once can already say so per Post.
