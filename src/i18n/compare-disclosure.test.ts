import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The /compare method note and the Jovvie footer never promise a re-check
// schedule the pages do not keep. (metadata-length.test.ts keeps
// "WooCommerce POS" out of the disclosure in every locale.)
const LOCALES = ['en', 'de', 'nl', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh'] as const

// Each locale's old quarterly re-check clause, from git.
const OLD_QUARTERLY: Record<(typeof LOCALES)[number], string> = {
  en: 're-verified quarterly',
  de: 'vierteljährlich neu geprüft',
  nl: 'elk kwartaal opnieuw gecontroleerd',
  fr: 'revérifiées chaque trimestre',
  es: 'verificadas de nuevo cada trimestre',
  it: 'riverificati ogni trimestre',
  pt: 'verificados novamente a cada trimestre',
  ja: '四半期ごとに再検証',
  ko: '분기마다 다시 검증',
  zh: '每季度重新核实',
}

// Jovvie's facts have not been re-checked since 2026-07-09, so its footer
// carries no re-check promise; each locale's old closing sentence, from git.
const OLD_JOVVIE_PROMISE: Record<(typeof LOCALES)[number], string> = {
  en: 'We re-verify every quarter.',
  de: 'Wir überprüfen sie jedes Quartal erneut.',
  nl: 'We controleren ze elk kwartaal opnieuw.',
  fr: 'Nous les revérifions chaque trimestre.',
  es: 'Los volvemos a verificar cada trimestre.',
  it: 'Li verifichiamo di nuovo ogni trimestre.',
  pt: 'Verificamo-los novamente a cada trimestre.',
  ja: '四半期ごとに再確認します。',
  ko: '분기마다 다시 확인합니다.',
  zh: '我们每季度重新核实。',
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

  it.each(LOCALES)('%s method drops the quarterly re-check claim', (locale) => {
    expect(compare(locale).hub.method.body).not.toContain(OLD_QUARTERLY[locale])
  })

  it.each(LOCALES)('%s Jovvie footer drops the quarterly re-check promise', (locale) => {
    expect(compare(locale).jovvie.footer.factsDated).not.toContain(
      OLD_JOVVIE_PROMISE[locale],
    )
  })
})
