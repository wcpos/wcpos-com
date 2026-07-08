import {
  localeDirections,
  type Locale,
  type LocaleDirection,
} from '@/i18n/config'
import { supportedBaseLocaleOrDefault } from '@/lib/locale-preferences'
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

export function resolveRootFallbackLocale(
  source?: string | readonly string[] | null
): Locale {
  return supportedBaseLocaleOrDefault(source)
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
