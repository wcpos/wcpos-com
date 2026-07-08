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

// The route now delegates the whole session-establishment dance (link → refresh
// → persist) to establishOAuthSession. This test owns only the route's own
// responsibilities: provider validation, param forwarding, profile sync, and
// the redirect. The ordering invariant is pinned in oauth.test.ts.
const mockEstablishOAuthSession = vi.fn()
const mockGetSessionCustomer = vi.fn()
const mockUpdateCustomer = vi.fn()

vi.mock('@/lib/oauth', () => ({
  establishOAuthSession: (...args: unknown[]) => mockEstablishOAuthSession(...args),
}))

vi.mock('@/lib/medusa-auth', () => ({
  getSessionCustomer: (...args: unknown[]) => mockGetSessionCustomer(...args),
  updateCustomer: (...args: unknown[]) => mockUpdateCustomer(...args),
}))

import { GET } from './route'

/** Build the value establishOAuthSession resolves to. */
function session(
  userMetadata: Record<string, string>,
  { linked = false }: { linked?: boolean } = {}
) {
  return {
    payload: {
      actor_id: linked ? '' : 'cust_existing',
      actor_type: 'customer',
      auth_identity_id: 'auth_1',
      app_metadata: {},
      user_metadata: userMetadata,
    },
    linked,
  }
}

