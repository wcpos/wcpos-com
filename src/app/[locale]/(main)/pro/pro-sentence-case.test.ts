import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type enJson from '../../../../../messages/en.json'

type EnMessages = typeof enJson

const en = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'messages', 'en.json'), 'utf8')
) as EnMessages

const featureTitles: Record<string, string> = Object.fromEntries(
  Object.entries(en.pro.features)
    .filter(([, value]) => typeof value === 'object' && value !== null && 'title' in value)
    .map(([key, value]) => [key, (value as { title: string }).title])
)

const ALLOWED_CAPITALISED = new Set(['WCPOS', 'Pro', 'WooCommerce'])

describe('/pro headings in sentence case (en)', () => {
  it('uses the exact sentence-case feature titles and FAQ heading', () => {
    expect(featureTitles).toEqual({
      stores: 'More registers & multiple stores',
      terminal: 'Payment terminal integration',
      display: 'Customer-facing display',
      stockPrice: 'Stock & price editing',
      orders: 'Order management',
      customers: 'Customer management',
      coupons: 'Coupon management',
      reports: 'Reports across days, registers & stores',
      gateways: 'Custom payment gateways',
    })
    expect(en.pro.faq.title).toBe('Frequently asked questions')
  })

  it('capitalises no feature-title word after the first, except product names', () => {
    const offenders = Object.entries(featureTitles).flatMap(([key, title]) =>
      title
        .split(/\s+/)
        .slice(1)
        .map((word) => word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''))
        .filter((word) => /^\p{Lu}/u.test(word) && !ALLOWED_CAPITALISED.has(word))
        .map((word) => `${key}: ${word}`)
    )
    expect(offenders).toEqual([])
  })
})
