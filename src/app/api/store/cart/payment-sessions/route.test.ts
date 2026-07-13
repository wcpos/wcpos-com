import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetAuthToken = vi.fn()
const mockCreatePaymentCollection = vi.fn()
const mockCreatePaymentSession = vi.fn()
const mockCreateCustomerSession = vi.fn()
const mockGetCart = vi.fn()
const mockGetProOfferCatalog = vi.fn()
const REQUEST_IP = '203.0.113.7'

const {
  mockIpLimiterConsume,
  mockCustomerLimiterConsume,
  mockCreateRateLimiter,
  rateLimiterOptions,
} = vi.hoisted(() => {
  const ipConsume = vi.fn()
  const customerConsume = vi.fn()
  const options: Array<{ prefix: string; limit: number; window: string }> = []
  const createRateLimiter = vi.fn((config: {
    prefix: string
    limit: number
    window: string
  }) => {
    options.push(config)
    const { prefix } = config
    if (prefix === 'checkout:payment-session:ip') {
      return { consume: ipConsume }
    }
    if (prefix === 'checkout:payment-session:customer') {
      return { consume: customerConsume }
    }
    throw new Error(`Unexpected rate-limit prefix: ${prefix}`)
  })

  return {
    mockIpLimiterConsume: ipConsume,
    mockCustomerLimiterConsume: customerConsume,
    mockCreateRateLimiter: createRateLimiter,
    rateLimiterOptions: options,
  }
})

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly: async () => {},
  ViewOnlyError: class ViewOnlyError extends Error {},
}))

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
}))

vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: (options: {
    prefix: string
    limit: number
    window: string
  }) => mockCreateRateLimiter(options),
  clientIp: () => REQUEST_IP,
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
  billing_address: {
    first_name: 'Ada',
    last_name: 'Lovelace',
    address_1: '42 Wallaby Way',
    city: 'Sydney',
    postal_code: '2000',
    country_code: 'au',
  },
  items: [{ variant_id: 'variant_yearly_current', quantity: 1 }],
}

// The route reads the session JWT via getAuthToken and forwards it to the
// medusa client so Medusa attaches a persistent Stripe Customer to the intent.
const AUTH_TOKEN = 'jwt_customer_token'

