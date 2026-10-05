<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { data as posts } from '../../posts.data.js'
import { useBlogConfig } from '../lib/useBlogConfig.js'
import { useLang } from '../lib/i18n.js'
import { heroSubtextHtml, resolveHeroAvatar } from '../lib/hero.js'
import BlogDate from './BlogDate.vue'
import BlogPin from './BlogPin.vue'

/**
 * The Blog index.
 *
 * Mounted on `layout: home`, so a Site's home page needs no bespoke frontmatter key. The
 * heading can be overridden per page; the subtext falls back to the Blog's `description`.
 *
 * `themeConfig.blog.hero` turns the heading into an avatar-and-name hero, which is what a
 * personal blog wants where the reference site's project heading is not. The two share the
 * heading slots, so overriding the title works either way.
 */
const { frontmatter, site } = useData()
const blog = useBlogConfig().value

const title = computed(() =>
  blog.siteTitle === false
    ? ''
    : ((frontmatter.value.title as string | undefined) ??
      blog.siteTitle ??
      site.value.title)
)
const subtext = computed(
  () =>
    (frontmatter.value.subtext as string | undefined) ?? site.value.description
)
const subtextHtml = computed(() => blog.siteSubtext ?? undefined)
const strings = computed(() => useLang(site.value.lang))

const hero = computed(() => blog.hero)
const heroTitle = computed(() => hero.value?.title ?? title.value)
/**
 * The hero's line, in the form it should be rendered in.
 *
 * `hero.subtext` is HTML and wins; the fallback is the Blog's `description`, which is
 * metadata and stays escaped — see `heroSubtextHtml`.
 */
const heroHtml = computed(() => heroSubtextHtml(hero.value))
const heroSubtext = computed(() => heroHtml.value ?? subtext.value)

const heroAvatar = computed(() => resolveHeroAvatar(hero.value, blog.author))
</script>

<template>
  <div class="vp-blog-content-index">
    <!-- Filled, this slot replaces the heading area outright — the Theme's own would
         conflict with whatever the Site is putting there. -->
    <slot name="content-index-hero">
      <div v-if="hero" class="vp-blog-content-index-hero">
        <img
          v-if="heroAvatar"
          class="vp-blog-content-index-hero-avatar"
          :src="withBase(heroAvatar)"
          alt=""
          width="80"
          height="80"
        />
        <h1 class="vp-blog-content-index-hero-title">
          <slot name="content-index-title">{{ heroTitle }}</slot>
        </h1>
        <p v-if="heroSubtext" class="vp-blog-content-index-hero-subtext">
          <slot name="content-index-subtext">
            <!-- `bdi` for the same reason the footer uses it: this line mixes scripts, and
                 without isolation a direction change can reorder around it. -->
            <bdi v-if="heroHtml" v-html="heroHtml" />
            <template v-else>{{ heroSubtext }}</template>
          </slot>
        </p>
      </div>

      <div v-else class="vp-blog-content-index-head">
        <h1 class="vp-blog-content-index-title">
          <slot name="content-index-title">{{ title }}</slot>
        </h1>
        <p v-if="subtext" class="vp-blog-content-index-subtext">
          <bdi v-if="subtextHtml" v-html="subtextHtml" />
          <slot v-else name="content-index-subtext">{{ subtext }}</slot>
        </p>
      </div>
    </slot>

    <slot name="content-index-before" />

    <ul class="vp-blog-content-list">
      <li
        v-for="post of posts"
        :key="post.url"
        class="vp-blog-content-list-item"
      >
        <article class="vp-blog-content-list-entry">
          <BlogDate :date="post" />
          <div class="vp-blog-content-list-main">
            <h2 class="vp-blog-content-list-title">
              <!-- The slot host is a bare `<span>` on purpose: the badge owns its own
                   spacing, so a Site replacing it is not fighting a layout the Theme
                   applied on its behalf. -->
              <span v-if="post.pin !== undefined">
                <slot name="content-index-pin" :post="post">
                  <BlogPin />
                </slot>
              </span>
              <a class="vp-blog-content-list-link" :href="withBase(post.url)">{{
                post.title
              }}</a>
            </h2>
            <div
              v-if="post.description"
              class="vp-doc vp-blog-prose vp-blog-content-list-excerpt"
              v-html="post.description"
            />
            <p class="vp-blog-content-read-more">
              <a
                class="vp-blog-link"
                :href="withBase(post.url)"
                :aria-label="post.title"
              >
                {{ strings.readMore }}
              </a>
            </p>
          </div>
        </article>
      </li>
    </ul>

    <p v-if="!posts.length" class="vp-blog-content-empty">
      {{ strings.empty }}
    </p>

    <slot name="content-index-after" />
  </div>
</template>
