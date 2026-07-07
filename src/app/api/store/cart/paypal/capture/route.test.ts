import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  class MockViewOnlyError extends Error {}

  return {
    MockViewOnlyError,
    mockAssertViewOnly: vi.fn(),
    mockGetCustomer: vi.fn(),
    mockGetAuthToken: vi.fn(),
    mockGetCart: vi.fn(),
    mockCapturePayPalOrder: vi.fn(),
    mockGetProOfferCatalog: vi.fn(),
    mockResolveProOfferCartSelection: vi.fn(),
  }
})

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly: (...args: unknown[]) => mocks.mockAssertViewOnly(...args),
  ViewOnlyError: mocks.MockViewOnlyError,
}))

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mocks.mockGetCustomer(...args),
  getAuthToken: (...args: unknown[]) => mocks.mockGetAuthToken(...args),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  getCart: (...args: unknown[]) => mocks.mockGetCart(...args),
  capturePayPalOrder: (...args: unknown[]) =>
    mocks.mockCapturePayPalOrder(...args),
}))

vi.mock('@/lib/pro-offer-catalog', () => ({
  getProOfferCatalog: (...args: unknown[]) =>
    mocks.mockGetProOfferCatalog(...args),
  resolveProOfferCartSelection: (...args: unknown[]) =>
    mocks.mockResolveProOfferCartSelection(...args),
}))

vi.mock('@/lib/logger', () => ({
  storeLogger: { error: vi.fn() },
}))

import { POST } from './route'

const validCart = {
  id: 'cart_1',
  email: 'customer@example.com',
  items: [{ variant_id: 'variant_yearly_current', quantity: 1 }],
}

function request(body: unknown = { cartId: 'cart_1', orderId: 'PAYPAL_ORDER_1' }) {
  return new NextRequest('http://localhost:3000/api/store/cart/paypal/capture', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/store/cart/paypal/capture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockAssertViewOnly.mockResolvedValue(undefined)
    mocks.mockGetCustomer.mockResolvedValue({
      id: 'cust_1',
      email: 'customer@example.com',
    })
    mocks.mockGetAuthToken.mockResolvedValue('jwt_tok')
    mocks.mockGetCart.mockResolvedValue(validCart)
    mocks.mockGetProOfferCatalog.mockResolvedValue({
      offers: [{ planId: 'yearly', variantId: 'variant_yearly_current' }],
    })
    mocks.mockResolveProOfferCartSelection.mockReturnValue({
      planId: 'yearly',
      handle: 'wcpos-pro-yearly',
      variantId: 'variant_yearly_current',
    })
    mocks.mockCapturePayPalOrder.mockResolvedValue(true)
  })

  it('returns 403 in view-only mode', async () => {
    mocks.mockAssertViewOnly.mockRejectedValueOnce(new mocks.MockViewOnlyError())

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ errorCode: 'read_only_inspection' })
    expect(mocks.mockCapturePayPalOrder).not.toHaveBeenCalled()
  })

  it('returns 401 when the customer is not authenticated', async () => {
    mocks.mockGetCustomer.mockResolvedValueOnce(null)

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(mocks.mockCapturePayPalOrder).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid request body', async () => {
    const response = await POST(request('not-json'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ errorCode: 'invalid_request_body' })
    expect(mocks.mockCapturePayPalOrder).not.toHaveBeenCalled()
  })

  it('returns 400 when cartId is missing', async () => {
    const response = await POST(request({ orderId: 'PAYPAL_ORDER_1' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ errorCode: 'cart_id_required' })
    expect(mocks.mockCapturePayPalOrder).not.toHaveBeenCalled()
  })

  it('returns 400 when orderId is missing', async () => {
    const response = await POST(request({ cartId: 'cart_1' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      errorCode: 'paypal_order_id_required',
    })
    expect(mocks.mockCapturePayPalOrder).not.toHaveBeenCalled()
  })

  it('returns 404 when the cart does not belong to the customer', async () => {
    mocks.mockGetCart.mockResolvedValueOnce({
      ...validCart,
      email: 'other@example.com',
    })

    const response = await POST(request())

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ errorCode: 'cart_not_found' })
    expect(mocks.mockCapturePayPalOrder).not.toHaveBeenCalled()
  })

  it('returns 400 when the cart is not a current Pro offer cart', async () => {
    mocks.mockResolveProOfferCartSelection.mockReturnValueOnce(null)

    const response = await POST(request())

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      errorCode: 'current_pro_offer_cart_required',
    })
    expect(mocks.mockCapturePayPalOrder).not.toHaveBeenCalled()
  })

  it('returns 502 when PayPal capture fails', async () => {
    mocks.mockCapturePayPalOrder.mockResolvedValueOnce(false)

    const response = await POST(request())

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      errorCode: 'failed_capture_paypal_order',
    })
  })

  it('captures the PayPal order with the authenticated Medusa token', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mocks.mockCapturePayPalOrder).toHaveBeenCalledWith(
      'cart_1',
      'PAYPAL_ORDER_1',
      'jwt_tok'
    )
  })
})
