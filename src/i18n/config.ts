export const locales = ['en', 'fr', 'de', 'es', 'ja', 'zh', 'pt', 'it', 'nl', 'ko'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  ja: '日本語',
  zh: '中文',
  pt: 'Português',
  it: 'Italiano',
  nl: 'Nederlands',
  ko: '한국어',
}

export type LocaleDirection = 'ltr' | 'rtl'

export const localeDirections: Record<Locale, LocaleDirection> = {
  en: 'ltr',
  fr: 'ltr',
  de: 'ltr',
  es: 'ltr',
  ja: 'ltr',
  zh: 'ltr',
  pt: 'ltr',
  it: 'ltr',
  nl: 'ltr',
  ko: 'ltr',
}
