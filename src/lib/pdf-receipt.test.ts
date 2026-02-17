import { describe, expect, it } from 'vitest'
import { buildTaxReceiptPdf, encodePdfTextToHex } from './pdf-receipt'

describe('encodePdfTextToHex', () => {
  it('encodes text as UTF-16BE with BOM', () => {
    expect(encodePdfTextToHex('Café')).toBe('FEFF00430061006600E9')
  })

  it('sanitizes control characters', () => {
    expect(encodePdfTextToHex('Line\nBreak')).toBe(
      encodePdfTextToHex('Line Break')
    )
  })
})

describe('buildTaxReceiptPdf', () => {
  it('uses hex text operators in the content stream', () => {
    const pdf = buildTaxReceiptPdf({
      id: 'order_1',
      status: 'completed',
      display_id: 1001,
      email: 'user@example.com',
      currency_code: 'usd',
      total: 129,
      subtotal: 120,
      tax_total: 9,
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      items: [
        {
          id: 'item_1',
          title: 'WCPOS Pro Café\nYearly',
          quantity: 1,
          unit_price: 129,
          total: 129,
        },
      ],
    })

    const content = Buffer.from(pdf).toString('utf8')

    expect(content).toContain('<FEFF')
    expect(content).not.toContain('(WCPOS - Tax Receipt)')
  })
})
