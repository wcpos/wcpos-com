import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as pdfReceipt from '@/lib/pdf-receipt'

const mockGetCustomerOrderById = vi.fn()
const mockGetCustomer = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomerOrderById: (...args: unknown[]) =>
    mockGetCustomerOrderById(...args),
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

import { GET } from './route'

describe('GET /api/account/orders/[orderId]/receipt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomer.mockResolvedValue({
      id: 'cust_1',
      metadata: {},
    })
  })

  it('returns a PDF receipt for an owned order', async () => {
    mockGetCustomerOrderById.mockResolvedValueOnce({
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

  it('returns 404 when the order is not owned by the customer', async () => {
    mockGetCustomerOrderById.mockResolvedValueOnce(null)

    const response = await GET(
      new Request(
        'http://localhost:3000/api/account/orders/order_other/receipt'
      ),
      { params: Promise.resolve({ orderId: 'order_other' }) }
    )

    expect(response.status).toBe(404)
  })

  it('accepts weighted Accept-Language headers', async () => {
    mockGetCustomerOrderById.mockResolvedValueOnce({
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

  it('falls back when Accept-Language is invalid', async () => {
    mockGetCustomerOrderById.mockResolvedValueOnce({
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
    mockGetCustomerOrderById.mockResolvedValueOnce({
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
      .spyOn(pdfReceipt, 'buildTaxReceiptPdf')
      .mockRejectedValueOnce(new Error('PDF failure'))

    const response = await GET(
      new Request('http://localhost:3000/api/account/orders/order_1/receipt'),
      { params: Promise.resolve({ orderId: 'order_1' }) }
    )

    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Failed to generate receipt' })

    buildPdfSpy.mockRestore()
  })
})
