import { describe, it, expect } from 'vitest'
import { localeUrl, languageAlternates, marketingMetadata, SITE_URL } from './seo'
import { locales } from '@/i18n/config'

describe('localeUrl', () => {
  it('returns the bare site URL for the default locale root', () => {
    expect(localeUrl('en', '/')).toBe('https://wcpos.com')
    expect(localeUrl('en')).toBe('https://wcpos.com')
  })

  it('omits the locale prefix for the default locale', () => {
    expect(localeUrl('en', '/pro')).toBe('https://wcpos.com/pro')
  })

  it('prefixes non-default locales', () => {
    expect(localeUrl('fr', '/pro')).toBe('https://wcpos.com/fr/pro')
    expect(localeUrl('ja', '/')).toBe('https://wcpos.com/ja')
  })
})

describe('languageAlternates', () => {
  it('includes every supported locale plus x-default', () => {
    const alternates = languageAlternates('/roadmap')
    for (const locale of locales) {
      expect(alternates[locale]).toBeDefined()
    }
    expect(alternates['x-default']).toBe(`${SITE_URL}/roadmap`)
    expect(Object.keys(alternates)).toHaveLength(locales.length + 1)
  })

  it('uses unprefixed URLs only for the default locale', () => {
    const alternates = languageAlternates('/support')
    expect(alternates.en).toBe('https://wcpos.com/support')
    expect(alternates.de).toBe('https://wcpos.com/de/support')
  })
})

describe('marketingMetadata', () => {
  it('builds canonical for the requested locale', () => {
    const metadata = marketingMetadata({ locale: 'fr', path: '/pro' })
    expect(metadata.alternates?.canonical).toBe('https://wcpos.com/fr/pro')
  })

  it('passes through title and description', () => {
    const metadata = marketingMetadata({
      locale: 'en',
      path: '/support',
      title: 'Support',
      description: 'Get help',
    })
    expect(metadata.title).toBe('Support')
    expect(metadata.description).toBe('Get help')
    expect(metadata.alternates?.canonical).toBe('https://wcpos.com/support')
  })

  it('omits title/description when not provided', () => {
    const metadata = marketingMetadata({ locale: 'en', path: '/' })
    expect(metadata).not.toHaveProperty('title')
    expect(metadata).not.toHaveProperty('description')
  })
})
