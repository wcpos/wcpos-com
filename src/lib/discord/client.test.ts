import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DiscordApiClient, DiscordRateLimitError } from './client'
import type { DiscordConfig } from './config'

const config: DiscordConfig = {
  clientId: 'client',
  clientSecret: 'secret',
  botToken: 'bot-token',
  guildId: 'guild-123',
  proRoleId: 'role-123',
  adminApiToken: 'admin-token',
}

describe('DiscordApiClient bot endpoints', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockImplementation(async () => new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('uses channel message endpoints without duplicating the API base path', async () => {
    const client = new DiscordApiClient(config)
    await client.listChannelMessages('channel-123')
    await client.getChannelMessage('channel-123', 'message-123')

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://discord.com/api/v10/channels/channel-123/messages?limit=100',
      'https://discord.com/api/v10/channels/channel-123/messages/message-123',
    ])
  })

  it('lists guild members without duplicating the API base path', async () => {
    await new DiscordApiClient(config).listRoleHolderIds()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.com/api/v10/guilds/guild-123/members?limit=1000',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('waits for Retry-After and retries a rate-limited role removal once', async () => {
    vi.useFakeTimers()
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'rate limited', retry_after: 0.25 }), {
          status: 429,
          headers: { 'Retry-After': '0.25' },
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    const removal = new DiscordApiClient(config).removeRole('member-123')
    await vi.runAllTimersAsync()
    await removal

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    expect(headers.get('X-Audit-Log-Reason')).toBe(
      'WCPOS%20reconciliation%3A%20no%20active%20connected%20licence'
    )
  })

  it('does not wait past the reconciliation rate-limit budget', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'rate limited', retry_after: 30 }), {
        status: 429,
        headers: { 'Retry-After': '30' },
      })
    )

    await expect(new DiscordApiClient(config).removeRole('member-123')).rejects.toEqual(
      expect.objectContaining({
        name: DiscordRateLimitError.name,
        retryAfterMs: 30_000,
      })
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
