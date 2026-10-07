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
} from '../../cli/constants.mjs'

/**
 * The constants that matter are the ones that are a promise about another package.
 *
 * `VITEPRESS_VERSION` is a literal rather than a read of the manifest, because the
 * generated Site's VitePress pin is a value to review rather than one to inherit;
 * `THEME_VERSION` is derived, and this test is what proves the derivation still names
 * the package that exists. The manifest is read from disk rather than imported, so the
 * check does not simply agree with the code it is checking.
 */
const themeManifest = JSON.parse(
  readFileSync(
    path.join(import.meta.dirname, '..', '..', 'package.json'),
    'utf8'
  )
)

describe('constants', () => {
  it('pins the Theme version to the release that ships this CLI', () => {
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
