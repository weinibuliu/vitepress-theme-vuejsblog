<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

import type { Post } from '../lib/types.js'
import type { LangStrings } from '../lib/i18n.js'
import { useLang } from '../lib/i18n.js'

/**
 * A Post's publication date.
 *
 * The display string and the ISO string are both precomputed by the resolver, so this
 * component does no date work and the client bundle carries no `Intl` calls.
 *
 * Exported for Sites, so `strings` is optional for the same reason as in `BlogAuthor`.
 */
const props = defineProps<{
  date: Pick<Post, 'date' | 'iso' | 'time'>
  /**
   * The screen-reader label for the date. Comes from the Theme's string table when not
   * given.
   */
  label?: string
  /**
   * Overrides the Theme's strings for this instance. Defaults to them for the Site's
   * `lang`.
   */
  strings?: Pick<LangStrings, 'published'>
}>()

const { site } = useData()

const strings = computed(() => props.strings ?? useLang(site.value.lang))

const iso = computed(
  () => props.date.iso ?? new Date(props.date.time).toISOString().slice(0, 10)
)
</script>

<template>
  <dl>
    <dt class="vp-blog-sr-only">{{ label ?? strings.published }}</dt>
    <dd class="vp-blog-ui-date">
      <time :datetime="iso">{{ date.date }}</time>
    </dd>
  </dl>
</template>
