import { describe, expect, it } from 'vitest'
import type { ContentData } from 'vitepress'
import { resolvePosts } from '../src/lib/resolvePosts.js'
import { withDefaults } from '../src/lib/config.js'
import type { Post, ResolvedBlogConfig } from '../src/lib/types.js'

const SRC_DIR = '/site'

function candidate(
  path: string,
  frontmatter: Record<string, unknown>,
  extra: Partial<ContentData> = {}
): ContentData {
  const url = '/' + path.replace(/\.md$/, '')
  return {
    url,
    src: `${SRC_DIR}/${path}`,
    html: undefined,
    excerpt: undefined,
    frontmatter,
    ...extra
  }
}

function config(
  overrides: Partial<ResolvedBlogConfig> = {}
): ResolvedBlogConfig {
  return {
    title: 'Test Blog',
    author: 'Site Default',
    posts: 'posts/*.md',
    nav: [],
    footer: [],
    sort: { mode: 'date', direction: 'desc' },
    ...overrides
  }
}

function run(raw: ContentData[], overrides: Partial<ResolvedBlogConfig> = {}) {
  return resolvePosts(raw, config(overrides), { srcDir: SRC_DIR })
}

function byTitle(posts: Post[]): Record<string, Post> {
  return Object.fromEntries(posts.map((post) => [post.title, post]))
}

describe('resolvePosts — what joins the Blog', () => {
  it('includes a candidate with a usable date', () => {
    const { posts, skipped } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01' })
    ])
    expect(posts).toHaveLength(1)
    expect(skipped).toHaveLength(0)
  })

  it('leaves out a candidate with no date, and says why', () => {
    const { posts, skipped } = run([candidate('posts/a.md', { title: 'A' })])
    expect(posts).toHaveLength(0)
    expect(skipped).toEqual([
      { url: '/posts/a', path: 'posts/a.md', reasons: ['no date'] }
    ])
  })

  it('leaves out a candidate whose date cannot be parsed, quoting the value', () => {
    const { skipped } = run([
      candidate('posts/a.md', { title: 'A', date: 'last Tuesday' })
    ])
    expect(skipped[0].reasons).toEqual(['unparseable date: last Tuesday'])
  })

  it('leaves out a draft, and says why', () => {
    const { posts, skipped } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', draft: true })
    ])
    expect(posts).toHaveLength(0)
    expect(skipped[0].reasons).toEqual(['draft: true'])
  })

  it('reports both reasons when a candidate is a draft and undated', () => {
    const { skipped } = run([
      candidate('posts/a.md', { title: 'A', draft: true })
    ])
    expect(skipped[0].reasons).toEqual(['draft: true', 'no date'])
  })

  it('treats only the literal true as a draft', () => {
    const { posts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', draft: 'yes' })
    ])
    expect(posts).toHaveLength(1)
  })

  it('leaves out an excluded file, and says why', () => {
    // `scanExcluded` keeps the file out of the Site's pages; this is the other half, and
    // the half that stays live in dev, because a data loader re-runs on every edit.
    const { posts, skipped } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', exclude: true })
    ])
    expect(posts).toHaveLength(0)
    expect(skipped[0].reasons).toEqual(['exclude: true'])
  })

  it('reports an excluded file as both excluded and undated', () => {
    const { skipped } = run([
      candidate('posts/a.md', { title: 'A', exclude: true })
    ])
    expect(skipped[0].reasons).toEqual(['exclude: true', 'no date'])
  })

  it('treats only the literal true as excluded', () => {
    const { posts } = run([
      candidate('posts/a.md', {
        title: 'A',
        date: '2024-01-01',
        exclude: 'true'
      })
    ])
    expect(posts).toHaveLength(1)
  })

  it('leaves out a `layout: page` file, and says nothing about it', () => {
    // `layout` is VitePress's own vocabulary, and the Theme's Layout dispatches on it. A
    // `layout: page` file inside Collection Scope is a Page, not a Post: it was never meant
    // to state a `date`, so reporting one missing would be noise.
    const { posts, skipped } = run([
      candidate('posts/about.md', { layout: 'page', title: 'About' })
    ])
    expect(posts).toHaveLength(0)
    expect(skipped).toHaveLength(0)
  })

  it('leaves out `layout: home` too, which Layout renders as the Blog index', () => {
    const { posts, skipped } = run([
      candidate('posts/index.md', { layout: 'home' })
    ])
    expect(posts).toHaveLength(0)
    expect(skipped).toHaveLength(0)
  })

  it('leaves a Page out even when it carries a date', () => {
    const { posts } = run([
      candidate('posts/about.md', {
        layout: 'page',
        title: 'About',
        date: '2024-01-01'
      })
    ])
    expect(posts).toHaveLength(0)
  })

  it('treats any other layout as a Post, since Layout renders it as one', () => {
    const { posts } = run([
      candidate('posts/a.md', {
        layout: 'doc',
        title: 'A',
        date: '2024-01-01'
      })
    ])
    expect(posts.map((post) => post.title)).toEqual(['A'])
  })

  it('keeps a Page out when dev lists Unplaced Posts', () => {
    // The same Page must not return through the loader's second, relaxed pass.
    const { posts, skipped } = resolvePosts(
      [candidate('posts/about.md', { layout: 'page', draft: true })],
      config({ sort: { mode: 'global', direction: 'desc' } }),
      { srcDir: SRC_DIR, listUnplaced: true }
    )
    expect(posts).toHaveLength(0)
    expect(skipped).toHaveLength(0)
  })

  it('is the *only* thing a dev build relaxes: an undated candidate stays out', () => {
    // This mirrors what `posts.data.ts` does in dev — it strips `draft: true` and
    // resolves again. An Undated candidate must remain outside the Blog even then,
    // because the Blog is ordered by date and there is nothing to order it by.
    const draft = candidate('posts/draft.md', {
      title: 'Draft',
      date: '2024-01-01',
      draft: true
    })
    const undated = candidate('posts/undated.md', { title: 'Undated' })

    const { posts } = run([
      { ...draft, frontmatter: { title: 'Draft', date: '2024-01-01' } },
      undated
    ])

    expect(posts.map((post) => post.title)).toEqual(['Draft'])
  })
})

