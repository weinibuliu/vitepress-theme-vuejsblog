import { describe, expect, it } from 'vitest'
import { ROOT_HELP, UsageError, parseArgs } from '../../cli/args.mjs'

/**
 * The flags are this package's published interface, so they are tested as an
 * interface: what a caller types, and what the rest of the programme is handed.
 */

describe('parseArgs', () => {
  it('reads the directory from the one positional', () => {
    expect(parseArgs(['my-blog']).targetDir).toBe('my-blog')
  })

  it('leaves everything unset when given nothing', () => {
    const args = parseArgs([])

    expect(args.targetDir).toBeUndefined()
    expect(args.options).toEqual({})
    expect(args.yes).toBe(false)
    expect(args.force).toBe(false)
    expect(args.help).toBe(false)
  })

  it('accepts a value after a space and after an equals sign', () => {
    expect(parseArgs(['--title', 'Notes']).options.title).toBe('Notes')
    expect(parseArgs(['--title=Notes']).options.title).toBe('Notes')
    expect(parseArgs(['-t', 'Notes']).options.title).toBe('Notes')
  })

  it('reads a value that begins with a dash', () => {
    // `--description -a note` is a description, not a missing value and a flag.
    expect(parseArgs(['--description', '-a note']).options.description).toBe(
      '-a note'
    )
  })

  it('keeps the negations on the same key as their positive', () => {
    expect(parseArgs(['--install']).options.install).toBe(true)
    expect(parseArgs(['--no-install']).options.install).toBe(false)
    expect(parseArgs(['--git']).options.git).toBe(true)
    expect(parseArgs(['--no-git']).options.git).toBe(false)
    expect(parseArgs(['--deploy']).options.deploy).toBe(true)
    expect(parseArgs(['--no-deploy']).options.deploy).toBe(false)
  })

  it('ignores the bare -- a package manager leaves behind when it forwards arguments', () => {
    const args = parseArgs(['site', '--', '--title', 'Notes'])

    expect(args.targetDir).toBe('site')
    expect(args.options.title).toBe('Notes')
  })

  it('rejects an unknown flag rather than ignoring it', () => {
    // Silently dropping it would scaffold with a default the caller believed they
    // had overridden, which is worse than refusing.
    expect(() => parseArgs(['--nope'])).toThrow(UsageError)
  })

  it('rejects a flag with no value', () => {
    expect(() => parseArgs(['--title'])).toThrow(/Missing value/)
  })

  it('rejects a value on a boolean flag', () => {
    expect(() => parseArgs(['--yes=true'])).toThrow(/does not take a value/)
  })

  it('rejects more than one directory', () => {
    expect(() => parseArgs(['a', 'b'])).toThrow(/at most one directory/)
  })

  it('rejects an unknown preset, naming the ones that exist', () => {
    expect(() => parseArgs(['--preset', 'mauve'])).toThrow(
      /emerald, rose, violet, amber/
    )
  })

  it('rejects an unknown package manager', () => {
    expect(() => parseArgs(['--package-manager', 'bower'])).toThrow(
      /Unknown package manager/
    )
  })

  it('requires an absolute base url', () => {
    expect(() => parseArgs(['--base-url', 'example.com'])).toThrow(/http/)
    expect(
      parseArgs(['--base-url', 'https://example.com']).options.origin
    ).toBe('https://example.com')
  })

  it('rejects an empty language', () => {
    expect(() => parseArgs(['--lang', ''])).toThrow(/must not be empty/)
  })
})

describe('ROOT_HELP', () => {
  it('names the init command, since it is the only one', () => {
    expect(ROOT_HELP).toContain('init [directory]')
  })

  it('points at the command help rather than repeating the options', () => {
    expect(ROOT_HELP).toContain('init --help')
    expect(ROOT_HELP).not.toContain('--package-manager')
  })
})
