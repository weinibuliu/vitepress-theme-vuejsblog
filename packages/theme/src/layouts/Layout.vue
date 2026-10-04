<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useData, withBase } from 'vitepress'
import { useBlogConfig } from '../lib/useBlogConfig.js'
import { CHILD_SLOTS, filledSlots } from '../lib/slots.js'
import Home from '../components/Home.vue'
import Article from '../components/Article.vue'
import BlogDoc from '../components/BlogDoc.vue'
import NotFound from '../components/NotFound.vue'

/**
 * The Theme's root layout.
 *
 * Dispatch is by `layout` frontmatter, which is VitePress's own vocabulary for page
 * identity — there is no bespoke flag to learn:
 *
 * - `home` renders the Blog index.
 * - `page` renders a standalone document.
 * - anything else renders a Post, because Collection Scope already decided which
 *   files are Posts.
 *
 * The slots are the Theme's extension surface, named with the same `layout` / `content`
 * groups as the CSS. `README.md` has the table; `lib/slots.ts` holds the list Layout
 * forwards down to the child components, and a test keeps that list honest.
 *
 * `is-not-found` is on the shell for the 404 alone: it is what turns the shell into a
 * column tall enough for the page to be centred in the room between the nav and the footer.
 * The mechanism is three rules in `style.css`, and the reason it is not `:has()` on the
 * child is that a modifier here states the condition — `page.isNotFound`, the same one the
 * template dispatches on — once instead of twice.
 */
const { page, frontmatter } = useData()
const blog = useBlogConfig()
const slots = useSlots()

const isHome = computed(() => frontmatter.value.layout === 'home')
const isPlainPage = computed(() => frontmatter.value.layout === 'page')

// The child components declare the slots; Layout is the only component a Site can reach,
// so it forwards each filled one down by name. See `lib/slots.ts` for why this is a list
// rather than all of them, and why a test guards the list.
const notFoundSlots = computed(() => filledSlots(slots, CHILD_SLOTS.notFound))
const homeSlots = computed(() => filledSlots(slots, CHILD_SLOTS.home))
const articleSlots = computed(() => filledSlots(slots, CHILD_SLOTS.article))

function isExternal(link: string): boolean {
  return /^https?:\/\//i.test(link) || link.startsWith('mailto:')
}

const title = computed(() => blog.value.title)
const logo = computed(() => blog.value.logo)

/**
 * Whether the footer renders at all.
 *
 * `layout-footer-before` / `layout-footer-after` count: a Site that fills one of them and
 * configures no `text` or `links` still means to have a footer, and gating on the config
 * alone would silently drop the slot's content. Only these two are checked because they are
 * the only slots declared on Layout itself — every other slot belongs to a child component.
 */
const hasFooter = computed(
  () =>
    Boolean(blog.value.footer.text) ||
    blog.value.footer.links.length > 0 ||
    Boolean(slots['layout-footer-before'] || slots['layout-footer-after'])
)
</script>

<template>
  <div
    class="vp-blog-layout-shell"
    :class="{ 'is-not-found': page.isNotFound }"
  >
    <slot name="layout-top" />

    <div class="vp-blog-layout-inner">
      <nav class="vp-blog-layout-nav" :aria-label="title">
        <a
          class="vp-blog-layout-brand"
          :href="withBase('/')"
          :aria-label="title"
        >
          <img
            v-if="logo"
            class="vp-blog-layout-logo"
            :src="withBase(logo)"
            :alt="title"
          />
          <!-- The label is the brand's only content when there is no logo, so it cannot
               stay hidden on the index (where the H1 already carries the title) or below
               the width where it would crowd the logo. `is-solo` says so to the CSS. -->
          <span
            v-if="!isHome || !logo"
            class="vp-blog-layout-brand-label"
            :class="{ 'is-solo': !logo }"
            >{{ title }}</span
          >
        </a>

        <div class="vp-blog-layout-nav-links">
          <template v-for="(item, index) of blog.nav" :key="index">
            <span
              v-if="index > 0"
              class="vp-blog-layout-nav-separator"
              aria-hidden="true"
            >
              {{ blog.navSeparator }}
            </span>
            <a
              class="vp-blog-layout-nav-link"
              :href="withBase(item.link)"
              :target="
                (item.external ?? isExternal(item.link)) ? '_blank' : undefined
              "
              :rel="
                (item.external ?? isExternal(item.link))
                  ? 'noopener noreferrer'
                  : undefined
              "
            >
              <svg
                v-if="item.icon"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                :title="item.text ? item.text : item.link"
              >
                <path fill="currentColor" :d="item.icon" />
              </svg>
              <template v-else>{{ item.text }}</template></a
            >
          </template>
        </div>
      </nav>

      <main class="vp-blog-layout-main">
        <NotFound v-if="page.isNotFound">
          <template
            v-for="name in notFoundSlots"
            :key="name"
            #[name]="slotProps"
          >
            <slot :name="name" v-bind="slotProps ?? {}" />
          </template>
        </NotFound>
        <Home v-else-if="isHome">
          <template v-for="name in homeSlots" :key="name" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps ?? {}" />
          </template>
        </Home>
        <BlogDoc v-else-if="isPlainPage" />
        <Article v-else>
          <template
            v-for="name in articleSlots"
            :key="name"
            #[name]="slotProps"
          >
            <slot :name="name" v-bind="slotProps ?? {}" />
          </template>
        </Article>
      </main>

      <footer v-if="hasFooter" class="vp-blog-layout-footer">
        <slot name="layout-footer-before" />

        <p v-if="blog.footer.text" class="vp-blog-layout-footer-text">
          <!-- `text` is documented as HTML, and comes from the Site's own config. The
               `<bdi>` isolates it so mixed-direction text cannot reorder around it —
               VitePress wraps its own footer text the same way. -->
          <bdi v-html="blog.footer.text" />
        </p>

        <div
          v-if="blog.footer.links.length"
          class="vp-blog-layout-footer-links"
        >
          <a
            v-for="(item, index) of blog.footer.links"
            :key="index"
            class="vp-blog-layout-footer-link"
            :href="withBase(item.link)"
            :target="
              (item.external ?? isExternal(item.link)) ? '_blank' : undefined
            "
            :rel="
              (item.external ?? isExternal(item.link))
                ? 'noopener noreferrer'
                : undefined
            "
            >{{ item.text }}</a
          >
        </div>

        <slot name="layout-footer-after" />
      </footer>
    </div>

    <slot name="layout-bottom" />
  </div>
</template>
