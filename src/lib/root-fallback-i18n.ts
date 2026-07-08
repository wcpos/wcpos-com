import {
  defaultLocale,
  localeDirections,
  locales,
  type Locale,
  type LocaleDirection,
} from '@/i18n/config'
import deMessages from '../../messages/de.json'
import enMessages from '../../messages/en.json'
import esMessages from '../../messages/es.json'
import frMessages from '../../messages/fr.json'
import itMessages from '../../messages/it.json'
import jaMessages from '../../messages/ja.json'
import koMessages from '../../messages/ko.json'
import nlMessages from '../../messages/nl.json'
import ptMessages from '../../messages/pt.json'
import zhMessages from '../../messages/zh.json'

interface RootFallbackCopy {
  locale: Locale
  direction: LocaleDirection
  errors: {
    genericTitle: string
    genericDescription: string
    tryAgain: string
    goHome: string
    notFoundTitle: string
    notFoundDescription: string
  }
  support: string
}

type RootFallbackMessages = Omit<RootFallbackCopy, 'locale'>

const ROOT_FALLBACK_MESSAGES = {
  de: { errors: deMessages.errors, support: deMessages.header.support },
  en: { errors: enMessages.errors, support: enMessages.header.support },
  es: { errors: esMessages.errors, support: esMessages.header.support },
  fr: { errors: frMessages.errors, support: frMessages.header.support },
  it: { errors: itMessages.errors, support: itMessages.header.support },
  ja: { errors: jaMessages.errors, support: jaMessages.header.support },
  ko: { errors: koMessages.errors, support: koMessages.header.support },
  nl: { errors: nlMessages.errors, support: nlMessages.header.support },
  pt: { errors: ptMessages.errors, support: ptMessages.header.support },
  zh: { errors: zhMessages.errors, support: zhMessages.header.support },
} satisfies Record<Locale, RootFallbackMessages>

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale)
}

function parseLanguagePreferences(
  source?: string | readonly string[] | null
): string[] {
  if (!source) return []

  if (typeof source !== 'string') {
    return [...source].filter(Boolean)
  }

  return source
    .split(',')
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

export function resolveRootFallbackLocale(
  source?: string | readonly string[] | null
): Locale {
  for (const preference of parseLanguagePreferences(source)) {
    try {
      const [canonical] = Intl.getCanonicalLocales(preference)
      const language = canonical?.split('-')[0]?.toLowerCase()
      if (language && isLocale(language)) {
        return language
      }
    } catch {
      // Ignore malformed language tags and continue through preferences.
    }
  }

  return defaultLocale
}

export function rootFallbackCopy(
  source?: string | readonly string[] | null
): RootFallbackCopy {
  const locale = resolveRootFallbackLocale(source)
  return { locale, direction: localeDirections[locale], ...ROOT_FALLBACK_MESSAGES[locale] }
}


export function browserLanguagePreferences(): string | readonly string[] | undefined {
  if (typeof navigator === 'undefined') return undefined

  return navigator.languages.length > 0 ? navigator.languages : navigator.language
}