describe('resolvePosts — ordering', () => {
  it('sorts newest first', () => {
    const { posts } = run([
      candidate('posts/old.md', { title: 'Old', date: '2020-01-01' }),
      candidate('posts/new.md', { title: 'New', date: '2024-01-01' }),
      candidate('posts/mid.md', { title: 'Mid', date: '2022-01-01' })
    ])
    expect(posts.map((post) => post.title)).toEqual(['New', 'Mid', 'Old'])
  })

  it('breaks ties deterministically by title', () => {
    const { posts } = run([
      candidate('posts/b.md', { title: 'B', date: '2024-01-01' }),
      candidate('posts/a.md', { title: 'A', date: '2024-01-01' })
    ])
    expect(posts.map((post) => post.title)).toEqual(['A', 'B'])
  })
})

describe('resolvePosts — pinned Posts', () => {
  it('puts a pinned Post first, however old it is', () => {
    const { posts } = run([
      candidate('posts/new.md', { title: 'New', date: '2024-01-01' }),
      candidate('posts/old.md', { title: 'Old', date: '2020-01-01', pin: true })
    ])
    expect(posts.map((post) => post.title)).toEqual(['Old', 'New'])
  })

  it('reads `pin: true` as the lowest weight, so a numbered pin outranks it', () => {
    const { posts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', pin: true }),
      candidate('posts/b.md', { title: 'B', date: '2024-01-01', pin: 3 })
    ])
    expect(posts.map((post) => post.title)).toEqual(['B', 'A'])
    expect(posts.map((post) => post.pin)).toEqual([3, 0])
  })

  it('orders the pinned Posts by weight, descending', () => {
    const { posts } = run([
      candidate('posts/low.md', { title: 'Low', date: '2024-01-01', pin: 1 }),
      candidate('posts/high.md', { title: 'High', date: '2020-01-01', pin: 9 }),
      candidate('posts/mid.md', { title: 'Mid', date: '2022-01-01', pin: 5 })
    ])
    expect(posts.map((post) => post.title)).toEqual(['High', 'Mid', 'Low'])
  })

  it('orders the pinned Posts among themselves by the Blog’s own rules', () => {
    const { posts } = run([
      candidate('posts/early.md', {
        title: 'Early',
        date: '2020-01-01',
        pin: 1
      }),
      candidate('posts/late.md', { title: 'Late', date: '2024-01-01', pin: 1 })
    ])
    expect(posts.map((post) => post.title)).toEqual(['Late', 'Early'])
  })

  it('treats `pin: false` as no pin at all, where `pin: 0` is a real weight', () => {
    const { posts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', pin: false }),
      candidate('posts/b.md', { title: 'B', date: '2024-01-01', pin: 0 })
    ])
    expect(posts.map((post) => post.title)).toEqual(['B', 'A'])
    expect(posts.map((post) => post.pin)).toEqual([0, undefined])
  })

  it('ignores a pin that states no weight', () => {
    const { posts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', pin: 'yes' })
    ])
    expect(posts[0].pin).toBeUndefined()
  })
})

