<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

import { useBlogConfig } from '../lib/useBlogConfig.js'
import { useLang } from '../lib/i18n.js'

/**
 * The badge a pinned Post carries beside its title.
 *
 * The pin is a weight, not a value: the badge says *that* a Post is pinned and never prints
 * the number deciding where among the pinned Posts it sits, so `pin: true` and `pin: 10`
 * read the same to a reader.
 *
 * The glyph is decorative and hidden from assistive technology; the Theme's word for
 * "pinned" is what carries the meaning, so the title is announced as "Pinned, Hello world"
 * rather than preceded by an unnamed graphic.
 */
const blog = useBlogConfig()
const { site } = useData()

const strings = computed(() => useLang(site.value.lang))
</script>

<template>
  <span class="vp-blog-ui-pin">
    <span class="vp-blog-sr-only">{{ strings.pinned }}</span>
    <svg
      class="vp-blog-ui-pin-glyph"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4a1 1 0 0 1 1 1z"
      />
    </svg>
  </span>
</template>
