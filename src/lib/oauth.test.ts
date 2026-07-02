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

// Mock next/headers cookies — establishOAuthSession persists the session via
// the real setAuthToken, which writes to the cookie store.
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

import { establishOAuthSession, initiateOAuth } from './oauth'

/**
 * Build a fake JWT whose payload section base64-encodes the given object.
 * `urlSafe` exercises the URL-safe base64 decode path.
 */
function fakeJwt(payload: Record<string, unknown>, urlSafe = false): string {
  let base64 = btoa(JSON.stringify(payload))
  if (urlSafe) {
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }
  return `header.${base64}.signature`
}

const okJson = (body: unknown) => ({ ok: true, json: async () => body })
const okEmpty = () => ({ ok: true, json: async () => ({}) })
const failText = (body: string) => ({ ok: false, text: async () => body })

describe('establishOAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('links, refreshes, then persists for a new identity (actor_id empty)', async () => {
    const initialToken = fakeJwt({ actor_id: '', user_metadata: { email: 'new@x.com' } })
    const refreshedToken = fakeJwt({
      actor_id: 'cust_new',
      user_metadata: { email: 'new@x.com' },
    })

    mockFetch
      .mockResolvedValueOnce(okJson({ token: initialToken })) // completeOAuthCallback
      .mockResolvedValueOnce(okEmpty()) // linkOrCreateCustomer
      .mockResolvedValueOnce(okJson({ token: refreshedToken })) // refreshToken

    const result = await establishOAuthSession('google', { code: 'abc', state: 'xyz' })

    // The three Medusa calls happened in the required order: callback exchange,
    // THEN account-link, THEN token refresh. Asserting the call sequence pins
    // the link-before-refresh invariant directly (the route test could not).
    const urls = mockFetch.mock.calls.map((c) => String(c[0]))
    expect(urls[0]).toContain('/auth/customer/google/callback?code=abc&state=xyz')
    expect(urls[1]).toContain('/store/auth/account-link')
    expect(urls[2]).toContain('/auth/token/refresh')
    expect(mockFetch).toHaveBeenCalledTimes(3)

    // Only the REFRESHED token is persisted — never the pre-link one.
    expect(mockCookieStore.set).toHaveBeenCalledTimes(1)
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'medusa-token',
      refreshedToken,
      expect.objectContaining({ httpOnly: true })
    )

    // The returned payload is the decoded final token, with the linked flag.
    expect(result.linked).toBe(true)
    expect(result.payload.actor_id).toBe('cust_new')
    expect(result.payload.user_metadata.email).toBe('new@x.com')
  })

  it('account-link is authorized with the pre-link token and the publishable key', async () => {
    const initialToken = fakeJwt({ actor_id: '', user_metadata: { email: 'new@x.com' } })
    mockFetch
      .mockResolvedValueOnce(okJson({ token: initialToken }))
      .mockResolvedValueOnce(okEmpty())
      .mockResolvedValueOnce(okJson({ token: fakeJwt({ actor_id: 'cust_new', user_metadata: {} }) }))

    await establishOAuthSession('google', { code: 'abc' })

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://test-store-api.wcpos.com/store/auth/account-link',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${initialToken}`,
          'x-publishable-api-key': 'pk_test_abc123',
        }),
      })
    )
  })

  it('persists the original token without linking or refreshing for an existing identity', async () => {
    const token = fakeJwt({ actor_id: 'cust_existing', user_metadata: { email: 'old@x.com' } })
    mockFetch.mockResolvedValueOnce(okJson({ token }))

    const result = await establishOAuthSession('github', { code: 'def', state: 'uvw' })

    // Only the callback exchange — no account-link, no refresh.
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(String(mockFetch.mock.calls[0][0])).toContain('/auth/customer/github/callback')
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'medusa-token',
      token,
      expect.objectContaining({ httpOnly: true })
    )
    expect(result.linked).toBe(false)
    expect(result.payload.actor_id).toBe('cust_existing')
  })

  it('covers all configured providers, including discord (ADR 0006)', async () => {
    const token = fakeJwt({ actor_id: 'cust_d', user_metadata: { email: 'd@x.com' } })
    mockFetch.mockResolvedValueOnce(okJson({ token }))

    await establishOAuthSession('discord', { code: 'abc', state: 'xyz' })

    expect(String(mockFetch.mock.calls[0][0])).toContain('/auth/customer/discord/callback')
  })

  it('does not persist a session when account linking fails', async () => {
    const initialToken = fakeJwt({ actor_id: '', user_metadata: { email: 'fail@x.com' } })
    mockFetch
      .mockResolvedValueOnce(okJson({ token: initialToken }))
      .mockResolvedValueOnce(failText('{"message":"No email found in OAuth profile"}'))

    await expect(
      establishOAuthSession('google', { code: 'abc' })
    ).rejects.toThrow('No email found in OAuth profile')

    // No partial session: the cookie is never written, and refresh never runs.
    expect(mockCookieStore.set).not.toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('does not persist a session when the token refresh fails', async () => {
    const initialToken = fakeJwt({ actor_id: '', user_metadata: { email: 'fail@x.com' } })
    mockFetch
      .mockResolvedValueOnce(okJson({ token: initialToken }))
      .mockResolvedValueOnce(okEmpty())
      .mockResolvedValueOnce(failText('{"message":"Token refresh failed"}'))

    await expect(
      establishOAuthSession('google', { code: 'abc' })
    ).rejects.toThrow('Token refresh failed')

    expect(mockCookieStore.set).not.toHaveBeenCalled()
  })

  it('surfaces a callback exchange failure without touching the session', async () => {
    mockFetch.mockResolvedValueOnce(failText('{"message":"Invalid state parameter"}'))

    await expect(
      establishOAuthSession('google', { code: 'abc', state: 'tampered' })
    ).rejects.toThrow('Invalid state parameter')

    expect(mockCookieStore.set).not.toHaveBeenCalled()
  })

  it('decodes a URL-safe base64 token payload', async () => {
    const token = fakeJwt(
      { actor_id: 'cust_x', user_metadata: { email: 'test+special@x.com' } },
      true
    )
    mockFetch.mockResolvedValueOnce(okJson({ token }))

    const result = await establishOAuthSession('google', { code: 'abc' })

    expect(result.payload.user_metadata.email).toBe('test+special@x.com')
  })

  it('defaults user_metadata to an empty object when the field is missing', async () => {
    const token = fakeJwt({ actor_id: 'cust_x' })
    mockFetch.mockResolvedValueOnce(okJson({ token }))

    const result = await establishOAuthSession('google', { code: 'abc' })

    expect(result.payload.user_metadata).toEqual({})
  })
})

describe('initiateOAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the callback URL and returns the provider authorization location', async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({ location: 'https://accounts.google.com/o/oauth2/v2/auth?x=1' })
    )

    const location = await initiateOAuth('google', 'https://wcpos.com/api/auth/google/callback')

    expect(location).toBe('https://accounts.google.com/o/oauth2/v2/auth?x=1')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-store-api.wcpos.com/auth/customer/google',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          callback_url: 'https://wcpos.com/api/auth/google/callback',
        }),
      })
    )
  })

  it('throws when Medusa rejects the initiate request', async () => {
    mockFetch.mockResolvedValueOnce(failText('{"message":"Unknown provider"}'))

    await expect(
      initiateOAuth('google', 'https://wcpos.com/cb')
    ).rejects.toThrow('Unknown provider')
  })
})
