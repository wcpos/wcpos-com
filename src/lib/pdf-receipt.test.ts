import { describe, expect, it } from 'vitest'
import { inflateSync } from 'zlib'
import { buildReceiptPdf } from './pdf-receipt'
import type { AccountOrderReceiptFact } from './account-order-projection'

const baseReceipt: AccountOrderReceiptFact = {
  displayId: 1001,
  customerEmail: 'user@example.com',
  customerName: null,
  paymentStatus: 'captured',
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
    subtotal: 129,
    tax: 0,
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

/** Decoded text-drawing stream of the PDF's single page. */
async function pageStream(pdf: Uint8Array): Promise<string> {
  const raw = Buffer.from(pdf).toString('latin1')
  const streamMatch = raw.match(/stream\r?\n([\s\S]*?)\r?\nendstream/)
  expect(streamMatch?.[1]).toBeTruthy()
  return inflateSync(Buffer.from(streamMatch![1], 'latin1')).toString('latin1')
}

/** drawText hex-encodes strings into the content stream. */
function hex(text: string): string {
  return Buffer.from(text, 'latin1').toString('hex').toUpperCase()
}

describe('buildReceiptPdf', () => {
  it('builds a PDF document', async () => {
    const pdf = await buildReceiptPdf(baseReceipt)
    const bytes = Buffer.from(pdf)

    expect(bytes.subarray(0, 4).toString('utf8')).toBe('%PDF')
    expect(bytes.byteLength).toBeGreaterThan(1000)
  })

  it('titles the document Receipt, never Tax Invoice / Tax Receipt', async () => {
    const stream = await pageStream(await buildReceiptPdf(baseReceipt))

    expect(stream).toContain(hex('Receipt'))
    expect(stream).not.toContain(hex('Tax Receipt'))
    expect(stream).not.toContain(hex('Tax Invoice'))
  })

  it('prints the seller identity and the GST statement', async () => {
    const stream = await pageStream(await buildReceiptPdf(baseReceipt))

    expect(stream).toContain(hex('WCPOS · ABN 86 792 035 060'))
    expect(stream).toContain(hex('not registered for GST in Australia'))
    expect(stream).toContain(hex('proof of purchase for your tax records'))
    expect(stream).toContain(hex('No tax has been added to this order.'))
  })

  it('renders billing name, details and tax number when provided', async () => {
    const stream = await pageStream(
      await buildReceiptPdf(
        {
          ...baseReceipt,
          customerName: 'Paul Kilmurray',
          billingProfile: {
            ...baseReceipt.billingProfile,
            countryCode: 'US',
            addressLine1: '123 Main St',
            city: 'Austin',
            region: 'TX',
            postalCode: '78701',
            taxNumber: '12-3456789',
          },
        }
      )
    )

    expect(stream).toContain(hex('Paul Kilmurray'))
    expect(stream).toContain(hex('123 Main St'))
    expect(stream).toContain(hex('Tax ID: 12-3456789'))
    expect(stream).toContain(hex('Paid'))
  })

  it('flags the WooCommerce order number on migrated orders', async () => {
    const withLegacy = await pageStream(
      await buildReceiptPdf({ ...baseReceipt, legacyDisplayId: 5396 })
    )
    expect(withLegacy).toContain(hex('#5396'))
    expect(withLegacy).toContain(hex('previous'))

    const withoutLegacy = await pageStream(
      await buildReceiptPdf(baseReceipt)
    )
    expect(withoutLegacy).not.toContain(hex('previous'))
  })

  it('renders a Tax totals row only when tax is nonzero', async () => {
    // "Tax" (capital T) only appears as the totals label — the base receipt
    // has no tax number and the fixed copy uses lowercase "tax".
    const zeroTax = await pageStream(await buildReceiptPdf(baseReceipt))
    expect(zeroTax).not.toContain(hex('Tax'))

    const withTax = await pageStream(
      await buildReceiptPdf(
        { ...baseReceipt, totals: { subtotal: 120, tax: 9, total: 129 } }
      )
    )
    expect(withTax).toContain(hex('Tax'))
    // The "no tax" disclaimer must not appear alongside a rendered Tax row.
    expect(withTax).not.toContain(hex('No tax has been added'))
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

    await expect(buildReceiptPdf(unicodeReceipt)).resolves.toBeInstanceOf(
      Uint8Array
    )
  })

  it('does not throw when order data includes unexpected values', async () => {
    const malformedReceipt: AccountOrderReceiptFact = {
      ...baseReceipt,
      customerEmail: null as unknown as string,
      customerName: 42 as unknown as string,
      paymentStatus: null,
      currencyCode: 'invalid',
      items: [
        {
          ...baseReceipt.items[0],
          title: null as unknown as string,
          unitPrice: Number.NaN,
          total: Number.NaN,
        },
      ],
      totals: {
        subtotal: Number.NaN,
        tax: Number.NaN,
        total: Number.NaN,
      },
    }

    await expect(buildReceiptPdf(malformedReceipt)).resolves.toBeInstanceOf(
      Uint8Array
    )
  })
})
