import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockInitiateOAuth = vi.fn()

vi.mock('@/lib/oauth', () => ({
  initiateOAuth: (...args: unknown[]) => mockInitiateOAuth(...args),
}))

vi.mock('@/lib/logger', () => ({
  authLogger: {
    error: () => {},
  },
}))

import { GET } from './route'

describe('GET /api/auth/[provider] (OAuth initiate)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    expect(body.error).toContain('facebook')
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
})
