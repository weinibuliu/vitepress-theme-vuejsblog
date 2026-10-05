<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute, withBase } from 'vitepress'

import { useBlogConfig } from '../lib/useBlogConfig.js'
import { useLang } from '../lib/i18n.js'
import { requestedLocation } from '../lib/url.js'

/**
 * The 404.
 *
 * VitePress mounts this in place of a page whenever a route fails to resolve, so there is no
 * `frontmatter` and no Post to read. The one fact the page does have is the location the
 * reader asked for: VitePress leaves the route pointing at the URL that failed rather than
 * at `404.md`, which makes it worth showing — a reader who mistyped gets to see what they
 * mistyped. `requestedLocation` reassembles it from the route's three pieces.
 *
 * Centring is the shell's job, not this component's; the `404` section of `style.css` has
 * the reason and the height chain that makes it work.
 */
const route = useRoute()
const { site } = useData()

const strings = computed(() => useLang(site.value.lang))

/**
 * The route object is reactive and the 404 is not remounted when one bad URL follows
 * another, so this has to read it lazily — destructuring the route would freeze the first
 * location onto the page.
 */
const requested = computed(() => requestedLocation(route))
</script>

<template>
  <div class="vp-blog-content-not-found">
    <slot name="content-not-found">
      <!-- Decoration, not a second telling: the heading below is the page's real name, and
           a screen reader should hear it once. The numeral is not prose, so it is the one
           string the Theme shows that does not live in the language table. -->
      <p class="vp-blog-content-not-found-code" aria-hidden="true">404</p>

      <h1 class="vp-blog-content-not-found-title">{{ strings.notFound }}</h1>
      <p class="vp-blog-content-not-found-text">{{ strings.notFoundText }}</p>

      <p class="vp-blog-content-not-found-route">
        <span class="vp-blog-content-not-found-route-label">
          {{ strings.notFoundRoute }}
        </span>
        <!-- `bdi` for the same reason the footer and the hero use it: the location is one
             direction-bearing run inside a page that may be laid out the other way. -->
        <code class="vp-blog-content-not-found-route-path">
          <bdi>{{ requested }}</bdi>
        </code>
      </p>

      <p class="vp-blog-content-not-found-action">
        <a class="vp-blog-link" :href="withBase('/')">{{
          strings.backToBlog
        }}</a>
      </p>
    </slot>
  </div>
</template>
