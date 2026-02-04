import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock environment
vi.mock('@/utils/env', () => ({
  env: {
    MEDUSA_BACKEND_URL: 'https://test-store-api.wcpos.com',
    MEDUSA_PUBLISHABLE_KEY: 'pk_test_abc123',
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  authLogger: {
    error: () => {},
  },
}))

// Mock medusa-auth functions
const mockCompleteOAuthCallback = vi.fn()
const mockSetAuthToken = vi.fn()
const mockRefreshToken = vi.fn()
const mockDecodeMedusaToken = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  completeOAuthCallback: (...args: unknown[]) =>
    mockCompleteOAuthCallback(...args),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
  refreshToken: (...args: unknown[]) => mockRefreshToken(...args),
  decodeMedusaToken: (...args: unknown[]) => mockDecodeMedusaToken(...args),
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

import { GET } from './route'

/**
 * Build a fake JWT token whose payload section base64-encodes the given object.
 */
function fakeJwt(payload: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(payload))}.signature`
}

describe('OAuth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes email and name from user_metadata when creating a new customer (Google)', async () => {
    const token = fakeJwt({
      actor_id: '',
      user_metadata: {
        email: 'alice@gmail.com',
        given_name: 'Alice',
        family_name: 'Smith',
      },
    })
    const refreshedToken = 'refreshed_token'

    mockCompleteOAuthCallback.mockResolvedValue(token)
    mockDecodeMedusaToken.mockReturnValue({
      actor_id: '',
      actor_type: 'customer',
      auth_identity_id: 'auth_123',
      app_metadata: {},
      user_metadata: {
        email: 'alice@gmail.com',
        given_name: 'Alice',
        family_name: 'Smith',
      },
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ customer: { id: 'cust_new' } }),
    })
    mockRefreshToken.mockResolvedValue(refreshedToken)
    mockSetAuthToken.mockResolvedValue(undefined)

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google/callback?code=abc&state=xyz'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    // Should have called fetch to create customer with email + name
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-store-api.wcpos.com/store/customers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'alice@gmail.com',
          first_name: 'Alice',
          last_name: 'Smith',
        }),
      })
    )

    // Should refresh and set the token
    expect(mockRefreshToken).toHaveBeenCalledWith(token)
    expect(mockSetAuthToken).toHaveBeenCalledWith(refreshedToken)

    // Should redirect to /account
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe(
      '/account'
    )
  })

  it('passes email and name from user_metadata when creating a new customer (GitHub)', async () => {
    const token = fakeJwt({
      actor_id: '',
      user_metadata: {
        email: 'bob@github.com',
        name: 'Bob Jones',
      },
    })

    mockCompleteOAuthCallback.mockResolvedValue(token)
    mockDecodeMedusaToken.mockReturnValue({
      actor_id: '',
      actor_type: 'customer',
      auth_identity_id: 'auth_456',
      app_metadata: {},
      user_metadata: {
        email: 'bob@github.com',
        name: 'Bob Jones',
      },
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ customer: { id: 'cust_bob' } }),
    })
    mockRefreshToken.mockResolvedValue('refreshed')
    mockSetAuthToken.mockResolvedValue(undefined)

    const request = new NextRequest(
      'https://wcpos.com/api/auth/github/callback?code=def&state=uvw'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'github' }),
    })

    // GitHub gives `name` but not given_name/family_name, so first_name = name
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-store-api.wcpos.com/store/customers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'bob@github.com',
          first_name: 'Bob Jones',
        }),
      })
    )

    expect(response.status).toBe(307)
  })

  it('sets token directly for existing users (actor_id present)', async () => {
    const token = fakeJwt({
      actor_id: 'cust_existing',
      user_metadata: { email: 'existing@example.com' },
    })

    mockCompleteOAuthCallback.mockResolvedValue(token)
    mockDecodeMedusaToken.mockReturnValue({
      actor_id: 'cust_existing',
      actor_type: 'customer',
      auth_identity_id: 'auth_789',
      app_metadata: {},
      user_metadata: { email: 'existing@example.com' },
    })
    mockSetAuthToken.mockResolvedValue(undefined)

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google/callback?code=ghi&state=rst'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    // Should NOT create a customer or refresh the token
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockRefreshToken).not.toHaveBeenCalled()

    // Should set the original token
    expect(mockSetAuthToken).toHaveBeenCalledWith(token)

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe(
      '/account'
    )
  })

  it('rejects unsupported providers', async () => {
    const request = new NextRequest(
      'https://wcpos.com/api/auth/facebook/callback?code=abc'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'facebook' }),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('facebook')
  })

  it('redirects to /login with error when customer creation fails', async () => {
    const token = fakeJwt({
      actor_id: '',
      user_metadata: { email: 'fail@example.com' },
    })

    mockCompleteOAuthCallback.mockResolvedValue(token)
    mockDecodeMedusaToken.mockReturnValue({
      actor_id: '',
      actor_type: 'customer',
      auth_identity_id: 'auth_fail',
      app_metadata: {},
      user_metadata: { email: 'fail@example.com' },
    })
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"message":"Email is required to create a customer"}',
    })

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google/callback?code=abc&state=xyz'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    // Should redirect to /login with error
    expect(response.status).toBe(303)
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('error')).toBe('oauth_failed')
  })
})
