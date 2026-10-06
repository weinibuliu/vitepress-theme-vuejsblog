<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

import BlogSocialLinks from './BlogSocialLinks.vue'
import { EXTERNAL_LINK_CLASS, isExternal } from '../lib/externalLinks.js'
import type { ResolvedAuthor } from '../lib/types.js'
import type { LangStrings } from '../lib/i18n.js'
import { useLang } from '../lib/i18n.js'

/**
 * The byline for a Post.
 *
 * Renders every Author in the list, so a co-authored Post simply grows a row. The
 * vertical layout is the one the reference site uses for its single author, so one
 * code path covers both cases.
 *
 * An avatar is shown whenever the Author has one, whether or not they also have a
 * homepage to link it to.
 *
 * The Social Links are a separate row under the name, rendered by `BlogSocialLinks`,
 * which decides on its own whether a sole link also shows its text. Each Author's links
 * are counted on their own: one co-Author may show a handle where another shows icons
 * alone.
 *
 * Exported for Sites, so it has to work when dropped in on its own. `strings` is therefore
 * optional and resolved from the Site's language, rather than being internal plumbing the
 * caller has to supply — requiring it made the component unusable outside the Theme.
 */
const props = defineProps<{
  authors: ResolvedAuthor[]
  /**
   * Overrides the Theme's strings for this instance. Defaults to them for the Site's
   * `lang`.
   */
  strings?: LangStrings
}>()

const { site } = useData()

const strings = computed(() => props.strings ?? useLang(site.value.lang))
</script>

<template>
  <dl class="vp-blog-ui-byline">
    <dt class="vp-blog-sr-only">{{ strings.authors }}</dt>
    <dd>
      <ul class="vp-blog-ui-byline-list">
        <li
          v-for="(author, index) of authors"
          :key="index"
          class="vp-blog-ui-byline-entry"
        >
          <template v-if="author.avatar">
            <a
              v-if="author.url"
              class="vp-blog-ui-byline-avatar-link"
              :class="isExternal(author.url) ? EXTERNAL_LINK_CLASS : undefined"
              :href="author.url"
              :target="isExternal(author.url) ? '_blank' : undefined"
              :rel="isExternal(author.url) ? 'noopener' : undefined"
            >
              <img
                class="vp-blog-ui-byline-avatar"
                :src="author.avatar"
                :alt="author.name"
                width="40"
                height="40"
                loading="lazy"
              />
            </a>
            <img
              v-else
              class="vp-blog-ui-byline-avatar"
              :src="author.avatar"
              :alt="author.name"
              width="40"
              height="40"
              loading="lazy"
            />
          </template>

          <div class="vp-blog-ui-byline-body">
            <dl class="vp-blog-ui-byline-meta">
              <dt class="vp-blog-sr-only">{{ strings.name }}</dt>
              <dd class="vp-blog-ui-byline-name">
                <a
                  v-if="author.url"
                  :href="author.url"
                  :target="isExternal(author.url) ? '_blank' : undefined"
                  :rel="isExternal(author.url) ? 'noopener' : undefined"
                  :class="
                    isExternal(author.url) ? EXTERNAL_LINK_CLASS : undefined
                  "
                  class="vp-blog-link"
                  >{{ author.name }}</a
                >
                <template v-else>{{ author.name }}</template>
              </dd>
            </dl>

            <!-- `?.` because this component is exported: a Site may hand-build a
                 `ResolvedAuthor` that predates Social Links, and `verify-package` renders
                 exactly such an Author to keep that working. -->
            <BlogSocialLinks
              v-if="author.socials?.length"
              :socials="author.socials"
              :strings="strings"
            />
          </div>
        </li>
      </ul>
    </dd>
  </dl>
</template>
