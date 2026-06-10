import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only (this module prevents client-side imports)
vi.mock('server-only', () => ({}))

// Mutable env so each test can control admin API configuration
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    MEDUSA_BACKEND_URL: 'https://store-api.example.com',
    MEDUSA_ADMIN_API_KEY: undefined as string | undefined,
  },
}))
vi.mock('@/utils/env', () => ({ env: mockEnv }))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import after mocks are set up
import { medusaAdminClient } from './medusa-admin-client'

const API_KEY = 'sk_test_123'
// Medusa v2 secret API keys: HTTP Basic, key as username, empty password.
const EXPECTED_AUTH = `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

const rawCustomer = {
  id: 'cus_01',
  email: 'jane@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
  company_name: 'Acme',
  phone: '+61 400 000 000',
  has_account: true,
  metadata: { stripe_id: 'cus_stripe' },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
}

const rawOrder = {
  id: 'order_01',
  display_id: 42,
  status: 'completed',
  payment_status: 'captured',
  email: 'jane@example.com',
  currency_code: 'usd',
  total: 99,
  subtotal: 90,
  tax_total: 9,
  customer_id: 'cus_01',
  metadata: {
    licenses: [{ license_id: 'lic_1', license_key: 'AAAA-BBBB-CCCC-DDDD' }],
  },
  created_at: '2026-03-01T00:00:00Z',
  items: [
    {
      id: 'item_01',
      title: 'WCPOS Pro (Yearly)',
      quantity: 1,
      unit_price: 90,
      total: 99,
      metadata: null,
    },
  ],
}

describe('medusaAdminClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.MEDUSA_ADMIN_API_KEY = undefined
  })

  describe('unconfigured (MEDUSA_ADMIN_API_KEY unset)', () => {
    it('returns unconfigured from every function without fetching', async () => {
      expect(await medusaAdminClient.listCustomers()).toEqual({
        status: 'unconfigured',
      })
      expect(await medusaAdminClient.getCustomerById('cus_01')).toEqual({
        status: 'unconfigured',
      })
      expect(await medusaAdminClient.listOrders()).toEqual({
        status: 'unconfigured',
      })
      expect(await medusaAdminClient.getOrderById('order_01')).toEqual({
        status: 'unconfigured',
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('listCustomers', () => {
    beforeEach(() => {
      mockEnv.MEDUSA_ADMIN_API_KEY = API_KEY
    })

    it('sends Basic auth (key as username) and pagination params', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ customers: [rawCustomer], count: 1 })
      )

      const result = await medusaAdminClient.listCustomers({
        page: 2,
        pageSize: 20,
        q: 'jane',
      })

      expect(result.status).toBe('ok')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const [calledUrl, init] = mockFetch.mock.calls[0]
      const url = new URL(calledUrl as string)

      expect(url.origin).toBe('https://store-api.example.com')
      expect(url.pathname).toBe('/admin/customers')
      expect(url.searchParams.get('limit')).toBe('20')
      expect(url.searchParams.get('offset')).toBe('20')
      expect(url.searchParams.get('order')).toBe('-created_at')
      expect(url.searchParams.get('q')).toBe('jane')

      const headers = (init as { headers: Record<string, string> }).headers
      expect(headers.Authorization).toBe(EXPECTED_AUTH)
    })

    it('maps customers onto the minimal summary shape', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ customers: [rawCustomer], count: 41 })
      )

      const result = await medusaAdminClient.listCustomers({
        page: 1,
        pageSize: 20,
      })

      expect(result).toEqual({
        status: 'ok',
        items: [
          {
            id: 'cus_01',
            email: 'jane@example.com',
            firstName: 'Jane',
            lastName: 'Doe',
            hasAccount: true,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        count: 41,
        page: 1,
        pageSize: 20,
        hasNextPage: true,
      })
    })

    it('reports hasNextPage false on the last page', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ customers: [rawCustomer], count: 21 })
      )

      const result = await medusaAdminClient.listCustomers({
        page: 2,
        pageSize: 20,
      })

      expect(result.status).toBe('ok')
      if (result.status === 'ok') {
        expect(result.hasNextPage).toBe(false)
      }
    })

    it('returns a sanitized error (status only, no upstream body)', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ message: 'secret internal detail' }, 500)
      )

      const result = await medusaAdminClient.listCustomers()

      expect(result).toEqual({
        status: 'error',
        message: 'Medusa admin request failed (500)',
      })
    })

    it('treats a 404 on the list endpoint as an error, not an empty list', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, 404))

      const result = await medusaAdminClient.listCustomers()

      expect(result).toEqual({
        status: 'error',
        message: 'Medusa admin request failed (404)',
      })
    })

    it('returns an error when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const result = await medusaAdminClient.listCustomers()

      expect(result).toEqual({
        status: 'error',
        message: 'Medusa admin API is unreachable',
      })
    })
  })

  describe('getCustomerById', () => {
    beforeEach(() => {
      mockEnv.MEDUSA_ADMIN_API_KEY = API_KEY
    })

    it('maps the customer detail shape', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ customer: rawCustomer }))

      const result = await medusaAdminClient.getCustomerById('cus_01')

      expect(result).toEqual({
        status: 'ok',
        item: {
          id: 'cus_01',
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          companyName: 'Acme',
          phone: '+61 400 000 000',
          hasAccount: true,
          metadata: { stripe_id: 'cus_stripe' },
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
        },
      })

      const [calledUrl] = mockFetch.mock.calls[0]
      expect(new URL(calledUrl as string).pathname).toBe(
        '/admin/customers/cus_01'
      )
    })

    it('returns not_found on 404', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, 404))

      const result = await medusaAdminClient.getCustomerById('cus_missing')

      expect(result).toEqual({ status: 'not_found' })
    })

    it('returns an error on an unexpected response shape', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ nope: true }))

      const result = await medusaAdminClient.getCustomerById('cus_01')

      expect(result).toEqual({
        status: 'error',
        message: 'Medusa admin returned an unexpected response',
      })
    })
  })

  describe('listOrders', () => {
    beforeEach(() => {
      mockEnv.MEDUSA_ADMIN_API_KEY = API_KEY
    })

    it('requests extra fields and filters by customer when given', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ orders: [], count: 0 }))

      await medusaAdminClient.listOrders({ customerId: 'cus_01' })

      const [calledUrl] = mockFetch.mock.calls[0]
      const url = new URL(calledUrl as string)

      expect(url.pathname).toBe('/admin/orders')
      expect(url.searchParams.get('customer_id')).toBe('cus_01')
      expect(url.searchParams.get('order')).toBe('-created_at')
      // `+` prefix adds to Medusa's default admin order fields, which do not
      // include email / currency_code / customer_id.
      expect(url.searchParams.get('fields')).toBe(
        '+email,+currency_code,+customer_id'
      )
    })

    it('maps orders onto the summary shape (including metadata for license refs)', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ orders: [rawOrder], count: 1 })
      )

      const result = await medusaAdminClient.listOrders()

      expect(result).toEqual({
        status: 'ok',
        items: [
          {
            id: 'order_01',
            displayId: 42,
            status: 'completed',
            paymentStatus: 'captured',
            email: 'jane@example.com',
            currencyCode: 'usd',
            total: 99,
            customerId: 'cus_01',
            createdAt: '2026-03-01T00:00:00Z',
            metadata: {
              licenses: [
                { license_id: 'lic_1', license_key: 'AAAA-BBBB-CCCC-DDDD' },
              ],
            },
          },
        ],
        count: 1,
        page: 1,
        pageSize: 20,
        hasNextPage: false,
      })
    })
  })

  describe('getOrderById', () => {
    beforeEach(() => {
      mockEnv.MEDUSA_ADMIN_API_KEY = API_KEY
    })

    it('maps the order detail shape with items and totals', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ order: rawOrder }))

      const result = await medusaAdminClient.getOrderById('order_01')

      expect(result.status).toBe('ok')
      if (result.status !== 'ok') return

      expect(result.item.subtotal).toBe(90)
      expect(result.item.taxTotal).toBe(9)
      expect(result.item.items).toEqual([
        {
          id: 'item_01',
          title: 'WCPOS Pro (Yearly)',
          quantity: 1,
          unitPrice: 90,
          total: 99,
          metadata: null,
        },
      ])

      const [calledUrl] = mockFetch.mock.calls[0]
      expect(new URL(calledUrl as string).pathname).toBe(
        '/admin/orders/order_01'
      )
    })

    it('returns not_found on 404', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, 404))

      const result = await medusaAdminClient.getOrderById('order_missing')

      expect(result).toEqual({ status: 'not_found' })
    })

    it('handles missing optional fields defensively', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ order: { id: 'order_02' } })
      )

      const result = await medusaAdminClient.getOrderById('order_02')

      expect(result).toEqual({
        status: 'ok',
        item: {
          id: 'order_02',
          displayId: null,
          status: 'unknown',
          paymentStatus: null,
          email: null,
          currencyCode: 'usd',
          total: 0,
          customerId: null,
          createdAt: null,
          metadata: null,
          subtotal: null,
          taxTotal: null,
          items: [],
        },
      })
    })
  })
})
