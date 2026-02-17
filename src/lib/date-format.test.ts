import { describe, expect, it } from 'vitest'
import { formatDateForLocale } from './date-format'

describe('formatDateForLocale', () => {
  it('formats dates using the provided locale', () => {
    const isoDate = '2026-02-17T00:00:00.000Z'

    expect(formatDateForLocale(isoDate, 'en-US')).toContain('2/17/2026')
    expect(formatDateForLocale(isoDate, 'de-DE')).toContain('17.2.2026')
  })
})