describe('resolvePosts — `order`', () => {
  it('settles Posts published the same day, descending', () => {
    const { posts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', order: 1 }),
      candidate('posts/b.md', { title: 'B', date: '2024-01-01', order: 5 })
    ])
    expect(posts.map((post) => post.title)).toEqual(['B', 'A'])
  })

  it('stays out of it across days when the Blog is ordered by date', () => {
    const { posts } = run([
      candidate('posts/new.md', { title: 'New', date: '2024-01-01', order: 1 }),
      candidate('posts/old.md', { title: 'Old', date: '2020-01-01', order: 99 })
    ])
    expect(posts.map((post) => post.title)).toEqual(['New', 'Old'])
  })

  it('puts a stated order ahead of none on the same day', () => {
    const { posts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01' }),
      candidate('posts/b.md', { title: 'B', date: '2024-01-01', order: 0 })
    ])
    expect(posts.map((post) => post.title)).toEqual(['B', 'A'])
  })

  it('ignores an order that is not a number, since `order` takes no shorthand', () => {
    const { posts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', order: '5' }),
      candidate('posts/b.md', { title: 'B', date: '2024-01-01', order: true })
    ])
    expect(posts.map((post) => post.order)).toEqual([undefined, undefined])
  })
})

describe('resolvePosts — sort: global', () => {
  const global: Partial<ResolvedBlogConfig> = {
    sort: { mode: 'global', direction: 'desc' }
  }

  it('orders the whole Blog by `order`, across days', () => {
    const { posts } = run(
      [
        candidate('posts/new.md', {
          title: 'New',
          date: '2024-01-01',
          order: 1
        }),
        candidate('posts/old.md', {
          title: 'Old',
          date: '2020-01-01',
          order: 9
        })
      ],
      global
    )
    expect(posts.map((post) => post.title)).toEqual(['Old', 'New'])
  })

  it('falls back to the date when two Posts state the same order', () => {
    const { posts } = run(
      [
        candidate('posts/old.md', {
          title: 'Old',
          date: '2020-01-01',
          order: 3
        }),
        candidate('posts/new.md', {
          title: 'New',
          date: '2024-01-01',
          order: 3
        })
      ],
      global
    )
    expect(posts.map((post) => post.title)).toEqual(['New', 'Old'])
  })

  it('still puts pinned Posts first, by weight, whatever they state as `order`', () => {
    const { posts } = run(
      [
        candidate('posts/a.md', { title: 'A', date: '2024-01-01', order: 99 }),
        candidate('posts/p.md', {
          title: 'P',
          date: '2020-01-01',
          order: 1,
          pin: 1
        })
      ],
      global
    )
    expect(posts.map((post) => post.title)).toEqual(['P', 'A'])
  })

  it('leaves out a Post that states no order, and says why', () => {
    const { posts, skipped } = run(
      [candidate('posts/a.md', { title: 'A', date: '2024-01-01' })],
      global
    )
    expect(posts).toHaveLength(0)
    expect(skipped).toEqual([
      {
        url: '/posts/a',
        path: 'posts/a.md',
        reasons: ["no order, and sort: 'global'"]
      }
    ])
  })

  it('lists an Unplaced Post when dev asks for it, after the placed ones', () => {
    // This mirrors the two passes `posts.data.ts` makes in dev: the strict one is what the
    // author is told about, the relaxed one is what the index renders.
    const raw = [
      candidate('posts/placed.md', {
        title: 'Placed',
        date: '2020-01-01',
        order: 1
      }),
      candidate('posts/unplaced.md', { title: 'Unplaced', date: '2024-01-01' })
    ]

    const strict = resolvePosts(raw, config(global), { srcDir: SRC_DIR })
    expect(strict.posts.map((post) => post.title)).toEqual(['Placed'])
    expect(strict.skipped[0].path).toBe('posts/unplaced.md')

    const listed = resolvePosts(raw, config(global), {
      srcDir: SRC_DIR,
      listUnplaced: true
    })
    expect(listed.posts.map((post) => post.title)).toEqual([
      'Placed',
      'Unplaced'
    ])
  })
})

