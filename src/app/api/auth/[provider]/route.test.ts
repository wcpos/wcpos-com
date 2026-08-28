import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockInitiateOAuth, mockGetSessionCustomer, mockGetImpersonation } =
  vi.hoisted(() => ({
    mockInitiateOAuth: vi.fn(),
    mockGetSessionCustomer: vi.fn(),
    mockGetImpersonation: vi.fn(),
  }))

vi.mock('@/lib/oauth', () => ({
  initiateOAuth: (...args: unknown[]) => mockInitiateOAuth(...args),
}))

vi.mock('@/lib/logger', () => ({
  authLogger: {
    error: () => {},
  },
}))

vi.mock('@/lib/medusa-auth', () => ({
  getSessionCustomer: (...args: unknown[]) => mockGetSessionCustomer(...args),
}))

vi.mock('@/lib/impersonation', () => ({
  getImpersonation: (...args: unknown[]) => mockGetImpersonation(...args),
}))

import { GET } from './route'

describe('GET /api/auth/[provider] (OAuth initiate)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionCustomer.mockResolvedValue({ id: 'cus_1' })
    mockGetImpersonation.mockResolvedValue(null)
  })

  it('sets the link intent cookie and still redirects to the provider for a session customer', async () => {
    mockInitiateOAuth.mockResolvedValueOnce(
      'https://accounts.google.com/oauth?state=st_123'
    )

    const response = await GET(
      new NextRequest(
        'https://wcpos.com/api/auth/google?intent=link&locale=fr&redirect=%2Faccount%2Fprofile'
      ),
      { params: Promise.resolve({ provider: 'google' }) }
    )

    expect(response.headers.get('location')).toBe(
      'https://accounts.google.com/oauth?state=st_123'
    )
    // Bound to this round-trip: provider + the state the provider will echo.
    expect(response.cookies.get('oauth_link_google')?.value).toBe(
      'st_123:cus_1'
    )
    expect(response.cookies.get('oauth_link_google')?.maxAge).toBe(1800)
    expect(response.cookies.get('oauth_redirect')?.value).toBe(
      '/fr/account/profile'
    )
  })

  it('drops an abandoned same-provider link intent when a plain sign-in starts', async () => {
    mockInitiateOAuth.mockResolvedValueOnce(
      'https://accounts.google.com/oauth?state=st_456'
    )

    const response = await GET(
      new NextRequest(
        'https://wcpos.com/api/auth/google?redirect=%2Faccount',
        { headers: { cookie: 'oauth_link_google=st_123%3Acus_1' } }
      ),
      { params: Promise.resolve({ provider: 'google' }) }
    )

    expect(response.headers.get('location')).toBe(
      'https://accounts.google.com/oauth?state=st_456'
    )
    expect(response.cookies.get('oauth_link_google')?.maxAge).toBe(0)
  })

  it('reports a failed Connect on the profile, not the login page', async () => {
    mockInitiateOAuth.mockRejectedValueOnce(new Error('medusa down'))

    const response = await GET(
      new NextRequest(
        'https://wcpos.com/api/auth/github?intent=link&locale=fr&redirect=%2Faccount%2Fprofile'
      ),
      { params: Promise.resolve({ provider: 'github' }) }
    )

    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/fr/account/profile')
    expect(location.searchParams.get('connect_error')).toBe('failed')
    expect(location.searchParams.get('connect')).toBe('github')
  })

  it('refuses a link intent when the provider redirect carries no state', async () => {
    mockInitiateOAuth.mockResolvedValueOnce('https://accounts.google.com/oauth')

    const response = await GET(
      new NextRequest(
        'https://wcpos.com/api/auth/google?intent=link&locale=fr&redirect=%2Faccount%2Fprofile'
      ),
      { params: Promise.resolve({ provider: 'google' }) }
    )

    expect(response.headers.get('location')).toBe(
      'https://wcpos.com/fr/account/profile'
    )
    expect(response.cookies.get('oauth_link_google')).toBeUndefined()
  })

  it('redirects a signed-out link attempt to the localized profile without setting a link cookie', async () => {
    mockGetSessionCustomer.mockResolvedValueOnce(null)

    const response = await GET(
      new NextRequest(
        'https://wcpos.com/api/auth/google?intent=link&locale=fr&redirect=%2Faccount%2Fprofile'
      ),
      { params: Promise.resolve({ provider: 'google' }) }
    )

    expect(response.headers.get('location')).toBe(
      'https://wcpos.com/fr/account/profile'
    )
    expect(response.cookies.get('oauth_link_google')).toBeUndefined()
    expect(mockInitiateOAuth).not.toHaveBeenCalled()
  })

  it('redirects an impersonated link attempt to the profile without setting a link cookie', async () => {
    mockGetImpersonation.mockResolvedValueOnce({ targetId: 'cus_target' })

    const response = await GET(
      new NextRequest(
        'https://wcpos.com/api/auth/github?intent=link&redirect=%2Faccount%2Fprofile'
      ),
      { params: Promise.resolve({ provider: 'github' }) }
    )

    expect(response.headers.get('location')).toBe(
      'https://wcpos.com/account/profile'
    )
    expect(response.cookies.get('oauth_link_github')).toBeUndefined()
    expect(mockInitiateOAuth).not.toHaveBeenCalled()
  })

  it('redirects to the provider authorization URL returned by Medusa', async () => {
    mockInitiateOAuth.mockResolvedValueOnce(
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=abc&state=xyz'
    )

    const request = new NextRequest('https://wcpos.com/api/auth/google')
    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=abc&state=xyz'
    )
  })

  it('builds the callback URL from the request origin', async () => {
    mockInitiateOAuth.mockResolvedValueOnce('https://github.com/login/oauth')

    const request = new NextRequest('https://wcpos.com/api/auth/github')
    await GET(request, {
      params: Promise.resolve({ provider: 'github' }),
    })

    expect(mockInitiateOAuth).toHaveBeenCalledWith(
      'github',
      'https://wcpos.com/api/auth/github/callback'
    )
  })

  it('rejects unsupported providers with 400 before contacting Medusa', async () => {
    const request = new NextRequest('https://wcpos.com/api/auth/facebook')
    const response = await GET(request, {
      params: Promise.resolve({ provider: 'facebook' }),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({ errorCode: 'unsupported_provider', provider: 'facebook' })
    expect(mockInitiateOAuth).not.toHaveBeenCalled()
  })

  it('initiates Discord OAuth like any other allowed provider', async () => {
    mockInitiateOAuth.mockResolvedValueOnce('https://discord.com/oauth2/authorize')

    const request = new NextRequest('https://wcpos.com/api/auth/discord')
    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    expect(response.status).toBe(307)
    expect(mockInitiateOAuth).toHaveBeenCalledWith(
      'discord',
      'https://wcpos.com/api/auth/discord/callback'
    )
  })

  it('keeps the callback URL bare and carries the redirect target in a cookie', async () => {
    // Providers match redirect_uri byte-for-byte against the registered URI
    // (query string included) — a `?redirect=` on the callback URL fails with
    // redirect_uri_mismatch even when the bare URI is registered (verified
    // live against Google 2026-07-03).
    mockInitiateOAuth.mockResolvedValueOnce('https://discord.com/oauth2/authorize')

    const request = new NextRequest(
      'https://wcpos.com/api/auth/discord?redirect=%2Fpro%2Fcheckout%3Fvariant%3Dvariant_123'
    )
    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    expect(mockInitiateOAuth).toHaveBeenCalledWith(
      'discord',
      'https://wcpos.com/api/auth/discord/callback'
    )
    const cookie = response.cookies.get('oauth_redirect')
    expect(cookie?.value).toBe('/pro/checkout?variant=variant_123')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.path).toBe('/api/auth')
  })

  it('stores non-default locale redirect targets with their URL prefix for server redirects', async () => {
    mockInitiateOAuth.mockResolvedValueOnce('https://discord.com/oauth2/authorize')

    const request = new NextRequest(
      'https://wcpos.com/api/auth/discord?locale=fr&redirect=%2Faccount%2Flicenses'
    )
    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    expect(response.cookies.get('oauth_redirect')?.value).toBe(
      '/fr/account/licenses'
    )
  })

  it('stores regional locale redirect targets with their supported URL prefix', async () => {
    mockInitiateOAuth.mockResolvedValueOnce('https://discord.com/oauth2/authorize')

    const request = new NextRequest(
      'https://wcpos.com/api/auth/discord?locale=pl-PL%3Bq%3D1.0%2C%20fr-FR%3Bq%3D0.9&redirect=%2Faccount%2Flicenses'
    )
    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    expect(response.cookies.get('oauth_redirect')?.value).toBe(
      '/fr/account/licenses'
    )
  })

  it('sets the redirect cookie to the default on a plain sign-in (no stale-cookie hijack)', async () => {
    mockInitiateOAuth.mockResolvedValueOnce('https://discord.com/oauth2/authorize')

    const request = new NextRequest('https://wcpos.com/api/auth/discord')
    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    expect(response.cookies.get('oauth_redirect')?.value).toBe('/account')
  })

  it('sanitizes an absolute-URL redirect down to the safe default before storing it', async () => {
    mockInitiateOAuth.mockResolvedValueOnce('https://discord.com/oauth2/authorize')

    const request = new NextRequest(
      'https://wcpos.com/api/auth/discord?redirect=https%3A%2F%2Fevil.example.com'
    )
    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    expect(response.cookies.get('oauth_redirect')?.value).toBe('/account')
  })

  it('redirects to /login with oauth_failed when initiation fails', async () => {
    mockInitiateOAuth.mockRejectedValueOnce(new Error('Medusa unreachable'))

    const request = new NextRequest('https://wcpos.com/api/auth/google')
    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    expect(response.status).toBe(307)
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('error')).toBe('oauth_failed')
  })

  it('redirects to the localized login page when localized OAuth initiation fails', async () => {
    mockInitiateOAuth.mockRejectedValueOnce(new Error('Medusa unreachable'))

    const request = new NextRequest(
      'https://wcpos.com/api/auth/google?locale=fr'
    )
    const response = await GET(request, {
      params: Promise.resolve({ provider: 'google' }),
    })

    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/fr/login')
    expect(location.searchParams.get('error')).toBe('oauth_failed')
  })
})
