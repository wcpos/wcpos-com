export function formatDateForLocale(
  date: string | number | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''

  return new Intl.DateTimeFormat(locale, options).format(parsed)
}
