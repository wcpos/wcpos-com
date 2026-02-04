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
const mockLinkOrCreateCustomer = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  completeOAuthCallback: (...args: unknown[]) =>
    mockCompleteOAuthCallback(...args),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
  refreshToken: (...args: unknown[]) => mockRefreshToken(...args),
  decodeMedusaToken: (...args: unknown[]) => mockDecodeMedusaToken(...args),
  linkOrCreateCustomer: (...args: unknown[]) =>
    mockLinkOrCreateCustomer(...args),
}))

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

  it('links or creates customer for new OAuth user (Google)', async () => {
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
    mockLinkOrCreateCustomer.mockResolvedValue(undefined)
    mockRefreshToken.mockResolvedValue(refreshedToken)
    mockSetAuthToken.mockResolvedValue(undefined)

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google/callback?code=abc&state=xyz'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    // Should have called linkOrCreateCustomer with the token
    expect(mockLinkOrCreateCustomer).toHaveBeenCalledWith(token)

    // Should refresh and set the token
    expect(mockRefreshToken).toHaveBeenCalledWith(token)
    expect(mockSetAuthToken).toHaveBeenCalledWith(refreshedToken)

    // Should redirect to /account
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe(
      '/account'
    )
  })

  it('links or creates customer for new OAuth user (GitHub)', async () => {
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
    mockLinkOrCreateCustomer.mockResolvedValue(undefined)
    mockRefreshToken.mockResolvedValue('refreshed')
    mockSetAuthToken.mockResolvedValue(undefined)

    const request = new NextRequest(
      'https://wcpos.com/api/auth/github/callback?code=def&state=uvw'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'github' }),
    })

    // Should have called linkOrCreateCustomer with the token
    expect(mockLinkOrCreateCustomer).toHaveBeenCalledWith(token)

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

    // Should NOT link/create a customer or refresh the token
    expect(mockLinkOrCreateCustomer).not.toHaveBeenCalled()
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

  it('redirects to /login with error when account linking fails', async () => {
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
    mockLinkOrCreateCustomer.mockRejectedValue(
      new Error('No email found in OAuth profile')
    )

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
