<script setup lang="ts">
import type { TocItem } from '../lib/toc.js'

/**
 * One level of a TOC.
 *
 * A component of its own because the levels nest, and a template can only recurse through a
 * component. It references itself by its own filename, which `<script setup>` registers as
 * the component's name — the same way VitePress's own `VPDocOutlineItem` does it.
 *
 * The nesting needs no depth prop: the indentation is one rule for "a list inside a list",
 * and CSS already knows which list is inside which.
 */
defineProps<{
  items: TocItem[]

  /**
   * The heading the reader is in, as a `TocItem.link`. `null` at the top of a Post, where no
   * heading has been reached yet.
   */
  active: string | null
}>()
</script>

<template>
  <ul class="vp-blog-ui-toc-list">
    <li v-for="item of items" :key="item.link">
      <a
        class="vp-blog-ui-toc-link"
        :class="{ 'is-active': item.link === active }"
        :href="item.link"
        :aria-current="item.link === active ? 'location' : undefined"
        >{{ item.title }}</a
      >
      <BlogTocList
        v-if="item.children.length"
        :items="item.children"
        :active="active"
      />
    </li>
  </ul>
</template>
