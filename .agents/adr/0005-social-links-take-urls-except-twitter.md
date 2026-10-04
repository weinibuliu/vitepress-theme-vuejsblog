# Give every Social Link a full URL, except `twitter`, which takes a Handle

All five platform fields — `x`, `github`, `facebook`, `instagram` and `mail` — take a
complete URL, and `customSocial` states its own link; the Theme builds no platform URL. `twitter`
is deliberately specialised and kept: it takes a Handle only, and the Theme builds
`https://x.com/<handle>`. It is **not** an alias for `x` — it is a field with its own value
semantics — and `x` wins when a Site gives both.

The reason is existing content. Thirty files across `blog/posts/` and `playground/posts/`
write the bare-Handle form (`twitter: '@youyuxi'`), and the reference site blog.vuejs.org
writes the same flat frontmatter, so keeping the Handle preserves that content verbatim.
Because the Handle is author-supplied and the domain is fixed by the field, building the URL
is not guesswork. The alternative — rename `twitter` to `x` and require a URL — would have
been a silent semantic change: `twitter: '@youyuxi'` read as a URL renders `href="@youyuxi"`,
a relative link that fails quietly rather than loudly.

The cost, stated plainly: one platform has two fields with two value semantics, so the docs
and the tests cover it twice.

Boundary decision recorded here too: `url`, an Author's homepage, stays **outside** the
social system. The byline's name and avatar link to it, and it never appears in the icon row.

## Considered Options

- **Hard-rename `twitter` to `x` with no compatibility**, updating all content. Rejected: it
  breaks every existing Post's byline to gain one uniform rule.
- **Keep `twitter` as a deprecated alias with URL semantics.** Rejected: an alias can migrate
  a name but not a meaning. `twitter: '@youyuxi'` would still be accepted and still render a
  broken link, so the alias only admits a silently broken value.
- **Two coexisting semantics** — `twitter` a Handle, `x` a URL — which is what was chosen.
