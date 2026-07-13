import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DiscordApiClient } from './client'
import type { DiscordConfig } from './config'

const config: DiscordConfig = {
  clientId: 'client',
  clientSecret: 'secret',
  botToken: 'bot-token',
  guildId: 'guild-123',
  proRoleId: 'role-123',
  adminApiToken: 'admin-token',
}

describe('DiscordApiClient directory endpoints', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue(new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('lists channel messages without duplicating the API base path', async () => {
    await new DiscordApiClient(config).listChannelMessages('channel-123')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.com/api/v10/channels/channel-123/messages?limit=100',
      expect.anything()
    )
  })
})
