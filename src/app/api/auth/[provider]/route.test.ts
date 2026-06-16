import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/utils/env', () => ({
  env: {
    DISCORD_LOGIN_ENABLED: undefined as string | undefined,
  },
}))

const mockInitiateOAuth = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  initiateOAuth: (...args: unknown[]) => mockInitiateOAuth(...args),
}))

vi.mock('@/lib/logger', () => ({
  authLogger: {
    error: () => {},
  },
}))

import { GET } from './route'
import { env } from '@/utils/env'

describe('GET /api/auth/[provider] (OAuth initiate)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    env.DISCORD_LOGIN_ENABLED = undefined
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

  it('rejects Discord when the login flag is disabled', async () => {
    const request = new NextRequest('https://wcpos.com/api/auth/discord')
    const response = await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    expect(response.status).toBe(400)
    expect(mockInitiateOAuth).not.toHaveBeenCalled()
  })

  it('preserves a sanitized redirect target for Discord OAuth', async () => {
    env.DISCORD_LOGIN_ENABLED = 'true'
    mockInitiateOAuth.mockResolvedValueOnce('https://discord.com/oauth2/authorize')

    const request = new NextRequest(
      'https://wcpos.com/api/auth/discord?redirect=%2Fpro%2Fcheckout%3Fvariant%3Dvariant_123'
    )
    await GET(request, {
      params: Promise.resolve({ provider: 'discord' }),
    })

    expect(mockInitiateOAuth).toHaveBeenCalledWith(
      'discord',
      'https://wcpos.com/api/auth/discord/callback?redirect=%2Fpro%2Fcheckout%3Fvariant%3Dvariant_123'
    )
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