describe('OAuth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionCustomer.mockResolvedValue({ id: 'cust_1', metadata: {} })
    mockUpdateCustomer.mockResolvedValue(undefined)
  })

  it('establishes a session and redirects to /account for a new OAuth user (Google)', async () => {
    mockEstablishOAuthSession.mockResolvedValue(
      session(
        { email: 'alice@gmail.com', given_name: 'Alice', family_name: 'Smith' },
        { linked: true }
      )
    )

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google/callback?code=abc&state=xyz'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    expect(mockEstablishOAuthSession).toHaveBeenCalledWith('google', {
      code: 'abc',
      state: 'xyz',
    })
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe('/account')
  })

  it('establishes a session and redirects for an existing user (GitHub)', async () => {
    mockEstablishOAuthSession.mockResolvedValue(
      session({ email: 'bob@github.com', name: 'Bob Jones' })
    )

    const request = new NextRequest(
      'https://wcpos.com/api/auth/github/callback?code=def&state=uvw'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'github' }),
    })

    expect(mockEstablishOAuthSession).toHaveBeenCalledWith('github', {
      code: 'def',
      state: 'uvw',
    })
    expect(response.status).toBe(307)
  })

  it('stores connected avatar in customer metadata when available', async () => {
    mockEstablishOAuthSession.mockResolvedValue(
      session({
        email: 'avatar@example.com',
        avatar_url: 'https://avatars.example.com/user.png',
      })
    )

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google/callback?code=ghi&state=rst'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    expect(response.status).toBe(307)
    expect(mockUpdateCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          oauth_avatar_url: 'https://avatars.example.com/user.png',
          // The provider is recorded so the profile can show truthful
          // per-provider connection state.
          auth_providers: ['google'],
          last_sign_in_provider: 'google',
        }),
      })
    )
  })

  it('persists the sign-in provider even when no avatar is present', async () => {
    mockEstablishOAuthSession.mockResolvedValue(
      session({ email: 'noavatar@example.com' })
    )

    const request = new NextRequest(
      'https://wcpos.com/api/auth/github/callback?code=xyz&state=uvw'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'github' }),
    })

    expect(response.status).toBe(307)
    expect(mockUpdateCustomer).toHaveBeenCalledWith({
      metadata: { auth_providers: ['github'], last_sign_in_provider: 'github' },
    })
  })

  it('does not re-write metadata when the provider is already the latest and the avatar is unchanged', async () => {
    mockGetSessionCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      metadata: { auth_providers: ['google'], last_sign_in_provider: 'google' },
    })
    mockEstablishOAuthSession.mockResolvedValue(
      session({ email: 'repeat@example.com' })
    )

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google/callback?code=abc&state=def'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    expect(response.status).toBe(307)
    expect(mockUpdateCustomer).not.toHaveBeenCalled()
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
    expect(body).toEqual({ errorCode: 'unsupported_provider', provider: 'facebook' })
    expect(mockEstablishOAuthSession).not.toHaveBeenCalled()
  })

  it('forwards all OAuth query params (code, state, ...) to establishOAuthSession', async () => {
    mockEstablishOAuthSession.mockResolvedValue(
      session({ email: 'existing@example.com' })
    )

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google/callback?code=abc&state=csrf_state_123&scope=email'
    )

    await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    // Medusa validates the CSRF state server-side, so the route must forward
    // every provider query param verbatim (minus the storefront `redirect`).
    expect(mockEstablishOAuthSession).toHaveBeenCalledWith('google', {
      code: 'abc',
      state: 'csrf_state_123',
      scope: 'email',
    })
  })

  it('redirects to the target carried by the oauth_redirect cookie and consumes it (Discord)', async () => {
    mockEstablishOAuthSession.mockResolvedValue(
      session({ email: 'discord@example.com' })
    )

    // The callback URL is bare — the destination arrives in the cookie set at
    // initiate time (providers reject redirect_uri with extra query params).
    const request = new NextRequest(
      'https://wcpos.com/api/auth/discord/callback?code=abc&state=xyz',
      { headers: { cookie: 'oauth_redirect=%2Fpro%2Fcheckout%3Fvariant%3Dvariant_123' } }
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    expect(mockEstablishOAuthSession).toHaveBeenCalledWith('discord', {
      code: 'abc',
      state: 'xyz',
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://wcpos.com/pro/checkout?variant=variant_123'
    )
    // Single-use: consumed on success.
    expect(response.cookies.get('oauth_redirect')?.value).toBe('')
    expect(response.cookies.get('oauth_redirect')?.maxAge).toBe(0)
  })

  it('still honors a legacy ?redirect= query param from flows initiated pre-deploy', async () => {
    mockEstablishOAuthSession.mockResolvedValue(
      session({ email: 'discord@example.com' })
    )

    const request = new NextRequest(
      'https://wcpos.com/api/auth/discord/callback?code=abc&state=xyz&redirect=%2Fpro%2Fcheckout%3Fvariant%3Dvariant_123'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    // The storefront `redirect` param is stripped before forwarding to Medusa.
    expect(mockEstablishOAuthSession).toHaveBeenCalledWith('discord', {
      code: 'abc',
      state: 'xyz',
    })
    expect(response.headers.get('location')).toBe(
      'https://wcpos.com/pro/checkout?variant=variant_123'
    )
  })

  it('sanitizes a malicious cookie value down to the safe default', async () => {
    mockEstablishOAuthSession.mockResolvedValue(
      session({ email: 'discord@example.com' })
    )

    const request = new NextRequest(
      'https://wcpos.com/api/auth/discord/callback?code=abc&state=xyz',
      { headers: { cookie: 'oauth_redirect=https%3A%2F%2Fevil.example.com' } }
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    expect(response.headers.get('location')).toBe('https://wcpos.com/account')
  })

  it('preserves locale-prefixed redirect cookies on successful server redirects', async () => {
    mockEstablishOAuthSession.mockResolvedValue(
      session({ email: 'discord@example.com' })
    )

    const request = new NextRequest(
      'https://wcpos.com/api/auth/discord/callback?code=abc&state=xyz',
      { headers: { cookie: 'oauth_redirect=%2Ffr%2Faccount%2Flicenses' } }
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    expect(response.headers.get('location')).toBe(
      'https://wcpos.com/fr/account/licenses'
    )
  })

  it('persists the locale from the OAuth redirect target for localized emails', async () => {
    mockGetSessionCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      metadata: { auth_providers: ['google'], last_sign_in_provider: 'google' },
    })
    mockEstablishOAuthSession.mockResolvedValue(
      session({ email: 'locale@example.com' })
    )

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google/callback?code=abc&state=xyz',
      { headers: { cookie: 'oauth_redirect=%2Ffr%2Faccount' } }
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    expect(response.headers.get('location')).toBe('https://wcpos.com/fr/account')
    expect(mockUpdateCustomer).toHaveBeenCalledWith({
      metadata: {
        auth_providers: ['google'],
        last_sign_in_provider: 'google',
        locale: 'fr',
      },
    })
  })


  it('preserves safe OAuth error codes for localized login feedback', async () => {
    mockEstablishOAuthSession.mockRejectedValue(new Error('oauth_email_unverified'))

    const request = new NextRequest(
      'https://wcpos.com/api/auth/discord/callback?code=abc&state=xyz'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('error')).toBe('oauth_email_unverified')
  })

  it('redirects OAuth failures back to the locale-prefixed login page', async () => {
    mockEstablishOAuthSession.mockRejectedValue(new Error('oauth_email_unverified'))

    const request = new NextRequest(
      'https://wcpos.com/api/auth/discord/callback?code=abc&state=xyz',
      { headers: { cookie: 'oauth_redirect=%2Ffr%2Faccount' } }
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/fr/login')
    expect(location.searchParams.get('error')).toBe('oauth_email_unverified')
  })

  it('collapses raw OAuth exception messages to the generic login error code', async () => {
    mockEstablishOAuthSession.mockRejectedValue(new Error('Invalid state parameter'))

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google/callback?code=abc&state=tampered'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('error')).toBe('oauth_failed')
  })

  it('redirects to /login with error when establishing the session fails', async () => {
    mockEstablishOAuthSession.mockRejectedValue(
      new Error('Invalid state parameter')
    )

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google/callback?code=abc&state=tampered'
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    expect(response.status).toBe(303)
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('error')).toBe('oauth_failed')

    // A failed sign-in must not run profile sync.
    expect(mockUpdateCustomer).not.toHaveBeenCalled()
  })
})
