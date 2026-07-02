import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/utils/env', () => ({
  env: {
    MEDUSA_BACKEND_URL: 'https://test-store-api.wcpos.com',
    MEDUSA_PUBLISHABLE_KEY: 'pk_test_abc123',
    NODE_ENV: 'test',
  },
}))

// Mock the host-keyed store environment (replaces the old env-var mock):
// unit tests always see the pinned test backend.
vi.mock('@/lib/store-environment', () => {
  const environment = {
    name: 'test',
    medusaBackendUrl: 'https://test-store-api.wcpos.com',
    medusaPublishableKey: 'pk_test_abc123',
    payments: {
      stripePublishableKey: null,
      paypalClientId: null,
      btcpayEnabled: true,
    },
  }
  return {
    getRequestStoreEnvironment: vi.fn(async () => environment),
    getLiveStoreEnvironment: vi.fn(() => environment),
    getStoreEnvironmentByName: vi.fn(() => environment),
    getMedusaBackendUrl: vi.fn(async () => environment.medusaBackendUrl),
    getMedusaPublishableKey: vi.fn(
      async () => environment.medusaPublishableKey
    ),
  }
})

const { mockGetAuthToken, mockWarn, mockError, mockFetch } = vi.hoisted(() => ({
  mockGetAuthToken: vi.fn(),
  mockWarn: vi.fn(),
  mockError: vi.fn(),
  mockFetch: vi.fn(),
}))

vi.mock('@/lib/medusa-auth', () => ({
  getAuthToken: () => mockGetAuthToken(),
}))

vi.mock('@/lib/logger', () => ({
  storeLogger: { warn: mockWarn, error: mockError },
}))

global.fetch = mockFetch

import { getOrdersPage, getAllOrders, getOrderById } from './customer-orders'

describe('customer-orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrdersPage', () => {
    it('returns the orders array', async () => {
      mockGetAuthToken.mockResolvedValue('valid_token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'order_001',
              status: 'completed',
              display_id: 1,
              email: 'user@example.com',
              currency_code: 'usd',
              total: 12900,
              subtotal: 12900,
              tax_total: 0,
              created_at: '2024-06-01T00:00:00Z',
              updated_at: '2024-06-01T00:00:00Z',
              items: [
                {
                  id: 'item_001',
                  title: 'WCPOS Pro Yearly',
                  quantity: 1,
                  unit_price: 12900,
                  total: 12900,
                },
              ],
            },
          ],
        }),
      })

      const orders = await getOrdersPage()

      expect(orders).toHaveLength(1)
      expect(orders[0].id).toBe('order_001')
      expect(orders[0].items).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/store/orders'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid_token',
            'x-publishable-api-key': 'pk_test_abc123',
          }),
        })
      )
    })

    it('returns an empty array when no token', async () => {
      mockGetAuthToken.mockResolvedValue(null)

      const orders = await getOrdersPage()

      expect(orders).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('passes limit and offset to the Medusa orders query', async () => {
      mockGetAuthToken.mockResolvedValue('valid_token')
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ orders: [] }) })

      await getOrdersPage(25, 50)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-store-api.wcpos.com/store/orders?limit=25&offset=50',
        expect.anything()
      )
    })
  })

  describe('getAllOrders', () => {
    it('pages until a short page ends the run, without warning', async () => {
      mockGetAuthToken.mockResolvedValue('valid_token')
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orders: [{ id: 'order_1' }], count: 1 }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ orders: [], count: 1 }) })

      const orders = await getAllOrders(1, 5)

      expect(orders).toEqual([{ id: 'order_1' }])
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://test-store-api.wcpos.com/store/orders?limit=1&offset=0',
        expect.anything()
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://test-store-api.wcpos.com/store/orders?limit=1&offset=1',
        expect.anything()
      )
      expect(mockWarn).not.toHaveBeenCalled()
    })

    it('does NOT warn at the exact cap boundary (count === fetched)', async () => {
      mockGetAuthToken.mockResolvedValue('valid_token')
      // 3 full pages of 1; Medusa reports exactly 3 total — nothing dropped.
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [{ id: 'order_x' }], count: 3 }),
      })

      const orders = await getAllOrders(1, 3)

      expect(orders).toHaveLength(3)
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockWarn).not.toHaveBeenCalled()
    })

    it('warns only when Medusa reports more orders than were fetched', async () => {
      mockGetAuthToken.mockResolvedValue('valid_token')
      // 3 full pages of 1, but Medusa reports 9 total — 6 orders went unfetched.
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [{ id: 'order_x' }], count: 9 }),
      })

      const orders = await getAllOrders(1, 3)

      expect(orders).toHaveLength(3)
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockWarn).toHaveBeenCalledTimes(1)
    })

    it('returns an empty array when no token', async () => {
      mockGetAuthToken.mockResolvedValue(null)

      const orders = await getAllOrders()

      expect(orders).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('getOrderById', () => {
    it('fetches one order via the customer-scoped list endpoint, filtered by id', async () => {
      mockGetAuthToken.mockResolvedValue('valid_token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: [{ id: 'order_target', display_id: 7 }], count: 1 }),
      })

      const order = await getOrderById('order_target')

      expect(order).toEqual({ id: 'order_target', display_id: 7 })
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-store-api.wcpos.com/store/orders?id=order_target&limit=1',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid_token',
            'x-publishable-api-key': 'pk_test_abc123',
          }),
        })
      )
    })

    it('NEVER calls the unauthenticated /store/orders/{id} retrieve endpoint', async () => {
      // Security regression lock: that endpoint is not customer-scoped upstream.
      mockGetAuthToken.mockResolvedValue('valid_token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: [], count: 0 }),
      })

      await getOrderById('order_target')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/store/orders?')
      expect(calledUrl).not.toMatch(/\/store\/orders\/order_target/)
    })

    it('returns null when the customer has no such order (empty list)', async () => {
      mockGetAuthToken.mockResolvedValue('valid_token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: [], count: 0 }),
      })

      const order = await getOrderById('missing-or-not-mine')

      expect(order).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('returns null when the list endpoint returns a different order id', async () => {
      // Defense in depth: local/e2e mocks or future upstream regressions may
      // ignore the id filter. Never treat the first returned order as a match
      // unless Medusa echoes the requested id.
      mockGetAuthToken.mockResolvedValue('valid_token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orders: [{ id: 'order_not_requested', display_id: 8 }],
          count: 1,
        }),
      })

      const order = await getOrderById('order_target')

      expect(order).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('returns null when no token', async () => {
      mockGetAuthToken.mockResolvedValue(null)

      const order = await getOrderById('order_1')

      expect(order).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
