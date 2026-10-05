<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  useId,
  useTemplateRef,
  watch
} from 'vue'
import { onContentUpdated, useData } from 'vitepress'

import { useBlogConfig } from '../lib/useBlogConfig.js'
import { useLang } from '../lib/i18n.js'
import {
  pickActiveTocLink,
  resolveToc,
  type TocAnchor,
  type TocItem
} from '../lib/toc.js'
import BlogTocList from './BlogTocList.vue'

/**
 * A Post's TOC: the list of its own headings, and the reader's place in it.
 *
 * ## Where it goes, and why twice
 *
 * The TOC is page chrome, so it is rendered here rather than read out of the Post's prose.
 * It sits below the byline and the Next/Previous links, which is where the frame's left
 * column puts it, and it is sticky there: a reader who scrolls into a long Post keeps the
 * list — and the highlight on it — in view.
 *
 * Below 1280px there is no left column, so the same list is rendered a second time as a
 * native `<details>`, collapsed, and CSS shows one and hides the other. The alternative —
 * one tree whose `open` state is bound to a media query — cannot be server-rendered
 * correctly: the page arrives before the breakpoint is known, so one of the two widths would
 * always watch the list appear or vanish as the page hydrates. Rendering both costs a second
 * copy of a list of links, which is a few hundred bytes, and buys a TOC that is right in the
 * first paint at every width and works with scripting off.
 *
 * ## Where the headings come from
 *
 * `page.headers`, which `markdown.headers` collects at build time — so the list is in the
 * server-rendered HTML rather than appended after hydration. See
 * `docs/adr/0009-headings-come-from-the-build.md`; the one consequence to know here is that a
 * Site which states `markdown: { headers: false }` reaches this component with an empty list,
 * and gets no TOC.
 */
const { frontmatter, page, site } = useData()
const blog = useBlogConfig()
const strings = computed(() => useLang(site.value.lang))
const titleId = useId()
const list = useTemplateRef('list')

/**
 * Whether this Post shows a TOC.
 *
 * A Post overrides the Site in both directions, which is the point of the override: whether
 * a TOC helps depends on the Post — how long it is, and whether its headings say anything a
 * reader would navigate by — and a Blog's Posts differ. A `toc` that is not a boolean is not
 * a decision, so it is ignored rather than read as `true` the way a truthy test would.
 */
const enabled = computed(() => {
  const stated = frontmatter.value.toc as unknown
  return typeof stated === 'boolean' ? stated : blog.value.toc
})

/**
 * The headings to show, nested. Empty when the Post has none, which is also when the whole
 * block — label included — is not rendered: a label over nothing is worse than nothing.
 */
const items = computed<TocItem[]>(() =>
  enabled.value ? resolveToc(page.value.headers) : []
)

/** The `TocItem.link` the reader is in, or `null` at the top of the Post. */
const active = ref<string | null>(null)

/**
 * Measuring the page on every scroll event would read layout once per event, and layout reads
 * are what make a scroll handler cost anything. VitePress throttles its own to 100ms; this is
 * the same interval, with a trailing run so the last position is never skipped.
 */
const SCROLL_THROTTLE_MS = 100

let lastRun = 0
let trailing: ReturnType<typeof setTimeout> | undefined

/**
 * A click on a TOC link, which sets the highlight at once rather than after the jump.
 *
 * The browser's scroll to the heading follows, and the position it reports part-way through
 * is not where the reader will end up; the first recomputation after a click is therefore
 * skipped so it cannot flicker through the headings it passes. The link is read from the
 * anchor's own attribute rather than from `location.hash`, because it is then the exact
 * `TocItem.link` this component compares against — a hash coming back out of a URL would have
 * to be decoded back into it.
 */
let skipNextRun = false

function onClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return

  const href = target.closest('a')?.getAttribute('href')
  if (!href?.startsWith('#')) return

  skipNextRun = true
  active.value = href
}