describe('resolvePosts — navigation', () => {
  const three = [
    candidate('posts/old.md', { title: 'Old', date: '2020-01-01' }),
    candidate('posts/new.md', { title: 'New', date: '2024-01-01' }),
    candidate('posts/mid.md', { title: 'Mid', date: '2022-01-01' })
  ]

  it('points Next at the newer Post and Previous at the older one', () => {
    // The reference site's convention, and the whole point of the chain being here rather than
    // in a component: the Blog lists newest first, so the row below a Post is the *older* one.
    const mid = byTitle(run(three).posts).Mid
    expect(mid.next).toEqual({ url: '/posts/new', title: 'New' })
    expect(mid.prev).toEqual({ url: '/posts/old', title: 'Old' })
  })

  it('leaves each end of the Blog with one neighbour', () => {
    const found = byTitle(run(three).posts)
    expect(found.New.next).toBeUndefined()
    expect(found.New.prev).toEqual({ url: '/posts/mid', title: 'Mid' })
    expect(found.Old.prev).toBeUndefined()
    expect(found.Old.next).toEqual({ url: '/posts/mid', title: 'Mid' })
  })

  it('gives a lone Post neither neighbour', () => {
    const { posts } = run([
      candidate('posts/only.md', { title: 'Only', date: '2024-01-01' })
    ])
    expect(posts[0].next).toBeUndefined()
    expect(posts[0].prev).toBeUndefined()
  })

  it('closes the chain over a Draft, which the Blog leaves out', () => {
    // A Draft is not in the Blog, so it is nobody's neighbour: the Posts published around it
    // link to each other across it. Its own page finds no Post either, which is what leaves it
    // with no links at all.
    const { posts, skipped } = run([
      candidate('posts/new.md', { title: 'New', date: '2024-01-01' }),
      candidate('posts/draft.md', {
        title: 'Draft',
        date: '2022-01-01',
        draft: true
      }),
      candidate('posts/old.md', { title: 'Old', date: '2020-01-01' })
    ])
    expect(skipped.map((post) => post.path)).toEqual(['posts/draft.md'])
    expect(posts.map((post) => post.title)).toEqual(['New', 'Old'])
    expect(posts[0].prev).toEqual({ url: '/posts/old', title: 'Old' })
    expect(posts[1].next).toEqual({ url: '/posts/new', title: 'New' })
  })

  it('keeps a pinned Post in the key rather than at the end of the chain', () => {
    // `pin` lifts a Post to the front of the index; it does not move it in time. The pinned
    // Post is first in the Blog and still has both neighbours.
    const { posts } = run([
      candidate('posts/new.md', { title: 'New', date: '2024-01-01' }),
      candidate('posts/mid.md', {
        title: 'Mid',
        date: '2022-01-01',
        pin: true
      }),
      candidate('posts/old.md', { title: 'Old', date: '2020-01-01' })
    ])
    expect(posts.map((post) => post.title)).toEqual(['Mid', 'New', 'Old'])
    expect(posts[0].next).toEqual({ url: '/posts/new', title: 'New' })
    expect(posts[0].prev).toEqual({ url: '/posts/old', title: 'Old' })
  })

  it('reads the same way when the listing is turned round', () => {
    // `direction` moves the index and nothing else: "Next Article" still names the newer Post,
    // so turning a Blog round does not relabel its links.
    const { posts } = run(three, {
      sort: { mode: 'date', direction: 'asc' }
    })
    expect(posts.map((post) => post.title)).toEqual(['Old', 'Mid', 'New'])
    expect(posts[1].next).toEqual({ url: '/posts/new', title: 'New' })
    expect(posts[1].prev).toEqual({ url: '/posts/old', title: 'Old' })
  })

  it('follows `order`, not the index, under global sorting', () => {
    const { posts } = run(
      [
        candidate('posts/a.md', { title: 'A', date: '2024-01-01', order: 1 }),
        candidate('posts/b.md', { title: 'B', date: '2020-01-01', order: 3 }),
        candidate('posts/c.md', { title: 'C', date: '2022-01-01', order: 2 })
      ],
      { sort: { mode: 'global', direction: 'asc' } }
    )
    // The Blog's subject is `order` here, so the chain runs B → C → A however the index does.
    expect(posts.map((post) => post.title)).toEqual(['A', 'C', 'B'])
    expect(posts[1].next).toEqual({ url: '/posts/b', title: 'B' })
    expect(posts[1].prev).toEqual({ url: '/posts/a', title: 'A' })
  })

  it('orders the same day by `order` before it decides a neighbour', () => {
    // The neighbour is the key's neighbour, ties included: two Posts on one day are ordered by
    // the same `order` the Blog index uses.
    const { posts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', order: 2 }),
      candidate('posts/b.md', { title: 'B', date: '2024-01-01', order: 1 }),
      candidate('posts/c.md', { title: 'C', date: '2020-01-01' })
    ])
    expect(byTitle(posts).B.next).toEqual({ url: '/posts/a', title: 'A' })
    expect(byTitle(posts).A.prev).toEqual({ url: '/posts/b', title: 'B' })
    expect(byTitle(posts).A.next).toBeUndefined()
  })
})

