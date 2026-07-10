import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetAuthToken = vi.fn()
const mockGetCart = vi.fn()
const mockUpdateCart = vi.fn()

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly: async () => {},
  ViewOnlyError: class ViewOnlyError extends Error {},
}))

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  getCart: (...args: unknown[]) => mockGetCart(...args),
  updateCart: (...args: unknown[]) => mockUpdateCart(...args),
}))

import { POST } from './route'

const DISTINCT_ID = '550e8400-e29b-41d4-a716-446655440000'
const SESSION_ID = '01890f3e-8b3a-7cc2-98c4-dc0c0c0c0c0c'
const AUTH_TOKEN = 'jwt_session'

function request({
  cookie,
  body = { cartId: 'cart_1', session_id: SESSION_ID },
}: {
  cookie?: string
  body?: unknown
} = {}) {
  return new NextRequest(
    'http://localhost:3000/api/store/cart/analytics-attribution',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }
  )
}

function cart(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cart_1',
    email: 'buyer@example.com',
    metadata: {
      locale: 'fr-FR',
      experiment: 'pro_checkout_v1',
      variant: 'value_copy',
      wcpos_analytics: { distinct_id: 'stale', session_id: 'stale' },
    },
    ...overrides,
  }
}

describe('POST /api/store/cart/analytics-attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomer.mockResolvedValue({
      id: 'cust_1',
      email: 'buyer@example.com',
    })
    mockGetAuthToken.mockResolvedValue(AUTH_TOKEN)
    mockGetCart.mockResolvedValue(cart())
    mockUpdateCart.mockResolvedValue(cart())
  })

  it('replaces attribution from current explicit consent and server cookies', async () => {
    const response = await POST(
      request({
        cookie: `wcpos-analytics-consent=granted; wcpos-distinct-id=${DISTINCT_ID}`,
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ attributed: true })
    expect(mockUpdateCart).toHaveBeenCalledWith(
      'cart_1',
      {
        email: 'buyer@example.com',
        metadata: {
          wcpos_analytics: {
            completion_owner: 'medusa_v1',
            distinct_id: DISTINCT_ID,
            session_id: SESSION_ID,
            locale: 'fr-FR',
            experiment: 'pro_checkout_v1',
            variant: 'value_copy',
          },
        },
      },
      AUTH_TOKEN
    )
  })

  it.each([
    ['withdrawn consent', 'wcpos-analytics-consent=denied'],
    ['missing consent', `wcpos-distinct-id=${DISTINCT_ID}`],
    ['missing server distinct ID', 'wcpos-analytics-consent=granted'],
    [
      'conflicting consent cookies',
      `wcpos-analytics-consent=granted; wcpos-analytics-consent=denied; wcpos-distinct-id=${DISTINCT_ID}`,
    ],
  ])('removes stale attribution for %s', async (_label, cookieHeader) => {
    const response = await POST(request({ cookie: cookieHeader }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ attributed: false })
    expect(mockUpdateCart).toHaveBeenCalledWith(
      'cart_1',
      {
        email: 'buyer@example.com',
        metadata: { wcpos_analytics: null },
      },
      AUTH_TOKEN
    )
  })

  it('removes stale attribution when the current browser session is unavailable', async () => {
    await POST(
      request({
        cookie: `wcpos-analytics-consent=granted; wcpos-distinct-id=${DISTINCT_ID}`,
        body: { cartId: 'cart_1' },
      })
    )

    expect(mockUpdateCart).toHaveBeenCalledWith(
      'cart_1',
      expect.objectContaining({ metadata: { wcpos_analytics: null } }),
      AUTH_TOKEN
    )
  })

  it('rejects a cart that is not owned by the authenticated customer', async () => {
    mockGetCart.mockResolvedValue(cart({ email: 'someone-else@example.com' }))

    const response = await POST(
      request({
        cookie: `wcpos-analytics-consent=granted; wcpos-distinct-id=${DISTINCT_ID}`,
      })
    )

    expect(response.status).toBe(404)
    expect(mockUpdateCart).not.toHaveBeenCalled()
  })

  it('requires authentication', async () => {
    mockGetCustomer.mockResolvedValue(null)

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(mockGetCart).not.toHaveBeenCalled()
    expect(mockUpdateCart).not.toHaveBeenCalled()
  })
})
