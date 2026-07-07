import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  capturePayPalOrder,
  completeCart,
  createPaymentSession,
} from './complete-cart'
import { OrderPendingError } from './checkout-safety'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  }
}

beforeEach(() => {
  mockFetch.mockReset()
  // Restore first so each test gets a fresh spy with zeroed call counts.
  vi.restoreAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('completeCart', () => {
  it('posts cartId and experiment attribution fields', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ order: { id: 'order_1' } }))

    await completeCart({
      cartId: 'cart_1',
      experiment: 'pro_checkout_v1',
      experimentVariant: 'control',
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/store/cart/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartId: 'cart_1',
        experiment: 'pro_checkout_v1',
        experimentVariant: 'control',
      }),
    })
  })

  it('returns the created order id', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ order: { id: 'order_42' } }))

    const orderId = await completeCart({
      cartId: 'cart_1',
      experiment: 'pro_checkout_v1',
      experimentVariant: 'value_copy',
    })

    expect(orderId).toBe('order_42')
  })

  it('throws OrderPendingError when the response has no order id', async () => {
    // Regression: this used to log "Order created successfully" and return
    // null, which callers silently ignored after the payment was captured.
    mockFetch.mockResolvedValue(jsonResponse({}))

    await expect(
      completeCart({
        cartId: 'cart_1',
        experiment: 'pro_checkout_v1',
        experimentVariant: 'control',
      })
    ).rejects.toThrow(OrderPendingError)

    expect(console.error).toHaveBeenCalledWith(
      '[CHECKOUT] Cart completion returned no order id:',
      expect.objectContaining({ cartId: 'cart_1' })
    )
    expect(console.log).not.toHaveBeenCalledWith(
      '[CHECKOUT] Order created successfully:',
      expect.anything()
    )
  })

  it('throws OrderPendingError when the request fails', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'boom' }, false, 500))

    const promise = completeCart({
      cartId: 'cart_1',
      experiment: 'pro_checkout_v1',
      experimentVariant: 'control',
    })

    await expect(promise).rejects.toThrow('ORDER_PENDING')
    await expect(promise).rejects.toBeInstanceOf(OrderPendingError)
  })
})

describe('capturePayPalOrder', () => {
  it('posts the cart and PayPal order ids to the capture proxy', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }))

    await capturePayPalOrder({ cartId: 'cart_1', orderId: 'PAYPAL_ORDER_1' })

    expect(mockFetch).toHaveBeenCalledWith('/api/store/cart/paypal/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartId: 'cart_1',
        orderId: 'PAYPAL_ORDER_1',
      }),
    })
  })

  it('throws a retryable Error when PayPal capture fails', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'capture failed' }, false, 502))

    await expect(
      capturePayPalOrder({ cartId: 'cart_1', orderId: 'PAYPAL_ORDER_1' })
    ).rejects.toThrow('PAYPAL_CAPTURE_FAILED')
  })
})

describe('createPaymentSession', () => {
  it('posts cartId and provider_id, omitting paymentCollectionId when absent', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ cart: { id: 'cart_1' } }))

    await createPaymentSession({
      cartId: 'cart_1',
      providerId: 'pp_stripe_stripe',
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/store/cart/payment-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartId: 'cart_1',
        provider_id: 'pp_stripe_stripe',
      }),
    })
  })

  it('includes paymentCollectionId when provided', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ cart: { id: 'cart_1' } }))

    await createPaymentSession({
      cartId: 'cart_1',
      providerId: 'pp_paypal_paypal',
      paymentCollectionId: 'paycol_1',
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body).toEqual({
      cartId: 'cart_1',
      provider_id: 'pp_paypal_paypal',
      paymentCollectionId: 'paycol_1',
    })
  })

  it('returns the parsed response on success', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ cart: { id: 'cart_1' }, clientSecret: 'secret_1' })
    )

    const result = await createPaymentSession<{
      cart: { id: string }
      clientSecret: string
    }>({
      cartId: 'cart_1',
      providerId: 'pp_stripe_stripe',
    })

    expect(result.cart.id).toBe('cart_1')
    expect(result.clientSecret).toBe('secret_1')
  })

  it('throws the caller-supplied error code on failure', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'nope' }, false, 422))

    await expect(
      createPaymentSession({
        cartId: 'cart_1',
        providerId: 'pp_stripe_stripe',
        errorMessage: 'PAYMENT_INIT_FAILED',
      })
    ).rejects.toThrow('PAYMENT_INIT_FAILED')
  })

  it('throws a default error code when none is supplied', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, false, 500))

    await expect(
      createPaymentSession({
        cartId: 'cart_1',
        providerId: 'pp_stripe_stripe',
      })
    ).rejects.toThrow('PAYMENT_SESSION_FAILED')
  })
})
