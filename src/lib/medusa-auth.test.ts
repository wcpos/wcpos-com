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
  requestPasswordReset,
  resetPassword,
  getCustomer,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  updateCustomer,
  parseMedusaError,
} from './medusa-auth'
import {
  AccountExistsError,
  InvalidCredentialsError,
  InvalidResetTokenError,
} from '@/lib/api/errors'

// decodeMedusaToken, linkOrCreateCustomer, completeOAuthCallback, refreshToken
// and initiateOAuth moved to `@/lib/oauth`; their tests live in oauth.test.ts.

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

    it('throws a typed InvalidCredentialsError on a 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '{"message":"Invalid credentials"}',
      })

      const error = await login('user@example.com', 'wrong').catch((e) => e)

      // Classified at the adapter seam so the login route can log routine
      // wrong-password rejections at info instead of alerting.
      expect(error).toBeInstanceOf(InvalidCredentialsError)
      expect(error.message).toBe('Invalid credentials')
    })

    it('throws a plain Error on unexpected non-401 failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => '{"message":"Internal server error"}',
      })

      const error = await login('user@example.com', 'password123').catch(
        (e) => e
      )

      expect(error).toBeInstanceOf(Error)
      expect(error).not.toBeInstanceOf(InvalidCredentialsError)
      expect(error.message).toBe('Internal server error')
    })
  })

  describe('requestPasswordReset', () => {
    it('posts the email as identifier to the reset-password endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await requestPasswordReset('user@example.com')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-store-api.wcpos.com/auth/customer/emailpass/reset-password',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ identifier: 'user@example.com' }),
        })
      )
    })

    it('throws with the Medusa message on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => '{"message":"Internal server error"}',
      })

      await expect(requestPasswordReset('user@example.com')).rejects.toThrow(
        'Internal server error'
      )
    })
  })

  describe('resetPassword', () => {
    it('posts the new password with the reset token as Bearer auth', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await resetPassword({
        email: 'user@example.com',
        token: 'reset-jwt',
        password: 'new-secret',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-store-api.wcpos.com/auth/customer/emailpass/update',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer reset-jwt',
          }),
          body: JSON.stringify({
            email: 'user@example.com',
            password: 'new-secret',
          }),
        })
      )
    })

    it('throws a typed InvalidResetTokenError on a 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '{"message":"Invalid token"}',
      })

      const error = await resetPassword({
        email: 'user@example.com',
        token: 'expired-jwt',
        password: 'new-secret',
      }).catch((e) => e)

      // Classified at the adapter seam so the route can log routine
      // expired-link rejections at info instead of alerting.
      expect(error).toBeInstanceOf(InvalidResetTokenError)
    })

    it('throws a plain Error on unexpected non-401 failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => '{"message":"Internal server error"}',
      })

      const error = await resetPassword({
        email: 'user@example.com',
        token: 'reset-jwt',
        password: 'new-secret',
      }).catch((e) => e)

      expect(error).toBeInstanceOf(Error)
      expect(error).not.toBeInstanceOf(InvalidResetTokenError)
      expect(error.message).toBe('Internal server error')
    })
  })

  describe('register', () => {
    it('registers, creates the customer, then exchanges for a session token', async () => {
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
      // Mock 3: Login — the registration token has an empty actor_id, so
      // register() must exchange it for a real session token.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'session_token' }),
      })

      const result = await register({
        email: 'new@example.com',
        password: 'securepass',
        firstName: 'Jane',
        lastName: 'Doe',
      })

      // The SESSION token is returned, never the registration token.
      expect(result.token).toBe('session_token')
      expect(result.customer.email).toBe('new@example.com')
      expect(mockFetch).toHaveBeenCalledTimes(3)

      // Third call: login exchange for an actor token
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        'https://test-store-api.wcpos.com/auth/customer/emailpass',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'new@example.com',
            password: 'securepass',
          }),
        })
      )

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

    it('throws AccountExistsError when the email is already registered', async () => {
      // Medusa rejects the auth-identity register step for an existing email.
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '{"message":"Identity with email already exists"}',
      })

      const error = await register({
        email: 'existing@example.com',
        password: 'securepass',
      }).catch((e) => e)

      expect(error).toBeInstanceOf(AccountExistsError)
      expect(error.code).toBe('ACCOUNT_EXISTS')
      expect(error.status).toBe(409)
      expect(error.message).toBe('Identity with email already exists')
      // It must not proceed to the create-customer step.
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('throws AccountExistsError when customer creation finds an existing email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'new_user_token' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => '{"message":"Customer with email already exists"}',
      })

      const error = await register({
        email: 'existing@example.com',
        password: 'securepass',
      }).catch((e) => e)

      expect(error).toBeInstanceOf(AccountExistsError)
      expect(error.code).toBe('ACCOUNT_EXISTS')
      expect(error.status).toBe(409)
      expect(error.message).toBe('Customer with email already exists')
      expect(mockFetch).toHaveBeenCalledTimes(2)
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

  describe('parseMedusaError', () => {
    const makeResponse = (body: string) =>
      ({ text: async () => body }) as unknown as Response

    it('returns the message from a JSON body', async () => {
      const message = await parseMedusaError(
        makeResponse('{"message":"Invalid credentials"}'),
        'Login failed'
      )

      expect(message).toBe('Invalid credentials')
    })

    it('falls back to the default when JSON has no message', async () => {
      const message = await parseMedusaError(
        makeResponse('{"code":"unauthorized"}'),
        'Login failed'
      )

      expect(message).toBe('Login failed')
    })

    it('falls back to the default for a non-JSON body', async () => {
      const message = await parseMedusaError(
        makeResponse('<html>Bad Gateway</html>'),
        'Token refresh failed'
      )

      expect(message).toBe('Token refresh failed')
    })
  })
})

// Session cookie flags: every API route test mocks this module, so without
// these assertions a regression dropping httpOnly/secure from the session
// cookie would pass the whole suite (found in adversarial review of #115).
describe('session cookie options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('setAuthToken sets the medusa-token cookie with the exact hardening flags', async () => {
    await setAuthToken('jwt-value')

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1)
    expect(mockCookieStore.set).toHaveBeenCalledWith('medusa-token', 'jwt-value', {
      httpOnly: true,
      // NODE_ENV is "test" here; the production posture is asserted below.
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
  })

  it('marks the cookie Secure in production builds', async () => {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'production')
    try {
      // COOKIE_OPTIONS is computed at module load, so re-import with the
      // production NODE_ENV to capture the deployed flag values.
      const prodModule = await import('./medusa-auth')
      await prodModule.setAuthToken('jwt-value')

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'medusa-token',
        'jwt-value',
        expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax' })
      )
    } finally {
      vi.unstubAllEnvs()
      vi.resetModules()
    }
  })

  it('clearAuthToken deletes the medusa-token cookie', async () => {
    await clearAuthToken()

    expect(mockCookieStore.delete).toHaveBeenCalledTimes(1)
    expect(mockCookieStore.delete).toHaveBeenCalledWith('medusa-token')
  })
})
