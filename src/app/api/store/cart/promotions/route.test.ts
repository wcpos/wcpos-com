import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetAuthToken = vi.fn()
const mockGetCart = vi.fn()
const mockAddCartPromotions = vi.fn()
const REQUEST_IP = '203.0.113.7'

const { mockIpLimiterConsume, mockCustomerLimiterConsume } = vi.hoisted(() => ({
  mockIpLimiterConsume: vi.fn(),
  mockCustomerLimiterConsume: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: (config: { prefix: string }) => {
    if (config.prefix === 'checkout:promotions:ip') {
      return { consume: mockIpLimiterConsume }
    }
    if (config.prefix === 'checkout:promotions:customer') {
      return { consume: mockCustomerLimiterConsume }
    }
    throw new Error(`Unexpected rate-limit prefix: ${config.prefix}`)
  },
  clientIp: () => REQUEST_IP,
}))

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly: async () => {},
  ViewOnlyError: class ViewOnlyError extends Error {},
}))

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  addCartPromotions: (...args: unknown[]) => mockAddCartPromotions(...args),
  getCart: (...args: unknown[]) => mockGetCart(...args),
}))

vi.mock('@/lib/logger', () => ({
  storeLogger: {
    error: vi.fn(),
  },
}))

import { POST } from './route'

function makeRequest(body: unknown, host = 'localhost:3000') {
  return new NextRequest('http://localhost:3000/api/store/cart/promotions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host },
    body: JSON.stringify(body),
  })
}

describe('POST /api/store/cart/promotions', () => {
  const customer = {
    id: 'cust_1',
    email: 'customer@example.com',
  }
  const existingCart = {
    id: 'cart_1',
    email: customer.email,
    items: [],
    discount_total: 0,
    promotions: [],
  }

  const allowed = { success: true, remaining: 5, status: 'allowed' as const }
  const limited = { success: false, remaining: 0, status: 'limited' as const }
  const unavailable = {
    success: true,
    remaining: Infinity,
    status: 'unavailable' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomer.mockResolvedValue(customer)
    mockGetAuthToken.mockResolvedValue('jwt_session')
    mockGetCart.mockResolvedValue(existingCart)
    mockIpLimiterConsume.mockResolvedValue(allowed)
    mockCustomerLimiterConsume.mockResolvedValue(allowed)
  })

  it('returns 401 when the customer is not authenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', code: 'PROMO10' })
    )

    expect(response.status).toBe(401)
    expect(mockAddCartPromotions).not.toHaveBeenCalled()
  })

  it('returns 429 when the IP limiter blocks the request', async () => {
    mockIpLimiterConsume.mockResolvedValueOnce(limited)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', code: 'PROMO10' })
    )

    expect(response.status).toBe(429)
    expect(mockIpLimiterConsume).toHaveBeenCalledWith(REQUEST_IP)
    expect(mockAddCartPromotions).not.toHaveBeenCalled()
  })

  it('returns 429 when the customer limiter blocks the request', async () => {
    mockCustomerLimiterConsume.mockResolvedValueOnce(limited)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', code: 'PROMO10' })
    )

    expect(response.status).toBe(429)
    expect(mockCustomerLimiterConsume).toHaveBeenCalledWith(customer.id)
    expect(mockAddCartPromotions).not.toHaveBeenCalled()
  })

  it('fails closed with 503 when the rate limiter is unavailable', async () => {
    mockIpLimiterConsume.mockResolvedValueOnce(unavailable)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', code: 'PROMO10' }, 'wcpos.com')
    )

    expect(response.status).toBe(503)
    expect(mockAddCartPromotions).not.toHaveBeenCalled()
  })

  it('bypasses limiter unavailability on loopback hosts', async () => {
    mockIpLimiterConsume.mockResolvedValueOnce(unavailable)
    mockCustomerLimiterConsume.mockResolvedValueOnce(unavailable)
    mockAddCartPromotions.mockResolvedValueOnce(existingCart)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', code: 'PROMO10' })
    )

    expect(response.status).toBe(200)
  })

  it('returns 404 when the cart belongs to another customer', async () => {
    mockGetCart.mockResolvedValueOnce({
      ...existingCart,
      email: 'other@example.com',
    })

    const response = await POST(
      makeRequest({ cartId: 'cart_1', code: 'PROMO10' })
    )

    expect(response.status).toBe(404)
    expect(mockAddCartPromotions).not.toHaveBeenCalled()
  })

  it.each([
    { name: 'missing code', body: { cartId: 'cart_1' } },
    { name: 'non-string code', body: { cartId: 'cart_1', code: 10 } },
    { name: 'empty code', body: { cartId: 'cart_1', code: '   ' } },
    {
      name: 'oversized code',
      body: { cartId: 'cart_1', code: 'x'.repeat(65) },
    },
  ])('returns 400 for $name', async ({ body }) => {
    const response = await POST(makeRequest(body))

    expect(response.status).toBe(400)
    expect(mockAddCartPromotions).not.toHaveBeenCalled()
  })

  it('returns applied true when Medusa attaches the promotion', async () => {
    const discountedCart = {
      ...existingCart,
      discount_total: 29,
      promotions: [{ code: 'PROMO10' }],
    }
    mockAddCartPromotions.mockResolvedValueOnce(discountedCart)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', code: '  PROMO10  ' })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockAddCartPromotions).toHaveBeenCalledWith(
      'cart_1',
      ['PROMO10'],
      'jwt_session'
    )
    expect(json).toEqual({ cart: discountedCart, applied: true })
  })

  it('returns applied false when Medusa leaves an invalid code unattached', async () => {
    mockAddCartPromotions.mockResolvedValueOnce(existingCart)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', code: 'EXPIRED' })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ cart: existingCart, applied: false })
  })

  it('returns 500 when the Medusa promotion request really fails', async () => {
    mockAddCartPromotions.mockResolvedValueOnce(null)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', code: 'PROMO10' })
    )

    expect(response.status).toBe(500)
  })
})
