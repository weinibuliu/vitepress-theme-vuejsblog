<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

import { data as posts } from '../../posts.data.js'
import { useBlogConfig } from '../lib/useBlogConfig.js'
import { useLang } from '../lib/i18n.js'
import BlogDate from './BlogDate.vue'
import BlogAuthor from './BlogAuthor.vue'
import BlogPin from './BlogPin.vue'
import BlogToc from './BlogToc.vue'
import type { Post } from '../lib/types.js'

/**
 * A single Post.
 *
 * The Next and Previous links are the loader's answer rather than this component's: which Post
 * comes after this one on the Blog's sorting key is decided where `date`, `order` and `pin` are
 * read, and the neighbours arrive on the Post as `next` and `prev`. Taking them from a position
 * in the loader's array instead is what used to point "Next Article" at the older Post — the
 * array is the index, and it runs the other way round. See
 * `docs/adr/0011-navigation-follows-the-sorting-key.md`.
 */
const { frontmatter, page, site } = useData()
const blog = useBlogConfig()
const strings = computed(() => useLang(site.value.lang))

/**
 * Which Post is being rendered.
 *
 * VitePress 2 gives the current page's source-relative `relativePath` rather than a
 * router path (the `page.route` of VitePress 1 is gone), which is exactly what the
 * resolver stored on each Post as `path`.
 */
const post = computed<Post | undefined>(() =>
  posts.find(
    (candidate) =>
      normalise(candidate.path) === normalise(page.value.relativePath)
  )
)

function normalise(value: string): string {
  return value.replace(/^\/+/, '').replace(/\.md$/, '').replace(/\/+$/, '')
}

/**
 * `next` is the key-greater neighbour — the newer Post under `date` — whichever way the Blog's
 * index happens to run, which is what the reference site's labels mean.
 */
const nextPost = computed(() => post.value?.next)
const prevPost = computed(() => post.value?.prev)

/**
 * `updated` is author-supplied, so it is shown as written rather than reformatted:
 * the Theme cannot know whether `2024-09` means a date or a month.
 */
const updated = computed(() => {
  const value = frontmatter.value.updated
  return typeof value === 'string' ? value : undefined
})
</script>

<template>
  <article class="vp-blog-content-post">
    <slot name="content-post-before" />

    <header class="vp-blog-content-post-head">
      <BlogDate v-if="post" :date="post" />
      <h1 class="vp-blog-content-post-title">
        <!-- A page whose Post is not in the Blog — a Draft in a production build, or an
             Unplaced one — has no `post` here, and so no badge: what the Blog does not
             list, the article does not claim. -->
        <span v-if="post?.pin !== undefined">
          <slot name="content-post-pin" :post="post">
            <BlogPin />
          </slot>
        </span>
        {{ frontmatter.title }}
      </h1>
      <p v-if="updated" class="vp-blog-content-updated">
        {{ strings.updated }} <time>{{ updated }}</time>
      </p>
    </header>

    <div class="vp-blog-content-post-frame">
      <BlogAuthor v-if="post" :authors="post.authors" />
      <footer class="vp-blog-content-post-nav">
        <div v-if="nextPost" class="vp-blog-content-post-nav-block">
          <h2 class="vp-blog-content-post-nav-title">
            {{ strings.nextArticle }}
          </h2>
          <a class="vp-blog-link" :href="withBase(nextPost.url)">{{
            nextPost.title
          }}</a>
        </div>
        <div v-if="prevPost" class="vp-blog-content-post-nav-block">
          <h2 class="vp-blog-content-post-nav-title">
            {{ strings.previousArticle }}
          </h2>
          <a class="vp-blog-link" :href="withBase(prevPost.url)">{{
            prevPost.title
          }}</a>
        </div>
        <div class="vp-blog-content-post-nav-block">
          <a class="vp-blog-link" :href="withBase('/')">{{
            strings.backToBlog
          }}</a>
        </div>
      </footer>

      <!-- After the navigation rather than before it: the frame's left column is a reading
           aid from top to bottom, and where the reader may go next is part of leaving the
           Post while the TOC is part of reading it. Both are the Post's own chrome; the
           order is what a reader meets them in. -->
      <BlogToc />

      <div class="vp-blog-content-post-main">
        <slot name="content-post-main-before" />
        <Content class="vp-doc vp-blog-prose" />
        <slot name="content-post-main-after" />
      </div>
    </div>

    <slot name="content-post-after" />
  </article>
</template>
