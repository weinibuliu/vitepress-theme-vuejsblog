# Anchor an excerpt's links to the Post it came from

An excerpt is a Post's own Markdown, rendered by VitePress with the Post as its page. Its
relative URLs are page-relative because that is what the author wrote against: `#hide-file` is
a heading of this Post, and `./../sibling.md` is a file beside it. VitePress keeps them that
way deliberately — a bare fragment is only slugified, and a relative path is normalised to
start with `./`.

The Blog index and the Feed then show that HTML on a different page, where the same two URLs
mean something else: `#hide-file` scrolls the index, and `./../sibling` walks out of the Post.
So the Theme anchors them back to the Post — `href="/docs/not-ready-for-production#hide-file"`
— before the description reaches the index or the Feed. The Post's own page is untouched: it
renders the body itself, where the author's relative links were right all along.

Only `href` is rewritten, and only when it is page-relative. A root-relative path, an absolute
URL, a `mailto:` and a protocol-relative URL already mean the same thing everywhere. A
hand-written `description` is not rewritten either: it is the Site's own HTML, and the Theme
says it is used as written.

## Considered Options

- **Tell authors to write root-relative links in an intro** (`[hide](/docs/post#hide-file)`).
  Rejected: the excerpt is the Post's own text, and a relative link is the correct spelling
  inside the Post. Asking for a different spelling in the first paragraph than in the rest of
  the file is a rule with no reason a reader can see, and its failure is silent.
- **Rewrite the links in the browser**, in the component that renders the excerpt. Rejected:
  the Feed carries the same string, so RSS readers would keep the broken URLs; and it would
  turn a build-time string into DOM surgery that has to survive hydration.
- **Anchor `src` too.** Rejected: a markdown link becomes a real route, which is what makes the
  Post's URL a valid target, but a relative image does not — the page's images are rewritten by
  Vite's asset pipeline, which a content loader never runs. Anchoring `./shot.png` would only
  disguise it as a URL that resolves. The README says to put such images in `public/`.
- **Anchor a hand-written `description` as well.** Rejected: the excerpt is machine-lifted
  content, so correcting its context is the Theme's business; a `description` is the author's
  own HTML, and the documented promise is that it is used as written.
