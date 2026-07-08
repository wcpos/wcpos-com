import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockConsumeDiscordOAuthState = vi.fn()
const mockExchangeCode = vi.fn()
const mockGetCurrentUser = vi.fn()
const mockClaimConnectedDiscordMember = vi.fn()
const mockSyncDiscordProRoleForMember = vi.fn()
const mockCreateDiscordRoleSyncDependencies = vi.fn(() => ({}))

vi.mock('@/lib/discord/oauth-state', () => ({
  consumeDiscordOAuthState: (...args: unknown[]) => mockConsumeDiscordOAuthState(...args),
}))
vi.mock('@/lib/discord/client', () => ({
  DiscordApiClient: vi.fn(function DiscordApiClient() {
    return {
      exchangeCode: mockExchangeCode,
      getCurrentUser: mockGetCurrentUser,
    }
  }),
}))
vi.mock('@/lib/discord/config', () => ({
  getDiscordConfig: () => ({ clientId: 'client', clientSecret: 'secret', botToken: 'bot', guildId: 'guild', proRoleId: 'role', adminApiToken: 'admin' }),
  isDiscordConfigured: () => true,
}))
vi.mock('@/lib/discord/connected-member-service', () => ({
  claimConnectedDiscordMember: (...args: unknown[]) => mockClaimConnectedDiscordMember(...args),
}))
vi.mock('@/lib/discord/default-sync', () => ({
  createDiscordRoleSyncDependencies: () => mockCreateDiscordRoleSyncDependencies(),
}))
vi.mock('@/lib/discord/sync', () => ({
  syncDiscordProRoleForMember: (...args: unknown[]) => mockSyncDiscordProRoleForMember(...args),
}))
vi.mock('@/services/core/external/license-client', () => ({
  licenseClient: { validateLicenseKey: vi.fn(), updateLicenseMetadata: vi.fn() },
}))
vi.mock('@/lib/logger', () => ({ infraLogger: { warn: () => {}, error: () => {} } }))

import { GET } from './route'

describe('GET /api/discord/callback', () => {
  beforeEach(() => vi.clearAllMocks())

  it('claims the stored licence key for the verified Discord identity and redirects to licences', async () => {
    mockConsumeDiscordOAuthState.mockResolvedValueOnce({ state: 'state_1', licenseKey: 'WCPOS-AAAA', returnTo: '/account/licenses' })
    mockExchangeCode.mockResolvedValueOnce('token')
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'discord_1', username: 'ada', avatar: null })
    mockClaimConnectedDiscordMember.mockResolvedValueOnce({ status: 'claimed', licenseId: 'lic_1', memberId: 'member_1' })

    const response = await GET(new NextRequest('https://wcpos.com/api/discord/callback?code=abc&state=state_1'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://wcpos.com/account/licenses?discord=claimed')
    expect(mockClaimConnectedDiscordMember).toHaveBeenCalledWith(expect.objectContaining({
      licenseKey: 'WCPOS-AAAA',
      identity: { id: 'discord_1', username: 'ada', avatar: null },
    }))
    expect(mockSyncDiscordProRoleForMember).toHaveBeenCalledWith('discord_1', {})
  })

  it('rejects invalid state without claiming', async () => {
    mockConsumeDiscordOAuthState.mockResolvedValueOnce({ state: 'expected', licenseKey: 'WCPOS-AAAA', returnTo: '/account/licenses' })

    const response = await GET(new NextRequest('https://wcpos.com/api/discord/callback?code=abc&state=actual'))

    expect(response.headers.get('location')).toBe('https://wcpos.com/account/licenses?discord=error')
    expect(mockClaimConnectedDiscordMember).not.toHaveBeenCalled()
  })

  it('falls back to localized licenses page when callback state is missing', async () => {
    mockConsumeDiscordOAuthState.mockResolvedValueOnce(null)

    const response = await GET(new NextRequest('https://wcpos.com/api/discord/callback?code=abc&state=actual', {
      headers: { cookie: 'NEXT_LOCALE=fr' },
    }))

    expect(response.headers.get('location')).toBe('https://wcpos.com/fr/account/licenses?discord=error')
    expect(mockClaimConnectedDiscordMember).not.toHaveBeenCalled()
  })

  it('falls back to Accept-Language when callback state is invalid and no locale cookie exists', async () => {
    mockConsumeDiscordOAuthState.mockResolvedValueOnce(null)

    const response = await GET(new NextRequest('https://wcpos.com/api/discord/callback?code=abc&state=actual', {
      headers: { 'accept-language': 'en-US;q=0.4, de-DE;q=0.9' },
    }))

    expect(response.headers.get('location')).toBe('https://wcpos.com/de/account/licenses?discord=error')
    expect(mockClaimConnectedDiscordMember).not.toHaveBeenCalled()
  })
})
