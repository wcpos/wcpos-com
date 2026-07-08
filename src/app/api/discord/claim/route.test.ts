import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockSetDiscordOAuthState = vi.fn()
const mockBuildAuthorizeUrl = vi.fn(() => 'https://discord.com/oauth2/authorize?state=abc')
const { infoMock } = vi.hoisted(() => ({ infoMock: vi.fn() }))

vi.mock('@/lib/logger', () => ({
  apiLogger: { info: infoMock },
}))

vi.mock('@/lib/discord/oauth-state', () => ({
  setDiscordOAuthState: (...args: unknown[]) => mockSetDiscordOAuthState(...args),
}))
vi.mock('@/lib/discord/client', () => ({
  DiscordApiClient: vi.fn(function DiscordApiClient() {
    return { buildAuthorizeUrl: mockBuildAuthorizeUrl }
  }),
}))
vi.mock('@/lib/discord/config', () => ({
  getDiscordConfig: () => ({ clientId: 'client', clientSecret: 'secret', botToken: 'bot', guildId: 'guild', proRoleId: 'role', adminApiToken: 'admin' }),
}))

import { POST } from './route'

describe('POST /api/discord/claim', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores licence-key OAuth state and redirects to Discord identify', async () => {
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/claim', {
      method: 'POST',
      body: JSON.stringify({ licenseKey: ' WCPOS-AAAA ', returnTo: '/account/licenses' }),
      headers: { 'content-type': 'application/json' },
    }))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://discord.com/oauth2/authorize?state=abc')
    expect(mockSetDiscordOAuthState).toHaveBeenCalledWith(expect.objectContaining({
      licenseKey: 'WCPOS-AAAA',
      returnTo: '/account/licenses',
      state: expect.any(String),
    }))
  })

  it('falls back to the locale-aware licenses page when returnTo is missing', async () => {
    await POST(new NextRequest('https://wcpos.com/api/discord/claim', {
      method: 'POST',
      body: JSON.stringify({ licenseKey: 'WCPOS-AAAA' }),
      headers: {
        'content-type': 'application/json',
        cookie: 'NEXT_LOCALE=fr',
      },
    }))

    expect(mockSetDiscordOAuthState).toHaveBeenCalledWith(expect.objectContaining({
      licenseKey: 'WCPOS-AAAA',
      returnTo: '/fr/account/licenses',
      state: expect.any(String),
    }))
  })

  it('falls back to the best Accept-Language locale for unsafe returnTo values', async () => {
    await POST(new NextRequest('https://wcpos.com/api/discord/claim', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey: 'WCPOS-AAAA',
        returnTo: 'https://evil.example/account/licenses',
      }),
      headers: {
        'content-type': 'application/json',
        'accept-language': 'en-US;q=0.4, fr-FR;q=0.9',
      },
    }))

    expect(mockSetDiscordOAuthState).toHaveBeenCalledWith(expect.objectContaining({
      returnTo: '/fr/account/licenses',
    }))
  })

  it('rejects an empty licence key', async () => {
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/claim', {
      method: 'POST',
      body: JSON.stringify({ licenseKey: '' }),
      headers: { 'content-type': 'application/json' },
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ errorCode: 'license_key_required' })
  })

  it('accepts a same-site form post (the licences-page Connect button)', async () => {
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/claim', {
      method: 'POST',
      body: new URLSearchParams({
        licenseKey: ' WCPOS-AAAA ',
        returnTo: '/account/licenses',
      }).toString(),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://wcpos.com',
      },
    }))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://discord.com/oauth2/authorize?state=abc')
    expect(mockSetDiscordOAuthState).toHaveBeenCalledWith(expect.objectContaining({
      licenseKey: 'WCPOS-AAAA',
      returnTo: '/account/licenses',
    }))
  })

  it('rejects a cross-site form post without starting an OAuth round-trip', async () => {
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/claim', {
      method: 'POST',
      body: new URLSearchParams({ licenseKey: 'WCPOS-AAAA' }).toString(),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://evil.example',
      },
    }))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ errorCode: 'cross_site_request' })
    expect(mockSetDiscordOAuthState).not.toHaveBeenCalled()
  })

  it('rejects a form post with an empty licence key', async () => {
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/claim', {
      method: 'POST',
      body: new URLSearchParams({ licenseKey: '   ' }).toString(),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://wcpos.com',
      },
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ errorCode: 'license_key_required' })
  })

  it('rejects a form post without an Origin header (fail closed)', async () => {
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/claim', {
      method: 'POST',
      body: new URLSearchParams({ licenseKey: 'WCPOS-AAAA' }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }))

    expect(response.status).toBe(403)
    expect(mockSetDiscordOAuthState).not.toHaveBeenCalled()
  })

  it('logs a malformed JSON body at info and rejects with 400', async () => {
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/claim', {
      method: 'POST',
      body: 'not-json',
      headers: { 'content-type': 'application/json' },
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ errorCode: 'license_key_required' })
    // The parse failure is no longer swallowed silently, but it is
    // client-caused so it stays at info (error level fans out to alerts).
    expect(infoMock).toHaveBeenCalledTimes(1)
  })
})