describe('resolvePosts — stated priorities that collide', () => {
  it('reports two Posts pinned with the same weight, even on different days', () => {
    // The pin is what makes them a group, so stating it twice is reported whether or not
    // the dates happen to settle this particular pair.
    const { posts, conflicts } = run([
      candidate('posts/b.md', { title: 'B', date: '2024-01-01', pin: 1 }),
      candidate('posts/a.md', { title: 'A', date: '2020-01-01', pin: 1 })
    ])
    expect(posts.map((post) => post.title)).toEqual(['B', 'A'])
    // Paths read in Blog order, so a conflict names the Posts as they render.
    expect(conflicts).toEqual([
      { field: 'pin', value: 1, paths: ['posts/b.md', 'posts/a.md'] }
    ])
  })

  it('falls back to the title once pin and date both tie', () => {
    const { posts, conflicts } = run([
      candidate('posts/b.md', { title: 'B', date: '2024-01-01', pin: 1 }),
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', pin: 1 })
    ])
    expect(posts.map((post) => post.title)).toEqual(['A', 'B'])
    expect(conflicts).toHaveLength(1)
  })

  it('reports two Posts on one day stating the same order', () => {
    const { conflicts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', order: 2 }),
      candidate('posts/b.md', { title: 'B', date: '2024-01-01', order: 2 })
    ])
    expect(conflicts).toEqual([
      { field: 'order', value: 2, paths: ['posts/a.md', 'posts/b.md'] }
    ])
  })

  it('does not report one order on two days, where the date decides first', () => {
    const { conflicts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', order: 2 }),
      candidate('posts/b.md', { title: 'B', date: '2020-01-01', order: 2 })
    ])
    expect(conflicts).toEqual([])
  })

  it('does report that pair once `order` is what orders the whole Blog', () => {
    const { conflicts } = run(
      [
        candidate('posts/a.md', { title: 'A', date: '2024-01-01', order: 2 }),
        candidate('posts/b.md', { title: 'B', date: '2020-01-01', order: 2 })
      ],
      { sort: { mode: 'global', direction: 'desc' } }
    )
    expect(conflicts).toEqual([
      { field: 'order', value: 2, paths: ['posts/a.md', 'posts/b.md'] }
    ])
  })

  it('reports a pin collision and an order collision separately', () => {
    const { conflicts } = run([
      candidate('posts/a.md', {
        title: 'A',
        date: '2024-01-01',
        pin: 1,
        order: 2
      }),
      candidate('posts/b.md', {
        title: 'B',
        date: '2024-01-01',
        pin: 1,
        order: 2
      })
    ])
    expect(conflicts.map((conflict) => conflict.field)).toEqual([
      'pin',
      'order'
    ])
  })

  it('does not report Posts that merely share a day, or state no weight', () => {
    const { conflicts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01' }),
      candidate('posts/b.md', { title: 'B', date: '2024-01-01' })
    ])
    expect(conflicts).toEqual([])
  })

  it('groups three Posts that all state the same weight', () => {
    const { conflicts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01', pin: 0 }),
      candidate('posts/b.md', { title: 'B', date: '2024-01-01', pin: true }),
      candidate('posts/c.md', { title: 'C', date: '2024-01-01', pin: 0 })
    ])
    expect(conflicts).toEqual([
      {
        field: 'pin',
        value: 0,
        paths: ['posts/a.md', 'posts/b.md', 'posts/c.md']
      }
    ])
  })
})

