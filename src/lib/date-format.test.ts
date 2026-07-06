import { describe, expect, it } from 'vitest'
import {
  formatDateForLocale,
  formatDateTimeForLocale,
  formatMonthYearForLocale,
} from './date-format'

describe('formatDateForLocale', () => {
  it('formats dates with localized named months to avoid numeric-only ambiguity', () => {
    const isoDate = '2026-02-17T00:00:00.000Z'

    expect(formatDateForLocale(isoDate, 'en-US')).toBe('Feb 17, 2026')
    expect(formatDateForLocale(isoDate, 'de-DE')).toBe('17. Feb. 2026')
    expect(formatDateForLocale(isoDate, 'fr-FR')).toContain('févr')
    expect(formatDateForLocale(isoDate, 'en-US')).not.toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/)
  })

  it('returns empty string for invalid dates', () => {
    expect(formatDateForLocale('invalid-date', 'en-US')).toBe('')
  })

  it('supports Date and numeric timestamp inputs', () => {
    const timestamp = 1771286400000
    const date = new Date('2026-02-17T00:00:00.000Z')

    expect(formatDateForLocale(timestamp, 'en-US')).toContain('2026')
    expect(formatDateForLocale(date, 'en-US')).toContain('2026')
  })

  it('keeps a named month when callers request numeric month options', () => {
    const isoDate = '2026-02-17T00:00:00.000Z'

    expect(formatDateForLocale(isoDate, 'en-US', { month: '2-digit' })).toBe('Feb 17, 2026')
    expect(formatDateForLocale(isoDate, 'en-US', { month: 'numeric' })).toBe('Feb 17, 2026')
  })
})

describe('formatDateTimeForLocale', () => {
  it('formats date-times with localized named months and time', () => {
    const isoDate = '2026-02-17T15:45:00.000Z'

    const formatted = formatDateTimeForLocale(isoDate, 'en-US', { timeZone: 'UTC' })

    expect(formatted).toContain('Feb')
    expect(formatted).toContain('2026')
    expect(formatted).toContain('3:45')
    expect(formatted).not.toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}/)
  })
})

describe('formatMonthYearForLocale', () => {
  it('formats month and year with a localized named month in UTC', () => {
    const isoDate = '2026-09-01T00:00:00.000Z'

    expect(formatMonthYearForLocale(isoDate, 'en-US')).toBe('Sep 2026')
    expect(formatMonthYearForLocale(isoDate, 'de-DE')).toBe('Sept. 2026')
  })
})
