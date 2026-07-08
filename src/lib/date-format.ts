const DEFAULT_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'long',
  timeZone: 'UTC',
}
const DEFAULT_DATE_LOCALE = 'en'

export function formatDateForLocale(
  date: string | number | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''

  const formatOptions = options
    ? { timeZone: 'UTC', ...options }
    : DEFAULT_DATE_FORMAT_OPTIONS

  try {
    return new Intl.DateTimeFormat(locale, formatOptions).format(parsed)
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_DATE_LOCALE, formatOptions).format(parsed)
  }
}