describe('resolvePosts — the Post it produces', () => {
  it('carries the URL, source path, display date and ISO date', () => {
    const { posts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-09-01' })
    ])
    expect(posts[0]).toMatchObject({
      url: '/posts/a',
      path: 'posts/a.md',
      date: 'September 1, 2024',
      iso: '2024-09-01'
    })
  })

  it('prefers frontmatter description over the rendered excerpt', () => {
    const { posts } = run([
      candidate(
        'posts/a.md',
        { title: 'A', date: '2024-01-01', description: 'Written by hand' },
        { excerpt: '<p>Scraped</p>' }
      )
    ])
    expect(posts[0].description).toBe('Written by hand')
  })

  it('keeps a stated description when the loader extracted no excerpt', () => {
    // `excerptSeparator: false` leaves every Post in this shape, so the list still has a
    // way to fill the space under a title.
    const { posts } = run([
      candidate('posts/a.md', {
        title: 'A',
        date: '2024-01-01',
        description: 'Written by hand'
      })
    ])
    expect(posts[0].description).toBe('Written by hand')
  })

  it('anchors an excerpt to the Post, and leaves a description as written', () => {
    // The excerpt was rendered with the Post as its page; the index and the Feed are not that
    // page, so its relative links are re-anchored. A `description` is the Site's own text.
    const { posts } = run([
      candidate(
        'posts/a.md',
        { title: 'A', date: '2024-01-01' },
        { excerpt: '<p><a href="#sec">sec</a></p>' }
      ),
      candidate('posts/b.md', {
        title: 'B',
        date: '2024-01-02',
        description: '<a href="#sec">sec</a>'
      })
    ])
    expect(posts.find((post) => post.path === 'posts/a.md')?.description).toBe(
      '<p><a href="/posts/a#sec">sec</a></p>'
    )
    expect(posts.find((post) => post.path === 'posts/b.md')?.description).toBe(
      '<a href="#sec">sec</a>'
    )
  })

  it('falls back to the rendered excerpt', () => {
    const { posts } = run([
      candidate(
        'posts/a.md',
        { title: 'A', date: '2024-01-01' },
        { excerpt: '  <p>Scraped</p>  ' }
      )
    ])
    expect(posts[0].description).toBe('<p>Scraped</p>')
  })

  it('ignores a whitespace-only description', () => {
    const { posts } = run([
      candidate(
        'posts/a.md',
        { title: 'A', date: '2024-01-01', description: '   ' },
        { excerpt: '<p>Scraped</p>' }
      )
    ])
    expect(posts[0].description).toBe('<p>Scraped</p>')
  })

  it('collects string tags and drops anything else', () => {
    const { posts } = run([
      candidate('posts/a.md', {
        title: 'A',
        date: '2024-01-01',
        tags: ['vue', 7, 'ssr']
      })
    ])
    expect(posts[0].tags).toEqual(['vue', 'ssr'])
  })

  it('defaults tags to an empty list', () => {
    const { posts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01' })
    ])
    expect(posts[0].tags).toEqual([])
  })

  it('tolerates a missing title', () => {
    const { posts } = run([candidate('posts/a.md', { date: '2024-01-01' })])
    expect(posts[0].title).toBe('')
  })
})

