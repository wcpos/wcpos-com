import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatDateForLocale } from './date-format'

const sourceRoot = path.resolve(process.cwd(), 'src')
const isoDate = '2026-02-17T00:00:00.000Z'

function walkSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir)) {
    const filePath = path.join(dir, entry)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      walkSourceFiles(filePath, out)
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec|d)\.tsx?$/.test(entry)) {
      out.push(filePath)
    }
  }
  return out
}

describe('formatDateForLocale', () => {
  it('formats default date displays as non-ambiguous localized long dates', () => {
    expect(formatDateForLocale(isoDate, 'en-US')).toBe('February 17, 2026')
    expect(formatDateForLocale(isoDate, 'de-DE')).toBe('17. Februar 2026')
  })

  it('does not use ambiguous numeric date separators by default', () => {
    expect(formatDateForLocale(isoDate, 'en-US')).not.toMatch(
      /\d{1,2}\/\d{1,2}\/\d{2,4}/
    )
    expect(formatDateForLocale(isoDate, 'de-DE')).not.toMatch(
      /\d{1,2}\.\d{1,2}\.\d{2,4}/
    )
  })

  it('preserves explicit date part options without adding dateStyle', () => {
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

  it('falls back safely when a malformed locale reaches a date display', () => {
    expect(formatDateForLocale(isoDate, 'not_a_locale')).toBe('February 17, 2026')
  })

  it('supports Date and numeric timestamp inputs', () => {
    const timestamp = 1771286400000
    const date = new Date('2026-02-17T00:00:00.000Z')

    expect(formatDateForLocale(timestamp, 'en-US')).toBe('February 17, 2026')
    expect(formatDateForLocale(date, 'en-US')).toBe('February 17, 2026')
  })

  it('keeps production date displays on the shared formatter', () => {
    const directDateTimeFormatters = walkSourceFiles(sourceRoot)
      .filter((filePath) => !filePath.endsWith('src/lib/date-format.ts'))
      .filter((filePath) =>
        fs.readFileSync(filePath, 'utf8').includes('new Intl.DateTimeFormat')
      )

    expect(directDateTimeFormatters).toEqual([])
  })
})
