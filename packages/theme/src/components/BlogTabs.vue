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
import { useData, useRoute } from 'vitepress'

import { useLang } from '../lib/i18n.js'
import {
  joinPage,
  leavePage,
  recall,
  remember,
  type PageChoices
} from '../lib/tabsLinking.js'

/**
 * The Tabs a Post writes with a `tabs` container: the row of titles, and the pane each one
 * shows.
 *
 * ## What the Markdown hands over
 *
 * `lib/tabs.ts` renders one of these per container, with `data` — the Tabs' values, in the
 * order the Post wrote them — and, when the Post marked one, `active`. The bodies arrive as a
 * slot each (`#tab0`), already rendered as the rest of the Markdown is; a Tab's title arrives
 * through `#titleN` and is rendered twice from it, once in the row and once above its own pane,
 * where it is hidden until the page is printed.
 *
 * ## Linking, and how long it lasts
 *
 * Tab Groups that state the same Tab Id (`::: tabs#shell`) show the same choice: selecting a
 * Tab in one writes its value into a store keyed by page and Tab Id, and every group holding
 * that Id follows — including ones already on the page. `lib/tabsLinking.ts` holds that store
 * and its lifetime; what matters here is that a group joins it on mount and leaves it on
 * unmount, so a choice lives exactly as long as the page does — leaving the page forgets it, and
 * so does a reload. Nothing is written to the reader's browser.
 *
 * Linking is by value rather than by position, which is what `@tab title#value` is for: the
 * "Using npm" Tab in one group and the "npm" Tab in another are the same choice when they state
 * the same value, and each falls back to its title when it states none.
 *
 * ## Server rendering
 *
 * The server renders each group with its own default — `active`, or the first Tab — and the
 * remembered choice is applied on mount. A stored choice is therefore never part of the
 * server's HTML, which is what keeps hydration from disagreeing with it; the cost is that a
 * linked group can change its mind one tick after the page appears, which is the same thing
 * `vuepress-theme-hope` does and the only way to render a choice the server cannot know.
 *
 * ## Reading it
 *
 * The row is a real `tablist`: one `tab` button per Tab, roving `tabindex`, arrow keys that
 * move the choice with the focus, and a `tabpanel` per pane labelled by its button. Inactive
 * panes are hidden by CSS rather than by the `hidden` attribute, and the stylesheet undoes that
 * hiding for print and for a browser that reports `scripting: none` — so a reader who cannot click
 * the row still gets every pane, each under its own title.
 */
interface TabData {
  /** The value the Tab is known by: what its marker states after `#`, or else its title. */
  id: string
}

const props = withDefaults(
  defineProps<{
    data: TabData[]

    /**
     * Which Tab the Post marked active, or the first. The Markdown omits the prop when the
     * Post marked none, which is why the default is stated here rather than there.
     */
    active?: number

    /**
     * The Tab Id the container stated, which links it to every other group stating the same
     * one. Absent when the Post stated none, and then this group stands alone.
     */
    tabId?: string
  }>(),
  { active: 0 }
)

const { site } = useData()
const route = useRoute()

const strings = computed(() => useLang(site.value.lang))
const nav = useTemplateRef<HTMLDivElement>('nav')

/** Unique per group, and the same on the server and in the browser — `useId` says so. */
const uid = useId()
const ids = computed(() => props.data.map((_, index) => `${uid}-tabs-${index}`))

const activeIndex = ref(props.active)

/**
 * The page this group belongs to, taken once.
 *
 * Not read again at unmount: a reader who is leaving has already moved `page.path` on, and
 * releasing the page they moved *to* would both strand the entry this group created and clear
 * the choices of the page arriving.
 */
const path = route.path

/**
 * This group's page store, once it has joined one. Absent before mount, which is also the whole
 * of server rendering — there is no choice to hold yet.
 */
let pageChoices: PageChoices | undefined

/** The pane a Tab shows, or the one it would show if it were the remembered choice. */
function select(index: number): void {
  activeIndex.value = index
  if (pageChoices !== undefined && props.tabId !== undefined) {
    remember(pageChoices, props.tabId, props.data[index].id)
  }
}

/** The row's buttons, in the order the Post wrote them. */
function buttons(): HTMLButtonElement[] {
  return Array.from(
    nav.value?.querySelectorAll<HTMLButtonElement>('button') ?? []
  )
}

/**
 * Move the choice and the focus together, which is what the arrow keys are for: a reader who
 * cannot see the row still has to learn, as they arrow along it, what each Tab would show.
 */
function move(index: number): void {
  select(index)
  buttons()[index]?.focus()
}

function onKeydown(event: KeyboardEvent, index: number): void {
  const last = props.data.length - 1

  if (event.key === 'ArrowRight') move(index === last ? 0 : index + 1)
  else if (event.key === 'ArrowLeft') move(index === 0 ? last : index - 1)
  else if (event.key === 'Home') move(0)
  else if (event.key === 'End') move(last)
  else if (event.key === 'Enter' || event.key === ' ') select(index)
  else return

  event.preventDefault()
}

onMounted(() => {
  const { tabId } = props
  if (tabId === undefined) return

  const entry = joinPage(path)
  pageChoices = entry

  const remembered = recall(entry, tabId)
  const index =
    remembered === undefined
      ? -1
      : props.data.findIndex((tab) => tab.id === remembered)
  if (index !== -1) activeIndex.value = index

  // A group holding the same Tab Id that chose first is what the others follow. This group's
  // own choice arrives here too, and is already the index it states.
  watch(
    () => recall(entry, tabId),
    (value) => {
      if (value === undefined) return
      const next = props.data.findIndex((tab) => tab.id === value)
      if (next !== -1) activeIndex.value = next
    }
  )
})

onUnmounted(() => {
  if (pageChoices !== undefined) leavePage(path, pageChoices)
})
</script>

<template>
  <div v-if="data.length" class="vp-blog-tabs">
    <div
      ref="nav"
      class="vp-blog-tabs-nav"
      role="tablist"
      :aria-label="strings.tabsLabel"
    >
      <button
        v-for="(tab, index) of data"
        :id="`${ids[index]}-tab`"
        :key="tab.id"
        type="button"
        class="vp-blog-tabs-tab"
        :class="{ 'is-active': index === activeIndex }"
        role="tab"
        :aria-selected="index === activeIndex"
        :aria-controls="ids[index]"
        :tabindex="index === activeIndex ? 0 : -1"
        @click="select(index)"
        @keydown="onKeydown($event, index)"
      >
        <slot
          :name="`title${index}`"
          :value="tab.id"
          :is-active="index === activeIndex"
        />
      </button>
    </div>

    <div
      v-for="(tab, index) of data"
      :id="ids[index]"
      :key="tab.id"
      class="vp-blog-tabs-panel"
      :class="{ 'is-active': index === activeIndex }"
      role="tabpanel"
      :aria-labelledby="`${ids[index]}-tab`"
      tabindex="0"
    >
      <p class="vp-blog-tabs-panel-title">
        <slot
          :name="`title${index}`"
          :value="tab.id"
          :is-active="index === activeIndex"
        />
      </p>

      <div class="vp-blog-tabs-panel-body">
        <slot
          :name="`tab${index}`"
          :value="tab.id"
          :is-active="index === activeIndex"
        />
      </div>
    </div>
  </div>
</template>
