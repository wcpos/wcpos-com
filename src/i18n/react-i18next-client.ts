'use client'

import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import enMessages from '../../messages/en.json'
import frMessages from '../../messages/fr.json'
import deMessages from '../../messages/de.json'
import esMessages from '../../messages/es.json'
import jaMessages from '../../messages/ja.json'
import zhMessages from '../../messages/zh.json'
import ptMessages from '../../messages/pt.json'
import itMessages from '../../messages/it.json'
import nlMessages from '../../messages/nl.json'
import koMessages from '../../messages/ko.json'

const resources = {
  en: { translation: enMessages },
  fr: { translation: frMessages },
  de: { translation: deMessages },
  es: { translation: esMessages },
  ja: { translation: jaMessages },
  zh: { translation: zhMessages },
  pt: { translation: ptMessages },
  it: { translation: itMessages },
  nl: { translation: nlMessages },
  ko: { translation: koMessages },
}

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })
}

export function setReactI18nextLanguage(language: string) {
  const normalized = language.split('-')[0]
  void i18next.changeLanguage(normalized)
}
