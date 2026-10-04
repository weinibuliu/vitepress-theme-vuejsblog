import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PRESETS,
  PRESET_MARKS,
  THEME_PACKAGE,
  THEME_VERSION,
  VITEPRESS_VERSION,
  VUE_VERSION
} from '../src/constants.mjs'

/**
 * The constant that matters is the one that is a promise about another package.
 *
 * `THEME_VERSION` and `VITEPRESS_VERSION` are duplicated rather than imported, because
 * a published scaffolder cannot reach into its sibling at run time. Duplication is
 * fine as long as something notices when they diverge — this is that something, and
 * it reads the Theme's real manifest rather than a copy of it.
 */
const themeManifest = JSON.parse(
  readFileSync(
    path.join(import.meta.dirname, '..', '..', 'theme', 'package.json'),
    'utf8'
  )
)

describe('constants', () => {
  it('pins the Theme version to the Theme that exists', () => {
    expect(THEME_VERSION).toBe(`^${themeManifest.version}`)
  })

  it('pins the same VitePress the Theme declares as a peer', () => {
    expect(VITEPRESS_VERSION).toBe(themeManifest.peerDependencies.vitepress)
  })

  it('pins a Vue the Theme accepts', () => {
    const range = themeManifest.peerDependencies.vue
    const [major, minor] = VUE_VERSION.split('.')
    expect(range).toBe(`^${major}.${minor}.0`)
  })

  it('names the Theme package correctly', () => {
    expect(THEME_PACKAGE).toBe(themeManifest.name)
  })

  it('has a mark colour for every preset', () => {
    for (const preset of PRESETS) {
      expect(PRESET_MARKS[preset]).toMatch(/^#[0-9a-f]{6}$/)
      expect(preset).toMatch(/^[a-z]+$/)
    }
  })
})
