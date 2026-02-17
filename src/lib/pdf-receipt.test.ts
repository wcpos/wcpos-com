import { describe, expect, it } from 'vitest'
import { inflateSync } from 'zlib'
import { buildTaxReceiptPdf } from './pdf-receipt'

const baseOrder = {
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
      title: 'WCPOS Pro Yearly',
      quantity: 1,
      unit_price: 129,
      total: 129,
    },
  ],
}

describe('buildTaxReceiptPdf', () => {
  it('builds a PDF document', async () => {
    const pdf = await buildTaxReceiptPdf(baseOrder)
    const bytes = Buffer.from(pdf)

    expect(bytes.subarray(0, 4).toString('utf8')).toBe('%PDF')
    expect(bytes.byteLength).toBeGreaterThan(1000)
  })

  it('renders billing details and tax number when provided', async () => {
    const pdf = await buildTaxReceiptPdf(baseOrder, {
      countryCode: 'US',
      addressLine1: '123 Main St',
      city: 'Austin',
      region: 'TX',
      postalCode: '78701',
      taxNumber: '12-3456789',
    })

    const bytes = Buffer.from(pdf)
    const raw = bytes.toString('latin1')
    const streamMatch = raw.match(/stream\r?\n([\s\S]*?)\r?\nendstream/)
    const streamContent = streamMatch?.[1]
    expect(streamContent).toBeTruthy()

    const decodedStream = inflateSync(Buffer.from(streamContent!, 'latin1')).toString('latin1')

    expect(decodedStream).toContain('42696C6C696E672064657461696C73')
    expect(decodedStream).toContain('31322D33343536373839')
  })

  it('does not throw when order content includes unicode characters', async () => {
    const unicodeOrder = {
      ...baseOrder,
      email: 'unicode@example.com',
      items: [
        {
          ...baseOrder.items[0],
          title: 'WCPOS Pro – São Paulo 😄',
        },
      ],
    }

    await expect(buildTaxReceiptPdf(unicodeOrder)).resolves.toBeInstanceOf(
      Uint8Array
    )
  })

  it('does not throw when order data includes unexpected values', async () => {
    const malformedOrder = {
      ...baseOrder,
      email: null as unknown as string,
      currency_code: 'invalid',
      items: [
        {
          ...baseOrder.items[0],
          title: null as unknown as string,
          unit_price: Number.NaN,
          total: Number.NaN,
        },
      ],
    }

    await expect(buildTaxReceiptPdf(malformedOrder)).resolves.toBeInstanceOf(
      Uint8Array
    )
  })
})