describe('resolvePosts — Authors', () => {
  it('falls back to the Site’s Default Author', () => {
    const { posts } = run([
      candidate('posts/a.md', { title: 'A', date: '2024-01-01' })
    ])
    expect(posts[0].authors).toEqual([{ name: 'Site Default', socials: [] }])
  })

  it('prefers the flat frontmatter form used by the reference site', () => {
    const { posts } = run([
      candidate('posts/a.md', {
        title: 'A',
        date: '2024-01-01',
        author: 'Evan You',
        gravatar: 'abc123',
        twitter: '@youyuxi'
      })
    ])
    expect(posts[0].authors).toEqual([
      {
        name: 'Evan You',
        avatar: 'https://gravatar.com/avatar/abc123',
        socials: [
          {
            link: 'https://x.com/youyuxi',
            text: '@youyuxi',
            platform: 'x',
            icon: { name: 'simple-icons:x' },
            external: true
          }
        ]
      }
    ])
  })

  it('reads every Social Link from the flat frontmatter form', () => {
    const { posts } = run([
      candidate('posts/a.md', {
        title: 'A',
        date: '2024-01-01',
        author: 'Evan You',
        x: 'https://x.com/youyuxi',
        github: { url: 'https://github.com/yyx990803', label: 'yyx990803' },
        mail: 'me@example.com'
      })
    ])
    const [socials] = posts[0].authors.map((author) => author.socials)
    expect(socials.map((social) => social.link)).toEqual([
      'https://x.com/youyuxi',
      'https://github.com/yyx990803',
      'mailto:me@example.com'
    ])
    expect(socials[1].label).toBe('yyx990803')
  })

  it('reads a Custom Social Link from the flat frontmatter form', () => {
    const { posts } = run([
      candidate('posts/a.md', {
        title: 'A',
        date: '2024-01-01',
        author: 'Evan You',
        customSocial: {
          icon: '/m.svg',
          label: 'Mastodon',
          link: 'https://m.example/@a'
        }
      })
    ])
    expect(posts[0].authors[0].socials).toEqual([
      {
        link: 'https://m.example/@a',
        text: 'Mastodon',
        label: 'Mastodon',
        icon: { src: '/m.svg' },
        external: true
      }
    ])
  })

  it('reads several Custom Social Links from the flat frontmatter form', () => {
    const { posts } = run([
      candidate('posts/a.md', {
        title: 'A',
        date: '2024-01-01',
        author: 'Evan You',
        customSocial: [
          { icon: '/one.svg', label: 'One', link: '/1' },
          { icon: { svg: '<svg></svg>' }, label: 'Two', link: '/2' }
        ]
      })
    ])
    expect(posts[0].authors[0].socials).toEqual([
      {
        link: '/1',
        text: 'One',
        label: 'One',
        icon: { src: '/one.svg' },
        external: false
      },
      {
        link: '/2',
        text: 'Two',
        label: 'Two',
        icon: { svg: '<svg></svg>' },
        external: false
      }
    ])
  })

  it('accepts the nested form, which is the only way to co-author', () => {
    const { posts } = run([
      candidate('posts/a.md', {
        title: 'A',
        date: '2024-01-01',
        author: [
          { name: 'One', github: 'https://github.com/one' },
          { name: 'Two' }
        ]
      })
    ])
    expect(posts[0].authors).toEqual([
      {
        name: 'One',
        socials: [
          {
            link: 'https://github.com/one',
            text: 'github.com/one',
            platform: 'github',
            icon: { name: 'simple-icons:github' },
            external: true
          }
        ]
      },
      { name: 'Two', socials: [] }
    ])
  })

  it('ignores sibling identity fields once an Author object is written', () => {
    const { posts } = run([
      candidate('posts/a.md', {
        title: 'A',
        date: '2024-01-01',
        author: { name: 'Nested' },
        gravatar: 'should-be-ignored',
        github: 'https://github.com/should-be-ignored'
      })
    ])
    expect(posts[0].authors).toEqual([{ name: 'Nested', socials: [] }])
  })

  it('applies an Author Scope Default Author, beating the Site default', () => {
    const { posts } = run(
      [candidate('posts/notes/a.md', { title: 'A', date: '2024-01-01' })],
      { authorScopes: { 'posts/notes': 'Notes Team' } }
    )
    expect(posts[0].authors).toEqual([{ name: 'Notes Team', socials: [] }])
  })

  it('lets a Post’s own Author beat its Author Scope', () => {
    const { posts } = run(
      [
        candidate('posts/notes/a.md', {
          title: 'A',
          date: '2024-01-01',
          author: 'Someone Else'
        })
      ],
      { authorScopes: { 'posts/notes': 'Notes Team' } }
    )
    expect(posts[0].authors).toEqual([{ name: 'Someone Else', socials: [] }])
  })
})

