import { describe, expect, it } from 'vitest'
import { formatDateForLocale } from './date-format'

describe('formatDateForLocale', () => {
  it('formats default date displays as non-ambiguous localized long dates', () => {
    const isoDate = '2026-02-17T00:00:00.000Z'

    expect(formatDateForLocale(isoDate, 'en-US')).toBe('February 17, 2026')
    expect(formatDateForLocale(isoDate, 'de-DE')).toBe('17. Februar 2026')
  })

  it('does not use ambiguous numeric date separators by default', () => {
    const isoDate = '2026-02-17T00:00:00.000Z'

    expect(formatDateForLocale(isoDate, 'en-US')).not.toMatch(
      /\d{1,2}\/\d{1,2}\/\d{2,4}/
    )
    expect(formatDateForLocale(isoDate, 'de-DE')).not.toMatch(
      /\d{1,2}\.\d{1,2}\.\d{2,4}/
    )
  })

  it('preserves explicit date part options without adding dateStyle', () => {
    const isoDate = '2026-02-17T00:00:00.000Z'

    expect(
      formatDateForLocale(isoDate, 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    ).toBe('Feb 17, 2026')
  })

  it('returns empty string for invalid dates', () => {
    expect(formatDateForLocale('invalid-date', 'en-US')).toBe('')
  })

  it('supports Date and numeric timestamp inputs', () => {
    const timestamp = 1771286400000
    const date = new Date('2026-02-17T00:00:00.000Z')

    expect(formatDateForLocale(timestamp, 'en-US')).toBe('February 17, 2026')
    expect(formatDateForLocale(date, 'en-US')).toBe('February 17, 2026')
  })
})
