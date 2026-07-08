import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as pdfReceipt from '@/lib/pdf-receipt'
import { defaultLocale, locales } from '@/i18n/config'

const mockGetOrderById = vi.fn()
const mockGetCustomer = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/lib/customer-orders', () => ({
  getOrderById: (...args: unknown[]) => mockGetOrderById(...args),
}))

import { GET } from './route'

function receiptMessages(locale: string) {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), `messages/${locale}.json`),
      'utf8'
    )
  ).account.receiptPdf
}

function mockReceiptOrder() {
  mockGetOrderById.mockResolvedValueOnce({
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
  })
}

describe('GET /api/account/orders/[orderId]/receipt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomer.mockResolvedValue({
      id: 'cust_1',
      metadata: {},
    })
  })

  it('returns a PDF receipt for an owned order', async () => {
    mockGetOrderById.mockResolvedValueOnce({
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
    })

    const response = await GET(
      new Request('http://localhost:3000/api/account/orders/order_1/receipt'),
      { params: Promise.resolve({ orderId: 'order_1' }) }
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/pdf')
    expect(response.headers.get('content-disposition')).toContain(
      'receipt-1001.pdf'
    )
  })

  it('localizes the PDF receipt download filename for international clients', async () => {
    mockGetOrderById.mockResolvedValueOnce({
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
    })

    const response = await GET(
      new Request(
        'http://localhost:3000/api/account/orders/order_1/receipt?locale=fr'
      ),
      { params: Promise.resolve({ orderId: 'order_1' }) }
    )

    const disposition = response.headers.get('content-disposition')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-language')).toBe('fr')
    expect(disposition).toContain('filename="receipt-1001.pdf"')
    expect(disposition).toContain("filename*=UTF-8''re%C3%A7u-1001.pdf")
    expect(disposition).not.toBe('attachment; filename="receipt-1001.pdf"')
  })

  it('localizes known WCPOS Pro product titles in PDF receipt line items', async () => {
    mockReceiptOrder()
    const buildPdfSpy = vi
      .spyOn(pdfReceipt, 'buildReceiptPdf')
      .mockResolvedValueOnce(new Uint8Array([0x25, 0x50, 0x44, 0x46]))

    try {
      const response = await GET(
        new Request(
          'http://localhost:3000/api/account/orders/order_1/receipt?locale=fr'
        ),
        { params: Promise.resolve({ orderId: 'order_1' }) }
      )

      expect(response.status).toBe(200)
      expect(buildPdfSpy).toHaveBeenCalledTimes(1)
      const [receipt] = buildPdfSpy.mock.calls[0]
      expect(receipt.items[0]?.title).toBe('WCPOS Pro annuel')
      expect(receipt.items[0]?.title).not.toBe('WCPOS Pro Yearly')
    } finally {
      buildPdfSpy.mockRestore()
    }
  })

  it('uses translated PDF receipt copy for every supported account locale', async () => {
    const englishTitle = receiptMessages(defaultLocale).title
    const buildPdfSpy = vi
      .spyOn(pdfReceipt, 'buildReceiptPdf')
      .mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]))

    try {
      for (const locale of locales.filter(
        (locale) => locale !== defaultLocale
      )) {
        mockReceiptOrder()

        const response = await GET(
          new Request(
            `http://localhost:3000/api/account/orders/order_1/receipt?locale=${locale}`
          ),
          { params: Promise.resolve({ orderId: 'order_1' }) }
        )

        expect(response.status).toBe(200)
        const [, copy, intlLocale] = buildPdfSpy.mock.calls.at(-1)!
        expect(copy.title).toBe(receiptMessages(locale).title)
        expect(copy.title).not.toBe(englishTitle)
        expect(intlLocale).toBe(locale)
      }
    } finally {
      buildPdfSpy.mockRestore()
    }
  })

  it('returns 404 when the order is not owned by the customer', async () => {
    mockGetOrderById.mockResolvedValueOnce(null)

    const response = await GET(
      new Request(
        'http://localhost:3000/api/account/orders/order_other/receipt'
      ),
      { params: Promise.resolve({ orderId: 'order_other' }) }
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ errorCode: 'order_not_found' })
  })

  it('accepts weighted Accept-Language headers', async () => {
    mockGetOrderById.mockResolvedValueOnce({
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
    })

    const response = await GET(
      new Request('http://localhost:3000/api/account/orders/order_1/receipt', {
        headers: {
          'accept-language': 'en-US;q=0.9,en;q=0.8',
        },
      }),
      { params: Promise.resolve({ orderId: 'order_1' }) }
    )

    expect(response.status).toBe(200)
  })

  it('honours Accept-Language quality weights for PDF receipt copy', async () => {
    mockGetOrderById.mockResolvedValueOnce({
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
    })
    const buildPdfSpy = vi
      .spyOn(pdfReceipt, 'buildReceiptPdf')
      .mockResolvedValueOnce(new Uint8Array([0x25, 0x50, 0x44, 0x46]))

    try {
      const response = await GET(
        new Request('http://localhost:3000/api/account/orders/order_1/receipt', {
          headers: {
            'accept-language': 'en-US;q=0.1, fr-FR;q=0.9',
          },
        }),
        { params: Promise.resolve({ orderId: 'order_1' }) }
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('content-language')).toBe('fr-FR')
      expect(buildPdfSpy).toHaveBeenCalledTimes(1)
      const [, copy, intlLocale] = buildPdfSpy.mock.calls[0]
      expect(copy.title).toBe('Reçu')
      expect(intlLocale).toBe('fr-FR')
    } finally {
      buildPdfSpy.mockRestore()
    }
  })

  it('prefers the explicit locale query over Accept-Language for account downloads', async () => {
    mockGetOrderById.mockResolvedValueOnce({
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
    })
    const buildPdfSpy = vi
      .spyOn(pdfReceipt, 'buildReceiptPdf')
      .mockResolvedValueOnce(new Uint8Array([0x25, 0x50, 0x44, 0x46]))

    try {
      const response = await GET(
        new Request(
          'http://localhost:3000/api/account/orders/order_1/receipt?locale=fr',
          {
            headers: {
              'accept-language': 'en-US;q=1.0',
            },
          }
        ),
        { params: Promise.resolve({ orderId: 'order_1' }) }
      )

      expect(response.status).toBe(200)
      expect(buildPdfSpy).toHaveBeenCalledTimes(1)
      const [, copy, intlLocale] = buildPdfSpy.mock.calls[0]
      expect(copy.title).toBe('Reçu')
      expect(intlLocale).toBe('fr')
    } finally {
      buildPdfSpy.mockRestore()
    }
  })

  it('strips Unicode locale extensions from explicit receipt locales', async () => {
    mockGetOrderById.mockResolvedValueOnce({
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
    })
    const buildPdfSpy = vi
      .spyOn(pdfReceipt, 'buildReceiptPdf')
      .mockResolvedValueOnce(new Uint8Array([0x25, 0x50, 0x44, 0x46]))

    try {
      const response = await GET(
        new Request(
          'http://localhost:3000/api/account/orders/order_1/receipt?locale=en-u-ca-buddhist-nu-arab'
        ),
        { params: Promise.resolve({ orderId: 'order_1' }) }
      )

      expect(response.status).toBe(200)
      expect(buildPdfSpy).toHaveBeenCalledTimes(1)
      const [, copy, intlLocale] = buildPdfSpy.mock.calls[0]
      expect(copy.title).toBe('Receipt')
      expect(intlLocale).toBe('en')
    } finally {
      buildPdfSpy.mockRestore()
    }
  })

  it('strips Unicode locale extensions from Accept-Language candidates', async () => {
    mockGetOrderById.mockResolvedValueOnce({
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
    })
    const buildPdfSpy = vi
      .spyOn(pdfReceipt, 'buildReceiptPdf')
      .mockResolvedValueOnce(new Uint8Array([0x25, 0x50, 0x44, 0x46]))

    try {
      const response = await GET(
        new Request('http://localhost:3000/api/account/orders/order_1/receipt', {
          headers: {
            'accept-language': 'en-u-ca-buddhist-nu-arab;q=1.0',
          },
        }),
        { params: Promise.resolve({ orderId: 'order_1' }) }
      )

      expect(response.status).toBe(200)
      expect(buildPdfSpy).toHaveBeenCalledTimes(1)
      const [, copy, intlLocale] = buildPdfSpy.mock.calls[0]
      expect(copy.title).toBe('Receipt')
      expect(intlLocale).toBe('en')
    } finally {
      buildPdfSpy.mockRestore()
    }
  })

  it('falls back when Accept-Language is invalid', async () => {
    mockGetOrderById.mockResolvedValueOnce({
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
    })

    const response = await GET(
      new Request('http://localhost:3000/api/account/orders/order_1/receipt', {
        headers: {
          'accept-language': '*',
        },
      }),
      { params: Promise.resolve({ orderId: 'order_1' }) }
    )

    expect(response.status).toBe(200)
  })

  it('returns 500 when receipt generation fails', async () => {
    mockGetOrderById.mockResolvedValueOnce({
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
    })

    const buildPdfSpy = vi
      .spyOn(pdfReceipt, 'buildReceiptPdf')
      .mockRejectedValueOnce(new Error('PDF failure'))

    const response = await GET(
      new Request('http://localhost:3000/api/account/orders/order_1/receipt'),
      { params: Promise.resolve({ orderId: 'order_1' }) }
    )

    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ errorCode: 'generation_failed' })

    buildPdfSpy.mockRestore()
  })
})
