import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockAddLineItem = vi.fn()
const mockGetCart = vi.fn()
const mockGetProOfferCatalog = vi.fn()

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly: async () => {},
  ViewOnlyError: class ViewOnlyError extends Error {},
}))

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  addLineItem: (...args: unknown[]) => mockAddLineItem(...args),
  getCart: (...args: unknown[]) => mockGetCart(...args),
}))

vi.mock('@/lib/pro-offer-catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/pro-offer-catalog')>()
  return {
    ...actual,
    getProOfferCatalog: (...args: unknown[]) => mockGetProOfferCatalog(...args),
  }
})

vi.mock('@/lib/logger', () => ({
  storeLogger: {
    error: vi.fn(),
  },
}))

import { POST } from './route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/store/cart/line-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/store/cart/line-items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomer.mockResolvedValue({
      id: 'cust_1',
      email: 'customer@example.com',
    })
    // Ownership binding: the route only mutates carts carrying the session
    // customer's email.
    mockGetCart.mockResolvedValue({
      id: 'cart_1',
      email: 'customer@example.com',
      items: [],
    })
    mockGetProOfferCatalog.mockResolvedValue({
      offers: [
        { planId: 'yearly', handle: 'wcpos-pro-yearly', variantId: 'variant_yearly_current' },
        { planId: 'lifetime', handle: 'wcpos-pro-lifetime', variantId: 'variant_lifetime_current' },
      ],
    })
  })

  it('returns 401 when the customer is not authenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', product: 'wcpos-pro-yearly' })
    )
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.errorCode).toBe('authentication_required')
    expect(mockAddLineItem).not.toHaveBeenCalled()
  })

  it('returns 400 when cartId is missing', async () => {
    const response = await POST(makeRequest({ product: 'wcpos-pro-yearly' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('cart_id_required')
    expect(mockAddLineItem).not.toHaveBeenCalled()
  })

  it('returns 400 when the request body is not an object', async () => {
    const response = await POST(makeRequest(null))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('invalid_request_body')
    expect(mockAddLineItem).not.toHaveBeenCalled()
  })

  it('returns 400 when cartId is not a string', async () => {
    const response = await POST(
      makeRequest({ cartId: 123, product: 'wcpos-pro-yearly' })
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('cart_id_required')
    expect(mockAddLineItem).not.toHaveBeenCalled()
  })

  it('returns 400 when no current Pro offer can be resolved', async () => {
    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('current_pro_offer_required')
    expect(mockAddLineItem).not.toHaveBeenCalled()
  })

  it('adds the line item with a default quantity of 1', async () => {
    mockAddLineItem.mockResolvedValueOnce({ id: 'cart_1', items: [] })

    const response = await POST(
      makeRequest({ cartId: 'cart_1', product: 'wcpos-pro-yearly' })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockAddLineItem).toHaveBeenCalledWith('cart_1', {
      variant_id: 'variant_yearly_current',
      quantity: 1,
    })
    expect(json.cart.id).toBe('cart_1')
  })

  it('rejects Pro checkout quantities other than 1', async () => {
    const response = await POST(
      makeRequest({ cartId: 'cart_1', product: 'wcpos-pro-yearly', quantity: 3 })
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('quantity_must_be_one')
    expect(mockAddLineItem).not.toHaveBeenCalled()
  })

  it('accepts a legacy variant id only when it is the current Pro offer variant', async () => {
    mockAddLineItem.mockResolvedValueOnce({ id: 'cart_1', items: [] })

    const response = await POST(
      makeRequest({ cartId: 'cart_1', variant_id: 'variant_lifetime_current' })
    )

    expect(response.status).toBe(200)
    expect(mockAddLineItem).toHaveBeenCalledWith('cart_1', {
      variant_id: 'variant_lifetime_current',
      quantity: 1,
    })
  })

  it('rejects non-current or non-Pro variant ids', async () => {
    const response = await POST(
      makeRequest({ cartId: 'cart_1', variant_id: 'variant_old_or_other' })
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('current_pro_offer_required')
    expect(mockAddLineItem).not.toHaveBeenCalled()
  })

  it('returns 500 when the medusa client returns no cart', async () => {
    mockAddLineItem.mockResolvedValueOnce(null)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', product: 'wcpos-pro-yearly' })
    )
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.errorCode).toBe('failed_add_item')
  })

  it('returns 500 when the medusa client throws', async () => {
    mockAddLineItem.mockRejectedValueOnce(new Error('network error'))

    const response = await POST(
      makeRequest({ cartId: 'cart_1', product: 'wcpos-pro-yearly' })
    )
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.errorCode).toBe('internal')
  })
})
