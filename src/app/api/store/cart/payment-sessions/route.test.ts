import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockCreatePaymentCollection = vi.fn()
const mockCreatePaymentSession = vi.fn()
const mockGetCart = vi.fn()
const mockGetProOfferCatalog = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  createPaymentCollection: (...args: unknown[]) =>
    mockCreatePaymentCollection(...args),
  createPaymentSession: (...args: unknown[]) =>
    mockCreatePaymentSession(...args),
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

const validCart = {
  id: 'cart_1',
  items: [{ variant_id: 'variant_yearly_current', quantity: 1 }],
}

function makeRequest(body: unknown) {
  return new NextRequest(
    'http://localhost:3000/api/store/cart/payment-sessions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
}

describe('POST /api/store/cart/payment-sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomer.mockResolvedValue({ id: 'cust_1' })
    mockGetCart.mockResolvedValue(validCart)
    mockGetProOfferCatalog.mockResolvedValue({
      offers: [
        { planId: 'yearly', handle: 'wcpos-pro-yearly', variantId: 'variant_yearly_current' },
        { planId: 'lifetime', handle: 'wcpos-pro-lifetime', variantId: 'variant_lifetime_current' },
      ],
    })
  })

  it('returns 401 when the customer is not authenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Authentication required')
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
  })

  it('returns 400 when cartId is missing', async () => {
    const response = await POST(makeRequest({}))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Cart ID is required')
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
  })

  it('returns 400 when the request body is not an object', async () => {
    const response = await POST(makeRequest(null))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Invalid request body')
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
  })

  it('returns 400 when cartId is not a string', async () => {
    const response = await POST(makeRequest({ cartId: 123 }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Cart ID is required')
    expect(mockGetCart).not.toHaveBeenCalled()
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
  })

  it('creates a collection and session with the default stripe provider', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreatePaymentCollection).toHaveBeenCalledWith('cart_1')
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_1',
      'pp_stripe_stripe'
    )
    expect(mockGetCart).toHaveBeenCalledWith('cart_1')
    expect(json).toEqual({
      cart: validCart,
      paymentCollectionId: 'paycol_1',
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })
  })

  it('defaults non-string payment fields before Medusa calls', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })

    const response = await POST(
      makeRequest({
        cartId: 'cart_1',
        provider_id: { bad: true },
        paymentCollectionId: { bad: true },
      })
    )

    expect(response.status).toBe(200)
    expect(mockCreatePaymentCollection).toHaveBeenCalledWith('cart_1')
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_1',
      'pp_stripe_stripe'
    )
  })

  it('reuses an existing payment collection when provided', async () => {
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })

    const response = await POST(
      makeRequest({
        cartId: 'cart_1',
        paymentCollectionId: 'paycol_existing',
        provider_id: 'pp_custom',
      })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_existing',
      'pp_custom'
    )
    expect(json.paymentCollectionId).toBe('paycol_existing')
  })

  it('rejects carts that do not contain exactly one current Pro offer', async () => {
    mockGetCart.mockResolvedValueOnce({
      id: 'cart_1',
      items: [{ variant_id: 'variant_old_or_other', quantity: 1 }],
    })

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Current Pro offer cart is required')
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
    expect(mockCreatePaymentSession).not.toHaveBeenCalled()
  })

  it('returns 500 when the payment collection cannot be created', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce(null)

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to create payment collection')
    expect(mockCreatePaymentSession).not.toHaveBeenCalled()
  })

  it('returns 500 when the payment session cannot be created', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce(null)

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to create payment session')
  })

  it('returns 500 when the updated cart cannot be fetched', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })
    mockGetCart.mockResolvedValueOnce(validCart).mockResolvedValueOnce(null)

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to fetch cart')
  })

  it('returns 500 when the medusa client throws', async () => {
    mockCreatePaymentCollection.mockRejectedValueOnce(
      new Error('network error')
    )

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Internal server error')
  })
})
