import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockSetDiscordOAuthState = vi.fn()
const mockBuildAuthorizeUrl = vi.fn(() => 'https://discord.com/oauth2/authorize?state=abc')

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

  it('rejects an empty licence key', async () => {
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/claim', {
      method: 'POST',
      body: JSON.stringify({ licenseKey: '' }),
      headers: { 'content-type': 'application/json' },
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'license_key_required' })
  })
})
