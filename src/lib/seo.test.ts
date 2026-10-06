import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  alternateOpenGraphLocales,
  languageAlternates,
  localeUrl,
  marketingMetadata,
  openGraphLocale,
  SITE_URL,
  SOCIAL_CARDS,
} from './seo'
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
  it('sets og:url to the canonical URL', () => {
    const metadata = marketingMetadata({ locale: 'fr', path: '/pro' })
    expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical)
    expect(metadata.openGraph?.url).toBe('https://wcpos.com/fr/pro')
  })

  it('uses the page social card when one exists', () => {
    const metadata = marketingMetadata({ locale: 'en', path: '/roadmap' })
    expect(metadata.openGraph?.images).toEqual(['/og/roadmap.png'])
    expect(metadata.twitter?.images).toEqual(['/og/roadmap.png'])
  })

  it('falls back to the site card', () => {
    const metadata = marketingMetadata({ locale: 'en', path: '/privacy' })
    expect(metadata.openGraph?.images).toEqual(['/opengraph-image.png'])
    expect(metadata.twitter?.images).toEqual(['/opengraph-image.png'])
  })

  it('keeps the site-wide OpenGraph fields', () => {
    const metadata = marketingMetadata({ locale: 'fr', path: '/pro' })
    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      siteName: 'WCPOS',
      locale: 'fr_FR',
    })
    expect(metadata.openGraph?.alternateLocale).toHaveLength(9)
    expect(metadata.openGraph?.alternateLocale).not.toContain('fr_FR')
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' })
  })

  it('has a generator entry for every social card', () => {
    const generator = readFileSync(
      'scripts/og-image/generate-page-cards.mjs',
      'utf8'
    )
    for (const card of Object.values(SOCIAL_CARDS)) {
      expect(generator).toContain(`slug: '${basename(card, '.png')}'`)
    }
  })

  it('ships a PNG for every social card', () => {
    for (const card of Object.values(SOCIAL_CARDS)) {
      expect(existsSync(join(process.cwd(), 'public', card))).toBe(true)
    }
  })

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

describe('OpenGraph locale helpers', () => {
  it('maps supported app locales to OpenGraph locale tags', () => {
    expect(openGraphLocale('en')).toBe('en_US')
    expect(openGraphLocale('fr')).toBe('fr_FR')
    expect(openGraphLocale('ja')).toBe('ja_JP')
    expect(openGraphLocale('zh')).toBe('zh_CN')
  })

  it('returns every other supported OpenGraph locale as alternates', () => {
    const alternates = alternateOpenGraphLocales('fr')

    expect(alternates).toContain('en_US')
    expect(alternates).toContain('de_DE')
    expect(alternates).not.toContain('fr_FR')
    expect(alternates).toHaveLength(locales.length - 1)
  })
})
