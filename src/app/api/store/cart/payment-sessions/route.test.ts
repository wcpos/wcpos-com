import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockCreatePaymentCollection = vi.fn()
const mockCreatePaymentSession = vi.fn()
const mockGetCart = vi.fn()

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

vi.mock('@/lib/logger', () => ({
  storeLogger: {
    error: vi.fn(),
  },
}))

import { POST } from './route'

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

  it('creates a collection and session with the default stripe provider', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })
    mockGetCart.mockResolvedValueOnce({ id: 'cart_1' })

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
      cart: { id: 'cart_1' },
      paymentCollectionId: 'paycol_1',
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })
  })

  it('reuses an existing payment collection when provided', async () => {
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })
    mockGetCart.mockResolvedValueOnce({ id: 'cart_1' })

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
    expect(mockGetCart).not.toHaveBeenCalled()
  })

  it('returns 500 when the updated cart cannot be fetched', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })
    mockGetCart.mockResolvedValueOnce(null)

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
