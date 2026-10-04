/**
 * Date handling for Posts.
 *
 * The two jobs here are deliberately separate: `parseDate` produces a stable
 * instant for sorting, and `formatDate` produces a display string. Doing the
 * formatting once at build time keeps the client bundle free of `Intl` work and
 * keeps every Post's date string consistent between the list and the article.
 */

/**
 * Parse the payload of `gray-matter`'s YAML date handling.
 *
 * An unquoted `date: 2024-09-01` is parsed by YAML into a `Date`, while
 * `date: '2024-09-01'` stays a string. We normalise both to UTC noon so that the
 * sort order and the displayed calendar day do not depend on the build machine's
 * timezone or on whether the author quoted the value.
 */
export function parseDate(raw: unknown): Date | undefined {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return undefined
    const d = new Date(raw.getTime())
    d.setUTCHours(12, 0, 0, 0)
    return d
  }
  if (typeof raw === 'string' && raw.trim()) {
    const iso = raw.trim().slice(0, 10)
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
    if (match) {
      const [, y, m, day] = match
      return new Date(Date.UTC(+y, +m - 1, +day, 12))
    }
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return undefined
    parsed.setUTCHours(12, 0, 0, 0)
    return parsed
  }
  return undefined
}

/**
 * The default display format: `September 1, 2024` in whatever locale is asked for.
 */
export const DEFAULT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}

export function formatDate(
  date: Date,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  return date.toLocaleDateString(locale, options ?? DEFAULT_DATE_FORMAT)
}

/**
 * `yyyy-mm-dd` in UTC, for `<time datetime>` and for feed entry ids.
 */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
