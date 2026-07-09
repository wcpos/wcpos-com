import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetCart = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  getCart: (...args: unknown[]) => mockGetCart(...args),
}))

vi.mock('@/lib/logger', () => ({
  storeLogger: {
    error: vi.fn(),
  },
}))

import { GET } from './route'

const CHECKOUT_LINK = 'https://btcpay.example/i/inv_1'

function makeRequest(cartId?: string) {
  const url = new URL('http://localhost:3000/api/store/cart/payment-status')
  if (cartId) {
    url.searchParams.set('cartId', cartId)
  }
  return new NextRequest(url)
}

function cartWithInvoice(invoiceStatus: string, completedAt: string | null = null) {
  return {
    id: 'cart_1',
    email: 'buyer@example.com',
    completed_at: completedAt,
    payment_collection: {
      id: 'pay_col_1',
      payment_sessions: [
        {
          id: 'payses_1',
          provider_id: 'pp_btcpay_btcpay',
          status: 'pending',
          data: {
            checkoutLink: CHECKOUT_LINK,
            btc_invoice: { status: invoiceStatus, checkoutLink: CHECKOUT_LINK },
          },
        },
      ],
    },
  }
}

describe('GET /api/store/cart/payment-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomer.mockResolvedValue({ id: 'cust_1', email: 'buyer@example.com' })
  })

  it('requires authentication', async () => {
    mockGetCustomer.mockResolvedValue(null)

    const response = await GET(makeRequest('cart_1'))

    expect(response.status).toBe(401)
  })

  it('requires a cartId', async () => {
    const response = await GET(makeRequest())

    expect(response.status).toBe(400)
  })

  it('hides carts that belong to another customer', async () => {
    mockGetCart.mockResolvedValue({
      ...cartWithInvoice('New'),
      email: 'someone-else@example.com',
    })

    const response = await GET(makeRequest('cart_1'))

    expect(response.status).toBe(404)
  })

  it('reports completed once the cart has become an order', async () => {
    mockGetCart.mockResolvedValue(cartWithInvoice('Settled', '2026-07-09T00:00:00Z'))

    const response = await GET(makeRequest('cart_1'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      state: 'completed',
      checkoutLink: CHECKOUT_LINK,
    })
  })

  it.each([
    ['New', 'awaiting_payment'],
    ['Processing', 'confirming'],
    ['Settled', 'confirming'],
    ['Expired', 'expired'],
    ['Invalid', 'expired'],
  ])('maps invoice status %s to state %s', async (invoiceStatus, expected) => {
    mockGetCart.mockResolvedValue(cartWithInvoice(invoiceStatus))

    const response = await GET(makeRequest('cart_1'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      state: expected,
      checkoutLink: CHECKOUT_LINK,
    })
  })

  it('reports no_payment when the cart has no BTCPay session', async () => {
    mockGetCart.mockResolvedValue({
      id: 'cart_1',
      email: 'buyer@example.com',
      completed_at: null,
      payment_collection: { id: 'pay_col_1', payment_sessions: [] },
    })

    const response = await GET(makeRequest('cart_1'))

    expect(await response.json()).toEqual({ state: 'no_payment', checkoutLink: null })
  })

  it('falls back to the nested invoice checkoutLink', async () => {
    const cart = cartWithInvoice('New')
    delete (
      cart.payment_collection.payment_sessions[0].data as {
        checkoutLink?: string
      }
    ).checkoutLink

    mockGetCart.mockResolvedValue(cart)

    const response = await GET(makeRequest('cart_1'))

    expect(await response.json()).toEqual({
      state: 'awaiting_payment',
      checkoutLink: CHECKOUT_LINK,
    })
  })

  it('returns 404 when the cart cannot be fetched', async () => {
    mockGetCart.mockResolvedValue(null)

    const response = await GET(makeRequest('cart_missing'))

    expect(response.status).toBe(404)
  })
})
