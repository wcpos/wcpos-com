const DEFAULT_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'long',
  timeZone: 'UTC',
}

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

  return new Intl.DateTimeFormat(locale, formatOptions).format(parsed)
}
