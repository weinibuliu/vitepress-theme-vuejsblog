# Navigation follows the Blog's sorting key, not the listing's rows

A Post's Next and Previous links point at its neighbours **on the Blog's sorting key**: Next at
the key-greater one — the newer Post under `sort: 'date'`, the higher `order` under
`sort: 'global'` — and Previous at the key-smaller one. Not at the rows above and below it in
the index.

Those two readings agree only while the index runs newest-first, which is the default and
therefore the case nobody thinks to check. There they are opposites: under date ordering the
listing's next row down is the _older_ Post, so an offset of `index + 1` labelled "Next
Article" points away from the Post the words describe. That is what the Theme did — and what
the reference site does not. On blog.vuejs.org the oldest Post is the one carrying "Next
Article", pointing at a newer Post, and the newest carries "Previous Article", pointing at an
older one.

The judgement lives in `resolvePosts`, which is where `date`, `order` and `pin` are read, and it
arrives on each Post as `next` and `prev`. A component renders them; it does not search the
loader's array, and it does not know which way that array runs. Two facts decide a Post's
position — the sorting key and the pin's lift — and both are already `resolvePosts`'s business,
so a neighbour is the same judgement applied one Post along.

`pin` is not part of the key. It lifts a Post to the front of the index; it does not move it in
time. So a pinned Post's neighbours are the ones its date (or `order`) gives it, and a pinned
Post at the top of the index does not become the Previous of everything below it.

A Draft — or an Unplaced Post, which is the same judgement reached by another route — is not in
the Blog, so it cannot be a neighbour: the chain is built from the Blog, and the Posts published
around a skipped candidate link to each other across it. Its own page finds no Post, so it renders
no Next or Previous at all. That is one rule read twice rather than two rules: what the index
leaves out, the navigation leaves out. Dev is the exception the loader already states — it lists
Drafts on purpose, and there they take their place on the chain like any other Post — so this is a
rule about a production build, and `verify-build` asserts it rather than leaving it to follow from
the skip.

`direction` is not part of the key either. `sort` states `{ mode, direction }`, with the string
spelling kept as shorthand for `direction: 'desc'`, and `direction` turns the _index_ round:
under `'asc'` the listing starts at the oldest Post instead of the newest. The links do not come
with it. Otherwise "Next Article" would name the newer Post on one Site and the older one on
another — the same mode-dependent meaning ADR 0006 refuses for `order`. So the subject key turns
round and the tie-breakers do not: `pin`, `order` under date ordering, and the title keep the
directions 0006 gave them, and `'asc'` reads one Blog backwards without redefining what `order`
means.

Under `sort: 'global'` there is no reference site to reproduce, so Next meaning the higher
`order` is a stated choice rather than a copy: the Blog's subject there is `order`, and the
neighbour is the one that subject places after it.

## Considered Options

- **Swap the two offsets and stop.** Rejected as the whole answer. It corrects the default and
  leaves the bug: the direction is still an offset inside a component, tied to the comparator by
  a comment, and any later mode that reorders the array relabels the links in silence. That is
  how this one survived a green test suite.
- **Keep `next = index + 1` and call the labels a listing order.** "The next row down" is a
  coherent rule, but it is not what the reference site's words mean and not what a reader of
  `下一篇` expects, and it makes the words mean less as the listing changes.
- **Derive the neighbours in the component from `post.time`.** Rejected: under `sort: 'global'`
  the Blog's subject is `order`, and the component would re-decide something `resolvePosts`
  already decided, with `pin` and `order` read for the last time somewhere else.
- **Put a `rank` on the Post and look up `rank ± 1`.** A rank still needs the component to know
  which side is Next and to search the array for it. Two fields state the answer once, where the
  order is known.
- **Let `direction` flip the labels with the index.** Rejected: the same Post would be "Next" on
  one Site and "Previous" on another, and the default Site would contradict the reference site
  the Theme exists to reproduce.