function onScroll(): void {
  const wait = SCROLL_THROTTLE_MS - (Date.now() - lastRun)
  if (wait <= 0) {
    run()
    return
  }
  if (trailing !== undefined) return
  trailing = setTimeout(() => {
    trailing = undefined
    run()
  }, wait)
}

/**
 * The reader's place, recomputed from the page as it is now.
 */
function run(): void {
  lastRun = Date.now()
  if (skipNextRun) {
    skipNextRun = false
    return
  }
  active.value = pickActiveTocLink(measure(), {
    scrollY: window.scrollY,
    innerHeight: window.innerHeight,
    documentHeight: document.body.offsetHeight
  })
}

/**
 * Every heading's position on the page, in the numbers the highlight decides on.
 *
 * A heading that is not in the document is left out rather than measured as zero: the
 * headings live in the Post's prose, and a Post whose prose has a heading the build did not
 * collect — or one hidden by the Site's own CSS — would otherwise be reported as being at the
 * top of the page, which would light its entry up from the start.
 */
function measure(): TocAnchor[] {
  const anchors: TocAnchor[] = []

  for (const link of links(items.value)) {
    const element = document.getElementById(link.slice(1))
    if (!element) continue

    const top = absoluteTop(element)
    if (Number.isNaN(top)) continue

    anchors.push({
      link,
      top,
      scrollMarginTop:
        Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0
    })
  }

  return anchors
}

/** Every link in the tree, in the order the Post writes its headings. */
function links(tree: readonly TocItem[]): string[] {
  return tree.flatMap((item) => [item.link, ...links(item.children)])
}

/**
 * An element's distance from the top of the document.
 *
 * `offsetTop` is measured against the nearest positioned ancestor, so the chain of
 * `offsetParent`s is what turns it into a document offset — VitePress walks the same chain.
 * `NaN` is what a `display: none` element reports: it has no `offsetParent`, and there is no
 * position to measure.
 */
function absoluteTop(element: HTMLElement): number {
  let top = 0
  let current: HTMLElement | null = element

  while (current !== null && current !== document.body) {
    top += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }

  return current === null ? Number.NaN : top
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  run()
})

/**
 * Keep the highlighted entry in sight of the list itself.
 *
 * The list scrolls on its own once it is taller than the window, which is what makes a long
 * Post's tail reachable — but it also means the reader's place can be outside the list's own
 * viewport, with nothing lit up where they are looking. `nearest` moves the box as little as
 * it can, and because that box never scrolls the page, this cannot feed back into the scroll
 * handler that set the highlight.
 *
 * Only the column's copy is asked: it is the one that scrolls, and below 1280px it is
 * `display: none`, where `scrollIntoView` does nothing at all.
 */
watch(active, (link) => {
  if (!link || !list.value) return

  for (const anchor of Array.from(list.value.querySelectorAll('a'))) {
    if (anchor.getAttribute('href') !== link) continue
    anchor.scrollIntoView({ block: 'nearest' })
    return
  }
})

/**
 * A new page is new content, so the headings to measure are new too. VitePress's own hook is
 * the only moment that is true: it runs when the page's content component has mounted or
 * updated, which is after the prose is in the document.
 */
onContentUpdated(run)

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (trailing !== undefined) clearTimeout(trailing)
})
</script>

<template>
  <div v-if="items.length" class="vp-blog-ui-toc" @click="onClick">
    <nav ref="list" class="vp-blog-ui-toc-nav" :aria-labelledby="titleId">
      <p :id="titleId" class="vp-blog-ui-toc-title">{{ strings.tocTitle }}</p>
      <BlogTocList :items="items" :active="active" />
    </nav>

    <details class="vp-blog-ui-toc-disclosure">
      <summary class="vp-blog-ui-toc-summary">
        {{ strings.tocTitle }}
      </summary>
      <BlogTocList :items="items" :active="active" />
    </details>
  </div>
</template>
