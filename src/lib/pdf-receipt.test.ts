import { describe, expect, it } from 'vitest'
import { inflateSync } from 'zlib'
import { buildTaxReceiptPdf } from './pdf-receipt'
import type { AccountOrderReceiptFact } from './account-order-projection'

const baseReceipt: AccountOrderReceiptFact = {
  displayId: 1001,
  customerEmail: 'user@example.com',
  currencyCode: 'usd',
  createdAt: '2026-02-01T00:00:00Z',
  billingProfile: {
    countryCode: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    taxNumber: null,
  },
  totals: {
    subtotal: 120,
    tax: 9,
    total: 129,
  },
  items: [
    {
      title: 'WCPOS Pro Yearly',
      quantity: 1,
      unitPrice: 129,
      total: 129,
    },
  ],
}

describe('buildTaxReceiptPdf', () => {
  it('builds a PDF document', async () => {
    const pdf = await buildTaxReceiptPdf(baseReceipt)
    const bytes = Buffer.from(pdf)

    expect(bytes.subarray(0, 4).toString('utf8')).toBe('%PDF')
    expect(bytes.byteLength).toBeGreaterThan(1000)
  })

  it('renders billing details and tax number when provided', async () => {
    const pdf = await buildTaxReceiptPdf({
      ...baseReceipt,
      billingProfile: {
        ...baseReceipt.billingProfile,
        countryCode: 'US',
        addressLine1: '123 Main St',
        city: 'Austin',
        region: 'TX',
        postalCode: '78701',
        taxNumber: '12-3456789',
      },
    })

    const bytes = Buffer.from(pdf)
    const raw = bytes.toString('latin1')
    const streamMatch = raw.match(/stream\r?\n([\s\S]*?)\r?\nendstream/)
    const streamContent = streamMatch?.[1]
    expect(streamContent).toBeTruthy()

    const decodedStream = inflateSync(
      Buffer.from(streamContent!, 'latin1')
    ).toString('latin1')

    expect(decodedStream).toContain('42696C6C696E672064657461696C73')
    expect(decodedStream).toContain('31322D33343536373839')
  })

  it('includes the legacy WooCommerce order number when provided', async () => {
    const pdf = await buildTaxReceiptPdf({
      ...baseReceipt,
      displayId: 5397,
      legacyDisplayId: 39509,
    })

    const bytes = Buffer.from(pdf)
    const raw = bytes.toString('latin1')
    const streamRegex = new RegExp('stream\\r?\\n([\\s\\S]*?)\\r?\\nendstream')
    const streamMatch = raw.match(streamRegex)
    const streamContent = streamMatch?.[1]
    expect(streamContent).toBeTruthy()

    const decodedStream = inflateSync(
      Buffer.from(streamContent!, 'latin1')
    ).toString('latin1')

    expect(decodedStream).toContain(
      '576F6F436F6D6D65726365206F7264657220233339353039'
    )
  })

  it('does not throw when order content includes unicode characters', async () => {
    const unicodeReceipt: AccountOrderReceiptFact = {
      ...baseReceipt,
      customerEmail: 'unicode@example.com',
      items: [
        {
          ...baseReceipt.items[0],
          title: 'WCPOS Pro – São Paulo 😄',
        },
      ],
    }

    await expect(buildTaxReceiptPdf(unicodeReceipt)).resolves.toBeInstanceOf(
      Uint8Array
    )
  })

  it('does not throw when order data includes unexpected values', async () => {
    const malformedReceipt: AccountOrderReceiptFact = {
      ...baseReceipt,
      customerEmail: null as unknown as string,
      currencyCode: 'invalid',
      items: [
        {
          ...baseReceipt.items[0],
          title: null as unknown as string,
          unitPrice: Number.NaN,
          total: Number.NaN,
        },
      ],
    }

    await expect(buildTaxReceiptPdf(malformedReceipt)).resolves.toBeInstanceOf(
      Uint8Array
    )
  })
})
