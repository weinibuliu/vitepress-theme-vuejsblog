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
 * From 1280px up it is the list itself, sticky in the frame's left column. Below that there
 * is no column, so the same list is rendered a second time inside a bar fixed to the top of
 * the viewport — the shape the default theme gives a page: a local nav, appearing once the
 * site nav has scrolled away, whose control reveals the outline.
 *
 * Both renderings are in the HTML and CSS decides which width shows which, rather than one
 * tree whose state is bound to a media query. The reason is the first paint: the page arrives
 * before the breakpoint is known, so a tree that switched would always watch the list appear
 * or vanish as the page hydrates. Rendering both costs a second copy of a list of links, which
 * is a few hundred bytes, and buys a TOC that is right in the first paint at every width and
 * works with scripting off.
 *
 * ## How the narrow one opens
 *
 * The trigger is a popover invoker and the panel is a native popover, so the Theme does not
 * open or close it: light dismiss, Escape and the top layer are the platform's, and they work
 * before hydration and with scripting off. What the script adds is only the moment the bar
 * appears, the state the trigger reports, and closing the panel when the reader clicked a
 * heading or landed on a new page — none of which the platform does on its own. See
 * `.agents/adr/0014-the-narrow-toc-is-a-native-popover.md`.
 *
 * ## Where the headings come from
 *
 * `page.headers`, which `markdown.headers` collects at build time — so the list is in the
 * server-rendered HTML rather than appended after hydration. See
 * `.agents/adr/0009-headings-come-from-the-build.md`; the one consequence to know here is that
 * a Site which states `markdown: { headers: false }` reaches this component with an empty list,
 * and gets no TOC.
 */
const { frontmatter, page, site } = useData()
const blog = useBlogConfig()
const strings = computed(() => useLang(site.value.lang))
const titleId = useId()
const panelId = useId()
const list = useTemplateRef('list')
const panel = useTemplateRef<HTMLElement>('panel')

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
 * Whether the bar has been earned yet, and what the trigger reports.
 *
 * `expanded` is only ever a copy: the popover owns its own state, and this mirrors it so the
 * trigger can say what that state is. Nothing here reads it back to decide anything.
 */
const barVisible = ref(false)
const expanded = ref(false)

/**
 * Where the bar takes over, as a document offset.
 *
 * The rule is the default theme's: the bar appears once the site nav has scrolled away. The
 * nav belongs to `Layout.vue` rather than to this component, so it is reached for by class —
 * but both ends are the Theme's own style layer, and the nav is the same height at every
 * width, so a resize cannot invalidate the measurement. A shell with no nav at all falls back
 * to a bar that is available from the top.
 *
 * Measured on mount and on every content update rather than on every scroll, for the reason
 * the scroll handler below exists at all: a layout read per scroll event is what makes a
 * scroll handler cost anything.
 */
let appearAt = 0

function measureAppearAt(): void {
  const nav = document.querySelector('.vp-blog-layout-nav')
  appearAt = nav ? nav.getBoundingClientRect().bottom + window.scrollY : 0
}

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
 *
 * The panel closes here too. A heading link is not something the platform treats as "the
 * popover is done with" — it is an ordinary link that happens to be inside one — so without
 * this the list would stay open over the heading it just jumped to.
 */
let skipNextRun = false

function onClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return

  const href = target.closest('a')?.getAttribute('href')
  // `#` alone is the panel's "Return to top" link, which is not a heading and has its own
  // handler; every heading link is longer than that.
  if (!href?.startsWith('#') || href.length < 2) return

  skipNextRun = true
  active.value = href
  hidePanel()
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

  // Before the early-out below: a click on a TOC link skips one recomputation of the
  // highlight, and the bar must not be skipped along with it.
  barVisible.value = window.scrollY >= appearAt

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

/**
 * The popover's own state, copied so the trigger can report it.
 *
 * The platform does not set `aria-expanded` for a popover invoker. Without scripting there is
 * nothing to set it with: the panel still opens and closes, because that is `popovertarget`'s
 * job, but the state a screen reader hears stays at its server-rendered "closed". The chevron
 * is driven from `:popover-open` in CSS instead, so it does not share that limitation.
 */
function onToggle(event: ToggleEvent): void {
  expanded.value = event.newState === 'open'
}

/** Close the panel, if the platform has one and it is open. */
function hidePanel(): void {
  const element = panel.value
  if (element && typeof element.hidePopover === 'function')
    element.hidePopover()
}

/** The panel's own way back to the head of the Post, for a reader already at its foot. */
function scrollToTop(): void {
  hidePanel()
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  measureAppearAt()
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
 * `display: none`, where `scrollIntoView` does nothing at all. The panel is a list the reader
 * has just opened to look at, and its own scroll position is where they left it.
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
 * A new page is new content, so the headings to measure are new too, and so is the place the
 * bar takes over. VitePress's own hook is the only moment that is true: it runs when the
 * page's content component has mounted or updated, which is after the prose is in the
 * document.
 *
 * The panel is closed here as well. The popover element survives a client-side navigation —
 * it is the same component rendering a new page — so a reader who opens the panel and then
 * follows a Next link would otherwise arrive with the previous page's panel still open over
 * the new one.
 */
onContentUpdated(() => {
  hidePanel()
  measureAppearAt()
  run()
})

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

    <!-- Below 1280px. The bar is out of flow and hidden until the site nav has scrolled
         away, so it never takes room from the Post and never shifts it when it appears. -->
    <div class="vp-blog-ui-toc-bar" :class="{ 'is-visible': barVisible }">
      <div class="vp-blog-ui-toc-bar-inner">
        <button
          type="button"
          class="vp-blog-ui-toc-trigger"
          :popovertarget="panelId"
          :aria-controls="panelId"
          :aria-expanded="expanded"
        >
          {{ strings.tocTitle }}
          <svg
            class="vp-blog-ui-toc-chevron"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path
              d="M6 3.5 10.5 8 6 12.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- The list the trigger reveals. A popover rather than a disclosure, so the platform
         owns the opening, the light dismiss, the Escape key and the top-layer placement. -->
    <div
      :id="panelId"
      ref="panel"
      popover
      class="vp-blog-ui-toc-panel"
      @toggle="onToggle"
    >
      <a class="vp-blog-ui-toc-top" href="#" @click.prevent="scrollToTop">{{
        strings.returnToTop
      }}</a>
      <nav :aria-label="strings.tocTitle">
        <BlogTocList :items="items" :active="active" />
      </nav>
    </div>
  </div>
</template>
