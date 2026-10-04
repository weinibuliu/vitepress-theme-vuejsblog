import { describe, expect, it } from 'vitest'
import {
  formatDate,
  parseDate,
  toISODate,
  DEFAULT_DATE_FORMAT
} from '../src/lib/date.js'

describe('parseDate', () => {
  it('normalises an unquoted YAML date (a Date) to UTC noon', () => {
    const parsed = parseDate(new Date('2024-09-01T00:00:00Z'))
    expect(parsed?.toISOString()).toBe('2024-09-01T12:00:00.000Z')
  })

  it('normalises a quoted ISO date to UTC noon', () => {
    const parsed = parseDate('2024-09-01')
    expect(parsed?.toISOString()).toBe('2024-09-01T12:00:00.000Z')
  })

  it('does not shift the calendar day for a Date at a negative offset', () => {
    // 2024-09-01T00:00:00-07:00 is 07:00Z on the 1st. Normalising to UTC noon must
    // keep it on the 1st rather than rolling it forward.
    const parsed = parseDate(new Date('2024-09-01T00:00:00-07:00'))
    expect(parsed?.toISOString().slice(0, 10)).toBe('2024-09-01')
  })

  it('rejects values that are not dates', () => {
    expect(parseDate(undefined)).toBeUndefined()
    expect(parseDate(null)).toBeUndefined()
    expect(parseDate('')).toBeUndefined()
    expect(parseDate('   ')).toBeUndefined()
    expect(parseDate('sometime last year')).toBeUndefined()
    expect(parseDate(new Date('nonsense'))).toBeUndefined()
    expect(parseDate(20240901)).toBeUndefined()
  })
})

describe('formatDate', () => {
  const date = new Date(Date.UTC(2024, 8, 1, 12))

  it('uses a long month, day and year by default', () => {
    expect(formatDate(date, 'en-US')).toBe('September 1, 2024')
    expect(DEFAULT_DATE_FORMAT).toEqual({
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  })

  it('follows the locale it is given', () => {
    expect(formatDate(date, 'en-GB')).toContain('2024')
    expect(formatDate(date, 'de-DE')).toContain('September')
  })

  it('lets a Site override the format', () => {
    expect(
      formatDate(date, 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    ).toBe('09/01/2024')
  })
})

describe('toISODate', () => {
  it('emits a bare yyyy-mm-dd in UTC', () => {
    expect(toISODate(new Date(Date.UTC(2024, 0, 5, 12)))).toBe('2024-01-05')
  })
})
