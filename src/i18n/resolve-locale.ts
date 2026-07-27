import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { locales, type Locale } from './config'

export function resolveLocale(candidate: string): Locale {
  if (!hasLocale(locales, candidate)) notFound()

  return candidate
}
