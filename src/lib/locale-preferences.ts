import { defaultLocale, locales, type Locale } from '@/i18n/config'

export function languagePreferences(
  source?: string | readonly string[] | null
): string[] {
  if (!source) return []

  const parts = typeof source === 'string' ? source.split(',') : [...source]

  return parts
    .map((part, index) => {
      const [language = '', ...params] = part.trim().split(';')
      const qParam = params.find((param) => param.trim().startsWith('q='))
      const q = qParam ? Number.parseFloat(qParam.split('=')[1] ?? '') : 1
      return {
        language: language.trim(),
        q: Number.isFinite(q) ? q : 0,
        index,
      }
    })
    .filter(({ language, q }) => Boolean(language) && language !== '*' && q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ language }) => language)
}

export function supportedBaseLocale(
  source?: string | readonly string[] | null
): Locale | undefined {
  for (const preference of languagePreferences(source)) {
    try {
      const [canonical] = Intl.getCanonicalLocales(preference)
      const language = canonical?.split('-')[0]?.toLowerCase()
      if (language && locales.includes(language as Locale)) {
        return language as Locale
      }
    } catch {
      // Ignore malformed language tags and continue through preferences.
    }
  }

  return undefined
}

export function supportedBaseLocaleOrDefault(
  source?: string | readonly string[] | null
): Locale {
  return supportedBaseLocale(source) ?? defaultLocale
}

export function supportedCanonicalLocale(
  source?: string | readonly string[] | null
): string | undefined {
  for (const preference of languagePreferences(source)) {
    try {
      const [canonical] = Intl.getCanonicalLocales(preference)
      const language = canonical?.split('-')[0]?.toLowerCase()
      if (language && locales.includes(language as Locale)) {
        return canonical
      }
    } catch {
      // Ignore malformed language tags and continue through preferences.
    }
  }

  return undefined
}
