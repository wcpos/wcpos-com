import { describe, expect, it, vi } from 'vitest'
import { inflateSync } from 'zlib'
import { PDFDocument } from 'pdf-lib'
import { buildReceiptPdf, type ReceiptPdfCopy } from './pdf-receipt'
import type { AccountOrderReceiptFact } from './account-order-projection'


const TEST_COPY: ReceiptPdfCopy = {
  title: 'Receipt',
  orderNumber: (id) => `Order #${id}`,
  billedTo: 'BILLED TO',
  details: 'DETAILS',
  noEmailProvided: 'No email provided',
  taxId: (taxNumber) => `Tax ID: ${taxNumber}`,
  orderDate: 'Order date',
  payment: 'Payment',
  currency: 'Currency',
  legacyNotice: (legacyDisplayId) =>
    `This order was originally #${legacyDisplayId} in our previous store system. Older emails, invoices and records may reference that number.`,
  description: 'DESCRIPTION',
  quantity: 'QTY',
  unitPrice: 'UNIT PRICE',
  amount: 'AMOUNT',
  untitledItem: 'Untitled item',
  subtotal: 'Subtotal',
  tax: 'Tax',
  total: 'Total',
  noTaxAdded: 'No tax has been added to this order.',
  sellerIdentity: (sellerName, sellerAbn) =>
    sellerAbn ? `${sellerName} · ABN ${sellerAbn}` : sellerName,
  gstNotice: (sellerName) =>
    `${sellerName} is not registered for GST in Australia — no GST has been charged and this document is not a tax invoice.`,
  proofOfPurchase:
    'This receipt may be used as proof of purchase for your tax records.',
  questions: (website, email) => `Questions? ${website} · ${email}`,
  generated: (date) => `Generated ${date}`,
  paymentStatus: {
    paid: 'Paid',
    refunded: 'Refunded',
    partiallyRefunded: 'Partially refunded',
    canceled: 'Canceled',
    unknown: 'Translated unknown payment status',
  },
}

function buildTestReceiptPdf(
  receipt: AccountOrderReceiptFact,
  locale?: string
): Promise<Uint8Array> {
  return buildReceiptPdf(receipt, TEST_COPY, locale)
}

