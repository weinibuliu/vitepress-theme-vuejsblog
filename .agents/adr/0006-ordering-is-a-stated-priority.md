# Order by stated priorities, and refuse to publish when two Posts state the same one

A Post may carry `pin`, which lifts it above every unpinned Post and marks it with a badge,
and `order`, a priority that settles one day under `sort: 'date'` or the whole Blog under
`sort: 'global'`. Both are numbers, ordered descending, and both may be stated by several
Posts — but **not with the same value**. Two Posts stating the same `pin`, or two rival
`order`s, leave the Theme with no priority to order them by, so their titles decide. Dev
warns about that; a production build throws and names the files.

The reason is what the fallback does rather than what it is. Ordering two Posts by title is
deterministic, which is exactly the danger: the Blog publishes in an order nobody chose,
nothing announces it, and it is stable enough to survive a review. A loud failure at build
time is the only moment an author is still holding the decision.

`pin` is a **weight, not a value**. The badge says _that_ a Post is pinned and never prints
the number, so `pin: true` — shorthand for `0`, the lowest weight — and `pin: 10` read the
same to a reader. The number exists to rank the pinned Post against other pinned Posts, and
that ranking is the Theme's business rather than the reader's. For the same reason, `false`
is not a weight of zero: it means "not pinned", while `0` means "pinned, last".

Under `sort: 'global'`, `order` is the Blog's primary key and is therefore required. A Post
that states none has no position, so it leaves the Blog and the Feed — and, as with a Draft,
it is left out of the index in a production build only: dev lists it, at the end, and says
why. It still renders as a page. The Theme's judgement is about the Blog, not about the
file, and it has been the same judgement since Drafts and Undated Posts.

Two boundary decisions are recorded here as well. **`order` changes rank with the mode, not
meaning**: date sorting makes the date the Blog's subject and `order` its tie-breaker,
global sorting makes `order` the subject and the date its tie-breaker, and the title is the
last resort in both. And **the fallback direction is one direction**: where nothing else
separates two Posts, the title sorts ascending, which is what the Theme already did for
Posts sharing a day.

## Considered Options

- **Order collisions by title, silently, in every mode.** Rejected: it publishes an order no
  one chose, and the failure is invisible in the diff and in the build log.
- **Warn in both dev and production, and publish anyway.** Rejected: a warning in a build log
  nobody reads is the silent fallback with extra steps. The two audiences are different —
  dev is where a half-written Blog is normal, production is where the author has decided.
- **Warn only, never fail** (the Theme's treatment of an unparseable `date`, which skips the
  Post). Rejected: the failure modes differ. A Post with no date leaves the Blog, which is
  visible immediately; two Posts sharing a priority stay in the Blog, in an order that looks
  deliberate.
- **Show the pin's weight on the badge** (`pin: 10`). Rejected: it exposes sorting
  bookkeeping as content, and makes `pin: true` render a meaningless `0`.
- **Serve an Unplaced Post's page as a 404 in a production build.** Rejected: it would make
  the Theme's answer to "is this in the Blog?" a rendering decision rather than a listing
  one, and it would break a URL that worked in dev. Drafts set the precedent: the Blog does
  not list it, the Site still serves it.
- **Let `order` mean the same rank in both modes** — always a global priority, with the date
  breaking ties. Rejected: it would make `order` required in every mode, because a Blog
  ordered by it cannot leave a Post without one. Date ordering must stay the default that a
  Site falls into by saying nothing.