function makeRequest(body: unknown, host = 'localhost:3000') {
  return new NextRequest(
    'http://localhost:3000/api/store/cart/payment-sessions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host },
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
    mockIpLimiterConsume.mockResolvedValue({
      success: true,
      remaining: 19,
      status: 'allowed',
    })
    mockCustomerLimiterConsume.mockResolvedValue({
      success: true,
      remaining: 7,
      status: 'allowed',
    })
    mockCreateCustomerSession.mockResolvedValue('cuss_secret_test')
    mockGetProOfferCatalog.mockResolvedValue({
      offers: [
        { planId: 'yearly', handle: 'wcpos-pro-yearly', variantId: 'variant_yearly_current' },
        { planId: 'lifetime', handle: 'wcpos-pro-lifetime', variantId: 'variant_lifetime_current' },
      ],
    })
  })

  it('configures the exact IP and customer allocation limits', () => {
    expect(rateLimiterOptions).toEqual([
      {
        prefix: 'checkout:payment-session:ip',
        limit: 20,
        window: '15 m',
      },
      {
        prefix: 'checkout:payment-session:customer',
        limit: 8,
        window: '15 m',
      },
    ])
  })

  it('returns 401 when the customer is not authenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.errorCode).toBe('authentication_required')
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
  })

  it('rejects a cart without a complete billing address before allocation', async () => {
    mockGetCart.mockResolvedValueOnce({
      ...validCart,
      billing_address: undefined,
    })

    const response = await POST(makeRequest({ cartId: 'cart_1' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      errorCode: 'billing_address_required',
    })
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
    expect(mockCreatePaymentSession).not.toHaveBeenCalled()
    expect(mockCreateCustomerSession).not.toHaveBeenCalled()
  })

  it('returns 429 before allocation when the IP rate limit is exceeded', async () => {
    mockIpLimiterConsume.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      status: 'limited',
    })

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json.errorCode).toBe('rate_limited')
    expect(mockIpLimiterConsume).toHaveBeenCalledWith(REQUEST_IP)
    expect(mockGetCart).not.toHaveBeenCalled()
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
    expect(mockCreatePaymentSession).not.toHaveBeenCalled()
  })

  it('returns 429 before allocation when the customer rate limit is exceeded', async () => {
    mockCustomerLimiterConsume.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      status: 'limited',
    })

    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json.errorCode).toBe('rate_limited')
    expect(mockIpLimiterConsume).toHaveBeenCalledWith(REQUEST_IP)
    expect(mockCustomerLimiterConsume).toHaveBeenCalledWith('cust_1')
    expect(mockGetCart).not.toHaveBeenCalled()
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
    expect(mockCreatePaymentSession).not.toHaveBeenCalled()
  })

  it('returns 503 before allocation when the IP limiter is unavailable', async () => {
    mockIpLimiterConsume.mockResolvedValueOnce({
      success: true,
      remaining: Infinity,
      status: 'unavailable',
    })

    const response = await POST(
      makeRequest({ cartId: 'cart_1' }, 'wcpos.com')
    )
    const json = await response.json()

    expect(response.status).toBe(503)
    expect(json.errorCode).toBe('rate_limit_unavailable')
    expect(mockIpLimiterConsume).toHaveBeenCalledWith(REQUEST_IP)
    expect(mockGetCart).not.toHaveBeenCalled()
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
    expect(mockCreatePaymentSession).not.toHaveBeenCalled()
  })

  it('returns 503 before allocation when the customer limiter is unavailable', async () => {
    mockCustomerLimiterConsume.mockResolvedValueOnce({
      success: true,
      remaining: Infinity,
      status: 'unavailable',
    })

    const response = await POST(
      makeRequest({ cartId: 'cart_1' }, 'wcpos.com')
    )
    const json = await response.json()

    expect(response.status).toBe(503)
    expect(json.errorCode).toBe('rate_limit_unavailable')
    expect(mockIpLimiterConsume).toHaveBeenCalledWith(REQUEST_IP)
    expect(mockCustomerLimiterConsume).toHaveBeenCalledWith('cust_1')
    expect(mockGetCart).not.toHaveBeenCalled()
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
    expect(mockCreatePaymentSession).not.toHaveBeenCalled()
  })

  it('allows unavailable limiters only on a strict loopback host', async () => {
    mockIpLimiterConsume.mockResolvedValueOnce({
      success: true,
      remaining: Infinity,
      status: 'unavailable',
    })
    mockCustomerLimiterConsume.mockResolvedValueOnce({
      success: true,
      remaining: Infinity,
      status: 'unavailable',
    })
    mockCreatePaymentCollection.mockResolvedValueOnce({ id: 'paycol_1' })
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })

    const response = await POST(makeRequest({ cartId: 'cart_1' }))

    expect(response.status).toBe(200)
    expect(mockIpLimiterConsume).toHaveBeenCalledWith(REQUEST_IP)
    expect(mockCustomerLimiterConsume).toHaveBeenCalledWith('cust_1')
    expect(mockCreatePaymentSession).toHaveBeenCalledOnce()
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
      ...validCart,
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

  it('passes the cart locale as BTCPay payment-session data', async () => {
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
      { locale: 'fr-FR' }
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

  it.each(['pp_system_default', 'pp_custom'])(
    'rejects non-checkout provider %s before payment allocation',
    async (providerId) => {
      const response = await POST(
        makeRequest({ cartId: 'cart_1', provider_id: providerId })
      )

      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        errorCode: 'payment_provider_not_allowed',
      })
      expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
      expect(mockCreatePaymentSession).not.toHaveBeenCalled()
    }
  )

  it('reuses an existing payment collection when provided', async () => {
    mockCreatePaymentSession.mockResolvedValueOnce({
      clientSecret: 'pi_secret',
      paymentSessionId: 'payses_1',
    })

    const response = await POST(
      makeRequest({
        cartId: 'cart_1',
        paymentCollectionId: 'paycol_existing',
        provider_id: 'pp_paypal_paypal',
      })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      'paycol_existing',
      'pp_paypal_paypal',
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
