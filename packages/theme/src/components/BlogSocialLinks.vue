<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

import BlogSocialIcon from './BlogSocialIcon.vue'
import type { LangStrings } from '../lib/i18n.js'
import { useLang } from '../lib/i18n.js'
import type { ResolvedSocial } from '../lib/types.js'
import { socialAriaLabel, socialCaption } from '../lib/author.js'
import { useBlogConfig } from '../lib/useBlogConfig.js'

/**
 * An Author's Social Links, as a row of icons.
 *
 * A sole Social Link also shows its text. One icon beside a name is an unexplained glyph;
 * several read as a set, and a label under each would be a wall of prose. The rule lives
 * here rather than in the caller so a Site that places this component on its own — an
 * About page, say — gets the same byline.
 *
 * Exported for Sites, so `strings` is optional and resolved from the Site's language
 * rather than being internal plumbing the caller has to supply.
 */
const props = withDefaults(
  defineProps<{
    socials?: ResolvedSocial[]
    /**
     * Overrides the Theme's strings for this instance. Defaults to them for the Site's
     * `lang`.
     */
    strings?: LangStrings
  }>(),
  { socials: () => [] }
)

const blog = useBlogConfig()
const { site } = useData()

const strings = computed(() => props.strings ?? useLang(site.value.lang))

/**
 * The text for a sole Social Link, `undefined` when there are several.
 */
const caption = computed(() => socialCaption(props.socials))
</script>

<template>
  <ul v-if="socials.length" class="vp-blog-ui-social">
    <li
      v-for="(social, index) of socials"
      :key="index"
      class="vp-blog-ui-social-item"
    >
      <a
        class="vp-blog-ui-social-link"
        :href="social.link"
        :target="social.external ? '_blank' : undefined"
        :rel="social.external ? 'noopener' : undefined"
        :aria-label="socialAriaLabel(social, strings)"
      >
        <BlogSocialIcon :icon="social.icon" />
        <span v-if="caption" class="vp-blog-ui-social-caption">{{
          caption
        }}</span>
      </a>
    </li>
  </ul>
</template>
