import { describe, expect, it } from 'vitest'
import de from '../../../../../messages/de.json'
import en from '../../../../../messages/en.json'
import es from '../../../../../messages/es.json'
import fr from '../../../../../messages/fr.json'
import it_ from '../../../../../messages/it.json'
import ja from '../../../../../messages/ja.json'
import ko from '../../../../../messages/ko.json'
import nl from '../../../../../messages/nl.json'
import pt from '../../../../../messages/pt.json'
import zh from '../../../../../messages/zh.json'

const messages = { en, de, nl, fr, es, it: it_, pt, ja, ko, zh }

// The FAQ answer used to open by denying any limit; the free plugin runs one register.
const oldLeadingNegation: Record<keyof typeof messages, string> = {
  en: 'No.',
  de: 'Nein.',
  nl: 'Nee.',
  fr: 'Non.',
  es: 'No.',
  it: 'No.',
  pt: 'Não.',
  ja: 'いいえ。',
  ko: '아니요.',
  zh: '没有。',
}

const oldPricingDescription: Record<keyof typeof messages, string> = {
  en: 'Free forever. No transaction fees. No limits.',
  de: 'Dauerhaft kostenlos. Keine Transaktionsgebühren. Keine Limits.',
  nl: 'Voor altijd gratis. Geen transactiekosten. Geen limieten.',
  fr: 'Gratuit pour toujours. Aucun frais de transaction. Aucune limite.',
  es: 'Gratis para siempre. Sin comisiones por transacción. Sin límites.',
  it: 'Gratis per sempre. Nessuna commissione sulle transazioni. Nessun limite.',
  pt: 'Gratuito para sempre. Sem taxas de transação. Sem limites.',
  ja: 'ずっと無料。取引手数料なし。制限なし。',
  ko: '영원히 무료입니다. 거래 수수료도, 제한도 없습니다.',
  zh: '永久免费。无交易费。无限制。',
}

const locales = Object.keys(messages) as (keyof typeof messages)[]

describe('free plugin copy', () => {
  it('says in English that the free plugin runs one register', () => {
    expect(en.pro.faq.freePlugin.answer).toContain('one register')
    expect(en.home.pricing.free.description).toContain('One register')
    expect(en.home.pricing.free.description).not.toContain('No limits')
  })

  it('names refunds on the Order Management card', () => {
    expect(en.pro.features.orders.description).toMatch(/\brefund/i)
  })

  it.each(locales)('%s FAQ answer does not open with a denial', (locale) => {
    expect(messages[locale].pro.faq.freePlugin.answer.startsWith(oldLeadingNegation[locale])).toBe(
      false
    )
  })

  it.each(locales)('%s pricing card no longer claims no limits', (locale) => {
    expect(messages[locale].home.pricing.free.description).not.toBe(oldPricingDescription[locale])
  })
})