describe('resolvePosts — dates and locale', () => {
  it('uses feed.language for the date locale when locale is unset', () => {
    const { posts } = run(
      [candidate('posts/a.md', { title: 'A', date: '2024-09-01' })],
      { feed: { language: 'de-DE' } }
    )
    expect(posts[0].date).toContain('September')
    expect(posts[0].date).not.toBe('September 1, 2024')
  })

  it('falls back to `lang` for date formatting when `locale` is unset', () => {
    const { posts } = run(
      [candidate('posts/a.md', { title: 'A', date: '2024-09-01' })],
      {
        lang: 'zh-CN'
      }
    )
    expect(posts[0].date).toBe('2024年9月1日')
  })

  it('prefers an explicit locale over lang', () => {
    const { posts } = run(
      [candidate('posts/a.md', { title: 'A', date: '2024-09-01' })],
      {
        lang: 'zh-CN',
        locale: 'en-US'
      }
    )
    expect(posts[0].date).toBe('September 1, 2024')
  })

  it('prefers an explicit locale over feed.language', () => {
    const { posts } = run(
      [candidate('posts/a.md', { title: 'A', date: '2024-09-01' })],
      { locale: 'en-US', feed: { language: 'de-DE' } }
    )
    expect(posts[0].date).toBe('September 1, 2024')
  })

  it('honours a custom dateFormat', () => {
    const { posts } = run(
      [candidate('posts/a.md', { title: 'A', date: '2024-09-01' })],
      { dateFormat: { year: 'numeric', month: '2-digit', day: '2-digit' } }
    )
    expect(posts[0].date).toBe('09/01/2024')
  })
})

describe('withDefaults — lang fallback', () => {
  it("takes VitePress's site-level lang when blog.lang is unset", () => {
    expect(withDefaults({ title: 'B', author: 'A' }, 'zh-CN').lang).toBe(
      'zh-CN'
    )
  })

  it('lets blog.lang win over the site lang', () => {
    expect(
      withDefaults({ title: 'B', author: 'A', lang: 'en' }, 'zh-CN').lang
    ).toBe('en')
  })

  it('leaves lang undefined when neither is set, so useLang defaults to English', () => {
    expect(withDefaults({ title: 'B', author: 'A' }).lang).toBeUndefined()
  })
})

describe('resolvePosts — source paths', () => {
  it('expresses the path relative to srcDir so Author Scope can match it', () => {
    const { posts } = run([
      candidate('posts/deep/a.md', { title: 'A', date: '2024-01-01' })
    ])
    expect(posts[0].path).toBe('posts/deep/a.md')
  })

  it('falls back to the URL, minus its extension, when srcDir is unknown', () => {
    const { posts } = resolvePosts(
      [candidate('posts/a.md', { title: 'A', date: '2024-01-01' })],
      config()
    )
    expect(posts[0].path).toBe('posts/a')
  })
})
