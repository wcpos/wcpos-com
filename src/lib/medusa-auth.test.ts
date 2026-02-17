import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only (this module prevents client-side imports)
vi.mock('server-only', () => ({}))

// Mock environment variables
vi.mock('@/utils/env', () => ({
  env: {
    MEDUSA_BACKEND_URL: 'https://test-store-api.wcpos.com',
    MEDUSA_PUBLISHABLE_KEY: 'pk_test_abc123',
    NODE_ENV: 'test',
  },
}))

// Mock next/headers cookies
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import after mocks are set up
import {
  login,
  register,
  getCustomer,
  getAuthToken,
  getCustomerOrders,
  updateCustomer,
  decodeMedusaToken,
  linkOrCreateCustomer,
} from './medusa-auth'

describe('medusa-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('calls correct endpoint and returns token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'jwt_token_123' }),
      })

      const token = await login('user@example.com', 'password123')

      expect(token).toBe('jwt_token_123')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-store-api.wcpos.com/auth/customer/emailpass',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email: 'user@example.com',
            password: 'password123',
          }),
        })
      )
    })

    it('throws on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '{"message":"Invalid credentials"}',
      })

      await expect(login('user@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      )
    })
  })

  describe('register', () => {
    it('calls register endpoint then create customer endpoint', async () => {
      // Mock 1: Register auth identity
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'new_user_token' }),
      })
      // Mock 2: Create customer record
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: {
            id: 'cust_123',
            email: 'new@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
            has_account: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        }),
      })

      const result = await register({
        email: 'new@example.com',
        password: 'securepass',
        firstName: 'Jane',
        lastName: 'Doe',
      })

      expect(result.token).toBe('new_user_token')
      expect(result.customer.email).toBe('new@example.com')
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // First call: register auth identity
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://test-store-api.wcpos.com/auth/customer/emailpass/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'new@example.com',
            password: 'securepass',
          }),
        })
      )

      // Second call: create customer record
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://test-store-api.wcpos.com/store/customers',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer new_user_token',
            'x-publishable-api-key': 'pk_test_abc123',
          }),
          body: JSON.stringify({
            email: 'new@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
          }),
        })
      )
    })
  })

  describe('getCustomer', () => {
    it('returns customer when token cookie exists', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'valid_token' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: {
            id: 'cust_456',
            email: 'user@example.com',
            first_name: 'John',
            last_name: 'Smith',
            has_account: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        }),
      })

      const customer = await getCustomer()

      expect(customer).not.toBeNull()
      expect(customer?.id).toBe('cust_456')
      expect(customer?.email).toBe('user@example.com')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-store-api.wcpos.com/store/customers/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid_token',
            'x-publishable-api-key': 'pk_test_abc123',
          }),
        })
      )
    })

    it('returns null when no cookie', async () => {
      mockCookieStore.get.mockReturnValue(undefined)

      const customer = await getCustomer()

      expect(customer).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns null when Medusa returns 401', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'expired_token' })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '{"message":"Unauthorized"}',
      })

      const customer = await getCustomer()

      expect(customer).toBeNull()
    })
  })

  describe('getAuthToken', () => {
    it('reads from cookie', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'stored_token_xyz' })

      const token = await getAuthToken()

      expect(token).toBe('stored_token_xyz')
      expect(mockCookieStore.get).toHaveBeenCalledWith('medusa-token')
    })

    it('returns null when no cookie', async () => {
      mockCookieStore.get.mockReturnValue(undefined)

      const token = await getAuthToken()

      expect(token).toBeNull()
    })
  })

  describe('getCustomerOrders', () => {
    it('returns orders array', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'valid_token' })
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

      const orders = await getCustomerOrders()

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

    it('returns empty array when no token', async () => {
      mockCookieStore.get.mockReturnValue(undefined)

      const orders = await getCustomerOrders()

      expect(orders).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('updateCustomer', () => {
    it('updates the current customer profile', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'valid_token' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: {
            id: 'cust_456',
            email: 'user@example.com',
            first_name: 'Updated',
            last_name: 'Name',
            phone: '+15551234567',
            has_account: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-02-01T00:00:00Z',
          },
        }),
      })

      const customer = await updateCustomer({
        first_name: 'Updated',
        last_name: 'Name',
      })

      expect(customer).toBeTruthy()
      expect(customer?.first_name).toBe('Updated')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-store-api.wcpos.com/store/customers/me',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid_token',
            'x-publishable-api-key': 'pk_test_abc123',
          }),
          body: JSON.stringify({
            first_name: 'Updated',
            last_name: 'Name',
          }),
        })
      )
    })

    it('returns null when user is not authenticated', async () => {
      mockCookieStore.get.mockReturnValue(undefined)

      const customer = await updateCustomer({ first_name: 'Updated' })

      expect(customer).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('decodeMedusaToken', () => {
    it('decodes a standard JWT payload', () => {
      const payload = {
        actor_id: 'cust_123',
        actor_type: 'customer',
        auth_identity_id: 'authid_abc',
        app_metadata: { customer_id: 'cust_123' },
        user_metadata: { email: 'user@example.com', name: 'Jane Doe' },
      }
      const token = `header.${btoa(JSON.stringify(payload))}.signature`

      const result = decodeMedusaToken(token)

      expect(result.actor_id).toBe('cust_123')
      expect(result.user_metadata.email).toBe('user@example.com')
    })

    it('handles URL-safe base64 encoding', () => {
      const payload = {
        actor_id: '',
        actor_type: 'customer',
        auth_identity_id: 'authid_xyz',
        app_metadata: {},
        user_metadata: { email: 'test+special@example.com' },
      }
      const base64 = btoa(JSON.stringify(payload))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
      const token = `header.${base64}.signature`

      const result = decodeMedusaToken(token)

      expect(result.user_metadata.email).toBe('test+special@example.com')
    })

    it('returns empty user_metadata when field is missing', () => {
      const payload = { actor_id: '', actor_type: 'customer', auth_identity_id: 'x', app_metadata: {} }
      const token = `header.${btoa(JSON.stringify(payload))}.signature`

      const result = decodeMedusaToken(token)

      expect(result.user_metadata).toEqual({})
    })
  })

  describe('linkOrCreateCustomer', () => {
    it('calls the account-link endpoint with bearer token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customer: { id: 'cust_123', email: 'test@example.com' } }),
      })

      await linkOrCreateCustomer('test-jwt-token')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-store-api.wcpos.com/store/auth/account-link',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-jwt-token',
            'x-publishable-api-key': 'pk_test_abc123',
          }),
        })
      )
    })

    it('throws when the endpoint returns an error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => '{"message":"No email found in OAuth profile"}',
      })

      await expect(linkOrCreateCustomer('bad-token')).rejects.toThrow(
        'No email found in OAuth profile'
      )
    })
  })
})
