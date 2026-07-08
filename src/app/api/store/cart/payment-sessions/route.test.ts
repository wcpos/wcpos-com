import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetAuthToken = vi.fn()
const mockCreatePaymentCollection = vi.fn()
const mockCreatePaymentSession = vi.fn()
const mockCreateCustomerSession = vi.fn()
const mockGetCart = vi.fn()
const mockGetProOfferCatalog = vi.fn()

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly: async () => {},
  ViewOnlyError: class ViewOnlyError extends Error {},
}))

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  createPaymentCollection: (...args: unknown[]) =>
    mockCreatePaymentCollection(...args),
  createPaymentSession: (...args: unknown[]) =>
    mockCreatePaymentSession(...args),
  createCustomerSession: (...args: unknown[]) =>
    mockCreateCustomerSession(...args),
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

// The route reads the session JWT via getAuthToken and forwards it to the
// medusa client so Medusa attaches a persistent Stripe Customer to the intent.
const AUTH_TOKEN = 'jwt_customer_token'

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
    mockGetAuthToken.mockResolvedValue(AUTH_TOKEN)
    mockGetCart.mockResolvedValue(validCart)
    mockCreateCustomerSession.mockResolvedValue('cuss_secret_test')
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
    expect(json.errorCode).toBe('authentication_required')
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
  })

  it('returns 400 when cartId is missing', async () => {
    const response = await POST(makeRequest({}))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('cart_id_required')
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
  })

  it('returns 400 when the request body is not an object', async () => {
    const response = await POST(makeRequest(null))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('invalid_request_body')
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
  })

  it('returns 400 when cartId is not a string', async () => {
    const response = await POST(makeRequest({ cartId: 123 }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('cart_id_required')
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
    expect(mockCreatePaymentCollection).toHaveBeenCalledWith('cart_1', AUTH_TOKEN)
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_1',
      'pp_stripe_stripe',
      AUTH_TOKEN
    )
    expect(mockGetCart).toHaveBeenCalledWith('cart_1')
    expect(json).toEqual({
      cart: validCart,
      paymentCollectionId: 'paycol_1',
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
      customerSessionClientSecret: 'cuss_secret_test',
    })
  })

  it('mints a CustomerSession for a yearly Stripe checkout', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(mockCreateCustomerSession).toHaveBeenCalledWith('cart_1', AUTH_TOKEN)
    expect(json.customerSessionClientSecret).toBe('cuss_secret_test')
  })

  it('does not mint a CustomerSession for a lifetime cart', async () => {
    mockGetCart.mockResolvedValue({
      id: 'cart_1',
      items: [{ variant_id: 'variant_lifetime_current', quantity: 1 }],
    })
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(mockCreateCustomerSession).not.toHaveBeenCalled()
    expect(json.customerSessionClientSecret).toBeNull()
  })

  it('does not mint a CustomerSession for a non-Stripe provider', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: null,
      paymentSessionId: 'payses_1',
    })

    const response = await POST(
      makeRequest({ cartId: 'cart_1', provider_id: 'pp_paypal_paypal' })
    )
    const json = await response.json()

    expect(mockCreateCustomerSession).not.toHaveBeenCalled()
    expect(json.customerSessionClientSecret).toBeNull()
  })

  it('normalizes a regional cart locale to a supported base locale for BTCPay', async () => {
    mockGetCart.mockResolvedValue({
      ...validCart,
      metadata: { locale: 'fr-FR' },
    })
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: null,
      paymentSessionId: 'payses_btcpay',
    })

    const response = await POST(
      makeRequest({ cartId: 'cart_1', provider_id: 'pp_btcpay_btcpay' })
    )

    expect(response.status).toBe(200)
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_1',
      'pp_btcpay_btcpay',
      AUTH_TOKEN,
      { locale: 'fr' }
    )
  })

  it('falls back to the default locale when the cart locale is unsupported', async () => {
    mockGetCart.mockResolvedValue({
      ...validCart,
      metadata: { locale: 'xx' },
    })
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: null,
      paymentSessionId: 'payses_btcpay',
    })

    const response = await POST(
      makeRequest({ cartId: 'cart_1', provider_id: 'pp_btcpay_btcpay' })
    )

    expect(response.status).toBe(200)
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_1',
      'pp_btcpay_btcpay',
      AUTH_TOKEN,
      { locale: 'en' }
    )
  })

  it('falls back to the default locale when the cart locale is path-like', async () => {
    mockGetCart.mockResolvedValue({
      ...validCart,
      metadata: { locale: '../../evil/path' },
    })
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: null,
      paymentSessionId: 'payses_btcpay',
    })

    const response = await POST(
      makeRequest({ cartId: 'cart_1', provider_id: 'pp_btcpay_btcpay' })
    )

    expect(response.status).toBe(200)
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_1',
      'pp_btcpay_btcpay',
      AUTH_TOKEN,
      { locale: 'en' }
    )
  })

  it('omits BTCPay session data when the cart has no locale', async () => {
    mockGetCart.mockResolvedValue({
      ...validCart,
      metadata: {},
    })
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: null,
      paymentSessionId: 'payses_btcpay',
    })

    const response = await POST(
      makeRequest({ cartId: 'cart_1', provider_id: 'pp_btcpay_btcpay' })
    )

    expect(response.status).toBe(200)
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_1',
      'pp_btcpay_btcpay',
      AUTH_TOKEN
    )
  })

  it('forwards the session JWT so Medusa can attach a Stripe Customer', async () => {
    mockGetAuthToken.mockResolvedValueOnce('jwt_specific')
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })

    const response = await POST(makeRequest({ cartId: 'cart_1' }))

    expect(response.status).toBe(200)
    expect(mockCreatePaymentCollection).toHaveBeenCalledWith('cart_1', 'jwt_specific')
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_1',
      'pp_stripe_stripe',
      'jwt_specific'
    )
  })

  it('degrades gracefully when no session token is present', async () => {
    // getCustomer succeeded but the cookie is somehow absent: the client
    // treats a null token as "publishable key only" rather than breaking
    // checkout. The purchase still completes (as a Stripe "Guest").
    mockGetAuthToken.mockResolvedValueOnce(null)
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })

    const response = await POST(makeRequest({ cartId: 'cart_1' }))

    expect(response.status).toBe(200)
    expect(mockCreatePaymentCollection).toHaveBeenCalledWith('cart_1', null)
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_1',
      'pp_stripe_stripe',
      null
    )
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
    expect(mockCreatePaymentCollection).toHaveBeenCalledWith('cart_1', AUTH_TOKEN)
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_1',
      'pp_stripe_stripe',
      AUTH_TOKEN
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
      'pp_custom',
      AUTH_TOKEN
    )
    expect(json.paymentCollectionId).toBe('paycol_existing')
  })

  it('treats a blank payment collection id as missing', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })

    const response = await POST(
      makeRequest({
        cartId: 'cart_1',
        paymentCollectionId: '   ',
      })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreatePaymentCollection).toHaveBeenCalledWith('cart_1', AUTH_TOKEN)
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_1',
      'pp_stripe_stripe',
      AUTH_TOKEN
    )
    expect(json.paymentCollectionId).toBe('paycol_1')
  })

  it('rejects carts that do not contain exactly one current Pro offer', async () => {
    mockGetCart.mockResolvedValueOnce({
      id: 'cart_1',
      items: [{ variant_id: 'variant_old_or_other', quantity: 1 }],
    })

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('current_pro_offer_cart_required')
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
    expect(mockCreatePaymentSession).not.toHaveBeenCalled()
  })

  it('returns 500 when the payment collection cannot be created', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce(null)

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.errorCode).toBe('failed_create_payment_collection')
    expect(mockCreatePaymentSession).not.toHaveBeenCalled()
  })

  it('returns 500 when the payment session cannot be created', async () => {
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce(null)

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.errorCode).toBe('failed_create_payment_session')
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
    expect(json.errorCode).toBe('failed_fetch_cart')
  })

  it('returns 500 when the medusa client throws', async () => {
    mockCreatePaymentCollection.mockRejectedValueOnce(
      new Error('network error')
    )

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.errorCode).toBe('internal')
  })
})