const baseReceipt: AccountOrderReceiptFact = {
  displayId: 1001,
  customerEmail: 'user@example.com',
  customerName: null,
  paymentStatus: 'captured',
  currencyCode: 'usd',
  createdAt: '2026-02-01T00:00:00Z',
  billingProfile: {
    company: null,
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
    const pdf = await buildTestReceiptPdf(baseReceipt)
    const bytes = Buffer.from(pdf)

    expect(bytes.subarray(0, 4).toString('utf8')).toBe('%PDF')
    expect(bytes.byteLength).toBeGreaterThan(1000)
  })

  it('titles the document Receipt, never Tax Invoice / Tax Receipt', async () => {
    const stream = await pageStream(await buildTestReceiptPdf(baseReceipt))

    expect(stream).toContain(hex('Receipt'))
    expect(stream).not.toContain(hex('Tax Receipt'))
    expect(stream).not.toContain(hex('Tax Invoice'))
  })

  it('prints the seller identity and the GST statement', async () => {
    const stream = await pageStream(await buildTestReceiptPdf(baseReceipt))

    expect(stream).toContain(hex('WCPOS · ABN 86 792 035 060'))
    expect(stream).toContain(hex('not registered for GST in Australia'))
    expect(stream).toContain(hex('proof of purchase for your tax records'))
    expect(stream).toContain(hex('No tax has been added to this order.'))
  })

  it('prints order dates in a localized non-ambiguous long format', async () => {
    const stream = await pageStream(
      await buildTestReceiptPdf(baseReceipt, 'en-US')
    )

    expect(stream).toContain(hex('February 1, 2026'))
    expect(stream).not.toContain(hex('2/1/2026'))
  })

  it('prints localized PDF receipt dates for non-English locales', async () => {
    const stream = await pageStream(
      await buildTestReceiptPdf(baseReceipt, 'fr-FR')
    )

    expect(stream).toContain(hex('1 février 2026'))
    expect(stream).not.toContain(hex('February 1, 2026'))
    expect(stream).not.toContain(hex('01/02/2026'))
  })

  it('prints generated dates in the same localized non-ambiguous format', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-08T00:00:00.000Z'))

    try {
      const localizedCopy: ReceiptPdfCopy = {
        ...TEST_COPY,
        generated: (date) => `Généré ${date}`,
      }
      const stream = await pageStream(
        await buildReceiptPdf(baseReceipt, localizedCopy, 'fr-FR')
      )

      expect(stream).toContain(hex('Généré 8 juillet 2026'))
      expect(stream).not.toContain(hex('Generated July 8, 2026'))
      expect(stream).not.toContain(hex('07/08/2026'))
    } finally {
      vi.useRealTimers()
    }
  })

  it('sets localized PDF document metadata for reader chrome and file previews', async () => {
    const localizedCopy: ReceiptPdfCopy = {
      ...TEST_COPY,
      title: 'Reçu',
      orderNumber: (id) => `Commande n° ${id}`,
    }
    const pdf = await PDFDocument.load(
      await buildReceiptPdf(baseReceipt, localizedCopy, 'fr-FR')
    )

    expect(pdf.getTitle()).toBe('Reçu')
    expect(pdf.getSubject()).toBe('Commande n° 1001')
    expect(pdf.getAuthor()).toBe('WCPOS')
    expect(
      Buffer.from(await pdf.save({ useObjectStreams: false })).toString('latin1')
    ).toContain('/Lang (fr-FR)')
  })

  it('falls back instead of throwing when receipt locale tags are malformed', async () => {
    const stream = await pageStream(
      await buildTestReceiptPdf(baseReceipt, 'not_a_locale')
    )

    expect(stream).toContain(hex('February 1, 2026'))
    expect(stream).not.toContain(hex('2/1/2026'))
  })

  it('uses translated copy for unknown payment statuses instead of humanizing them in English', async () => {
    const stream = await pageStream(
      await buildTestReceiptPdf({
        ...baseReceipt,
        paymentStatus: 'requires_action',
      })
    )

    expect(stream).toContain(hex('Translated unknown payment status'))
    expect(stream).not.toContain(hex('Requires action'))
  })

  it('renders billing name, details and tax number when provided', async () => {
    const stream = await pageStream(
      await buildTestReceiptPdf(
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

  it('renders the purchase-time company before the person name and billing details', async () => {
    const taxLine = TEST_COPY.taxId('DK12345678')
    const stream = await pageStream(
      await buildTestReceiptPdf({
        ...baseReceipt,
        customerEmail: 'ada@example.com',
        customerName: 'Ada Lovelace',
        billingProfile: {
          ...baseReceipt.billingProfile,
          company: 'Analytical Engines ApS',
          countryCode: 'DK',
          addressLine1: 'Vesterbrogade 1',
          city: 'København V',
          postalCode: '1620',
          taxNumber: 'DK12345678',
        },
      })
    )
    const billedTo = [
      'Analytical Engines ApS',
      'Ada Lovelace',
      'ada@example.com',
      'Vesterbrogade 1',
      '1620 København V',
      'Denmark',
      taxLine,
    ]
    const positions = billedTo.map((line) => stream.indexOf(hex(line)))

    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('formats billing address locality lines for postal-code-first countries', async () => {
    const stream = await pageStream(
      await buildTestReceiptPdf(
        {
          ...baseReceipt,
          billingProfile: {
            ...baseReceipt.billingProfile,
            countryCode: 'DE',
            addressLine1: 'Invalidenstraße 117',
            city: 'Berlin',
            region: 'Berlin',
            postalCode: '10115',
          },
        },
        'de-DE'
      )
    )

    expect(stream).toContain(hex('10115 Berlin'))
    expect(stream).toContain(hex('Deutschland'))
    expect(stream).not.toContain(hex('Berlin, Berlin, 10115'))
  })

  it('flags the WooCommerce order number on migrated orders', async () => {
    const withLegacy = await pageStream(
      await buildTestReceiptPdf({ ...baseReceipt, legacyDisplayId: 5396 })
    )
    expect(withLegacy).toContain(hex('#5396'))
    expect(withLegacy).toContain(hex('previous'))

    const withoutLegacy = await pageStream(
      await buildTestReceiptPdf(baseReceipt)
    )
    expect(withoutLegacy).not.toContain(hex('previous'))
  })

  it('renders a Tax totals row only when tax is nonzero', async () => {
    // "Tax" (capital T) only appears as the totals label — the base receipt
    // has no tax number and the fixed copy uses lowercase "tax".
    const zeroTax = await pageStream(await buildTestReceiptPdf(baseReceipt))
    expect(zeroTax).not.toContain(hex('Tax'))

    const withTax = await pageStream(
      await buildTestReceiptPdf(
        { ...baseReceipt, totals: { subtotal: 120, tax: 9, total: 129 } }
      )
    )
    expect(withTax).toContain(hex('Tax'))
    // The "no tax" disclaimer must not appear alongside a rendered Tax row.
    expect(withTax).not.toContain(hex('No tax has been added'))
  })

  it('truncates long item titles so they cannot overprint the numeric columns', async () => {
    const longTitle =
      'WCPOS Pro Yearly Subscription With An Extremely Long Product Name That Would Overflow The Column'
    const stream = await pageStream(
      await buildTestReceiptPdf({
        ...baseReceipt,
        items: [{ title: longTitle, quantity: 1, unitPrice: 129, total: 129 }],
      })
    )

    // Full title is trimmed; a leading portion still renders.
    expect(stream).not.toContain(hex(longTitle))
    expect(stream).toContain(hex('WCPOS Pro Yearly'))
  })

  it('truncates long billed-to lines so they cannot overprint the details column', async () => {
    const longEmail =
      'an-extremely-long-customer-email-address-that-overflows@really-long-domain-example.com'
    const stream = await pageStream(
      await buildTestReceiptPdf({ ...baseReceipt, customerEmail: longEmail })
    )

    expect(stream).not.toContain(hex(longEmail))
  })


  it('embeds fallback fonts for CJK receipt text instead of replacing it with question marks', async () => {
    const cjkCopy: ReceiptPdfCopy = {
      ...TEST_COPY,
      title: '收据',
      billedTo: '开票给',
      details: '詳細',
      description: '설명',
      noTaxAdded: '未添加税费。',
      generated: (date) => `生成于 ${date}`,
      questions: (website, email) => `问题：${website} · ${email}`,
      paymentStatus: {
        paid: '已付款',
        refunded: '已退款',
        partiallyRefunded: '部分退款',
        canceled: '已取消',
        unknown: '未知付款状态',
      },
    }
    const stream = await pageStream(
      await buildReceiptPdf(
        {
          ...baseReceipt,
          customerName: '山田太郎',
          billingProfile: {
            ...baseReceipt.billingProfile,
            addressLine1: '東京都千代田区',
            city: '서울',
            countryCode: 'JP',
          },
          items: [
            {
              ...baseReceipt.items[0],
              title: '收据 領収書 영수증',
            },
          ],
        },
        cjkCopy,
        'zh-CN'
      )
    )

    expect(stream).not.toContain(hex('?'))
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

    await expect(buildTestReceiptPdf(unicodeReceipt)).resolves.toBeInstanceOf(
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

    await expect(buildTestReceiptPdf(malformedReceipt)).resolves.toBeInstanceOf(
      Uint8Array
    )
  })
})
