const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}

const DEFAULT_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DEFAULT_DATE_OPTIONS,
  hour: 'numeric',
  minute: '2-digit',
}

function ensureNamedMonth(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  const merged = {
    ...DEFAULT_DATE_OPTIONS,
    ...options,
  }

  if (merged.month === 'numeric' || merged.month === '2-digit') {
    merged.month = DEFAULT_DATE_OPTIONS.month
  }

  return merged
}

export function formatDateForLocale(
  date: string | number | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''

  return new Intl.DateTimeFormat(locale, ensureNamedMonth(options)).format(parsed)
}

export function formatDateTimeForLocale(
  date: string | number | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''

  return new Intl.DateTimeFormat(locale, {
    ...DEFAULT_DATE_TIME_OPTIONS,
    ...ensureNamedMonth(options),
  }).format(parsed)
}

export function formatMonthYearForLocale(
  date: string | number | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  const month =
    options?.month === 'numeric' || options?.month === '2-digit'
      ? 'short'
      : options?.month || 'short'

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
    month,
  }).format(parsed)
}
