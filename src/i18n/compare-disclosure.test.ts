import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The /compare disclosure (hub and every detail page) never names the product
// "WooCommerce POS" (WooCommerce is Automattic's trademark; the product is
// WCPOS), and the method note never promises a re-check schedule the pages
// do not keep.
const LOCALES = ['en', 'de', 'nl', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh'] as const

// Each locale's old "makers of WooCommerce POS" phrase and old quarterly
// clause, from git.
const OLD: Record<(typeof LOCALES)[number], { makers: string; quarterly: string }> = {
  en: { makers: 'the makers of WooCommerce POS', quarterly: 're-verified quarterly' },
  de: { makers: 'den Machern von WooCommerce POS', quarterly: 'vierteljährlich neu geprüft' },
  nl: { makers: 'de makers van WooCommerce POS', quarterly: 'elk kwartaal opnieuw gecontroleerd' },
  fr: { makers: 'les créateurs de WooCommerce POS', quarterly: 'revérifiées chaque trimestre' },
  es: { makers: 'los creadores de WooCommerce POS', quarterly: 'verificadas de nuevo cada trimestre' },
  it: { makers: 'i creatori di WooCommerce POS', quarterly: 'riverificati ogni trimestre' },
  pt: { makers: 'os criadores do WooCommerce POS', quarterly: 'verificados novamente a cada trimestre' },
  ja: { makers: 'WooCommerce POSの開発元', quarterly: '四半期ごとに再検証' },
  ko: { makers: 'WooCommerce POS 개발사', quarterly: '분기마다 다시 검증' },
  zh: { makers: 'WooCommerce POS 的开发者', quarterly: '每季度重新核实' },
}

function compare(locale: string) {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'),
  ).compare
}

describe('compare disclosure and method copy', () => {
  it('en disclosure says WCPOS publishes it and is not neutral', () => {
    expect(compare('en').disclosure.body).toBe(
      "This page is published by WCPOS, so we are not neutral. That is why every number is sourced and dated, we link to competitors' own pricing pages, and we say plainly when a competitor is the better choice. Check everything.",
    )
  })

  it('en method points at each page’s own checked date', () => {
    expect(compare('en').hub.method.body).toContain(
      'fetched on a stated date; each page shows when its facts were last checked.',
    )
  })

  it.each(LOCALES)('%s disclosure drops the old "makers of WooCommerce POS" phrase', (locale) => {
    expect(compare(locale).disclosure.body).not.toContain(OLD[locale].makers)
  })

  it.each(LOCALES)('%s method drops the quarterly re-check claim', (locale) => {
    expect(compare(locale).hub.method.body).not.toContain(OLD[locale].quarterly)
  })
})
