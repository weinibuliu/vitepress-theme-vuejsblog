<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useIcon } from 'vitepress'
import type { ResolvedSocialIcon } from '../lib/types.js'

/**
 * One Social Link's icon, whichever of the three kinds it is.
 *
 * Its own component because `useIcon` registers work against the component instance: an
 * `onMounted` in dev, and an SSR-context registration that makes the build emit the icon's
 * CSS rule. Calling it once per link inside the parent's loop would tie the number of
 * registrations to the length of a prop, so a link that appeared later would take over
 * another link's registration.
 */
const props = defineProps<{
  icon: ResolvedSocialIcon
}>()

const el = useTemplateRef('el')
const name = computed(() =>
  'name' in props.icon ? props.icon.name : undefined
)
const iconClass = useIcon(name, el)
</script>

<template>
  <span v-if="'svg' in icon" class="vp-blog-ui-social-icon" v-html="icon.svg" />
  <img
    v-else-if="'src' in icon"
    class="vp-blog-ui-social-icon"
    :src="icon.src"
    alt=""
  />
  <span v-else ref="el" class="vp-blog-ui-social-icon" :class="iconClass" />
</template>
