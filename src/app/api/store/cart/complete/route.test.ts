import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockCompleteCart = vi.fn()
const mockResolveProCheckoutVariant = vi.fn()
const mockTrackServerEvent = vi.fn()
const mockGetAnalyticsConfig = vi.fn()
const mockCookieGet = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  completeCart: (...args: unknown[]) => mockCompleteCart(...args),
}))

vi.mock('@/services/core/analytics/posthog-service', () => ({
  resolveProCheckoutVariant: (...args: unknown[]) => mockResolveProCheckoutVariant(...args),
  trackServerEvent: (...args: unknown[]) => mockTrackServerEvent(...args),
}))

vi.mock('@/lib/analytics/config', () => ({
  getAnalyticsConfig: (...args: unknown[]) => mockGetAnalyticsConfig(...args),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
  })),
}))

import { POST } from './route'

describe('POST /api/store/cart/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAnalyticsConfig.mockReturnValue({ enabled: true })
    mockResolveProCheckoutVariant.mockResolvedValue('control')
    mockCookieGet.mockReturnValue({ value: 'anon_123' })
  })

  it('returns 401 when customer is not authenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await POST(
      new NextRequest('http://localhost:3000/api/store/cart/complete', {
        method: 'POST',
        body: JSON.stringify({ cartId: 'cart_1' }),
      })
    )

    expect(response.status).toBe(401)
    expect(mockCompleteCart).not.toHaveBeenCalled()
    expect(mockTrackServerEvent).not.toHaveBeenCalled()
  })

  it('tracks checkout completion with server-validated variant', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'customer@example.com',
    })
    mockCompleteCart.mockResolvedValueOnce({
      order: { id: 'order_1' },
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/store/cart/complete', {
        method: 'POST',
        body: JSON.stringify({
          cartId: 'cart_1',
          experiment: 'pro_checkout_v1',
          experimentVariant: 'value_copy',
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(mockResolveProCheckoutVariant).toHaveBeenCalledWith({
      distinctId: 'anon_123',
      analyticsEnabled: true,
    })
    expect(mockTrackServerEvent).toHaveBeenCalledWith('checkout_completed', {
      experiment: 'pro_checkout_v1',
      variant: 'control',
      distinct_id: 'anon_123',
      customer_id: 'cust_1',
      order_id: 'order_1',
      cart_id: 'cart_1',
      funnel_step: 'checkout_completed',
      page: '/pro/checkout',
    })
  })

  it('returns success even when analytics tracking throws', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'customer@example.com',
    })
    mockCompleteCart.mockResolvedValueOnce({
      order: { id: 'order_2' },
    })
    mockTrackServerEvent.mockRejectedValueOnce(new Error('analytics down'))

    const response = await POST(
      new NextRequest('http://localhost:3000/api/store/cart/complete', {
        method: 'POST',
        body: JSON.stringify({
          cartId: 'cart_2',
          experiment: 'pro_checkout_v1',
          experimentVariant: 'value_copy',
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(mockTrackServerEvent).toHaveBeenCalledTimes(1)
  })
})
