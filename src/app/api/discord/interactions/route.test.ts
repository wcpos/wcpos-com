import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  afterQueue,
  envState,
  verifyMock,
  claimMock,
  removeSelfMock,
  lookupMock,
  syncMock,
  directorySyncMock,
  errorMock,
  warnMock,
} = vi.hoisted(() => ({
  afterQueue: [] as Array<() => Promise<void> | void>,
  envState: { DISCORD_PUBLIC_KEY: 'public-key', DISCORD_GUILD_ID: 'guild_1' } as {
    DISCORD_PUBLIC_KEY?: string
    DISCORD_GUILD_ID?: string
  },
  verifyMock: vi.fn(() => true),
  claimMock: vi.fn(),
  removeSelfMock: vi.fn(),
  lookupMock: vi.fn(),
  syncMock: vi.fn(),
  directorySyncMock: vi.fn(),
  errorMock: vi.fn(),
  warnMock: vi.fn(),
}))

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (task: () => Promise<void> | void) => {
    afterQueue.push(task)
  },
}))
vi.mock('@/utils/env', () => ({ env: envState }))
vi.mock('@/lib/logger', () => ({
  infraLogger: { error: errorMock, warn: warnMock, info: vi.fn() },
}))
vi.mock('@/lib/discord/interaction-verify', () => ({
  verifyDiscordInteractionSignature: verifyMock,
}))
vi.mock('@/lib/discord/connected-member-service', () => ({
  claimConnectedDiscordMember: claimMock,
  removeConnectedDiscordMemberSelf: removeSelfMock,
}))
vi.mock('@/lib/discord/sync', () => ({ syncDiscordProRoleForMember: syncMock }))
vi.mock('@/lib/discord/default-sync', () => ({
  createDiscordRoleSyncDependencies: vi.fn(() => ({})),
  syncDiscordDirectoryForMember: directorySyncMock,
}))
vi.mock('@/lib/discord/customer-lookup', () => ({ lookupDiscordCustomerInfo: lookupMock }))
vi.mock('@/lib/discord/medusa-admin', () => ({
  findAdminCustomerByEmail: vi.fn(),
  listAdminCustomerOrders: vi.fn(),
}))
vi.mock('@/lib/discord/client', () => ({
  DiscordApiClient: vi.fn(function DiscordApiClient() {
    return { getMemberRoleState: vi.fn(async () => 'has_role') }
  }),
}))
vi.mock('@/lib/discord/config', () => ({
  getDiscordConfig: vi.fn(() => ({})),
  isDiscordConfigured: vi.fn(() => true),
}))
vi.mock('@/services/core/external/license-client', () => ({
  licenseClient: {
    validateLicenseKey: vi.fn(),
    getLicense: vi.fn(async () => ({ status: 'active', expiry: null })),
    updateLicenseMetadata: vi.fn(),
    listAllLicenses: vi.fn(async () => []),
  },
}))

import { POST } from './route'

const fetchMock = vi.fn<(...args: unknown[]) => Promise<{ ok: boolean; text(): Promise<string> }>>(
  async () => ({ ok: true, text: async () => '' })
)
vi.stubGlobal('fetch', fetchMock)

function editedPayload(): { content?: string; embeds?: Array<{ title: string; description: string }> } {
  const init = fetchMock.mock.calls[0][1] as { body: string }
  return JSON.parse(init.body) as ReturnType<typeof editedPayload>
}

function editedContent(): string {
  return editedPayload().content ?? ''
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('https://wcpos.com/api/discord/interactions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-signature-ed25519': 'sig',
      'x-signature-timestamp': 'ts',
    },
  })
}

async function flushAfter() {
  const tasks = afterQueue.splice(0)
  await Promise.all(tasks.map((task) => task()))
}

const member = {
  user: { id: 'discord_1', username: 'ada', avatar: 'hash' },
  permissions: '0',
}

function unlinkInteraction(key = 'WCPOS-AAAA-1234') {
  return {
    type: 2,
    application_id: '123456789012345678',
    token: 'aW50ZXJhY3Rpb25fdG9rZW4',
    guild_id: 'guild_1',
    member,
    data: { type: 1, name: 'unlink', options: [{ name: 'key', value: key }] },
  }
}

function linkInteraction(key = 'WCPOS-AAAA-1234') {
  return {
    type: 2,
    application_id: '123456789012345678',
    token: 'aW50ZXJhY3Rpb25fdG9rZW4',
    guild_id: 'guild_1',
    member,
    data: { type: 1, name: 'link', options: [{ name: 'key', value: key }] },
  }
}

describe('POST /api/discord/interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    afterQueue.length = 0
    envState.DISCORD_PUBLIC_KEY = 'public-key'
    envState.DISCORD_GUILD_ID = 'guild_1'
    verifyMock.mockReturnValue(true)
  })

  it('fails loud (503) when the public key is not configured', async () => {
    delete envState.DISCORD_PUBLIC_KEY
    const response = await POST(makeRequest({ type: 1 }))
    expect(response.status).toBe(503)
    expect(errorMock).toHaveBeenCalled()
  })

  it('fails loud (503) when the guild id is not configured', async () => {
    delete envState.DISCORD_GUILD_ID
    const response = await POST(makeRequest(linkInteraction()))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ errorCode: 'discord_interactions_unconfigured' })
    expect(errorMock).toHaveBeenCalled()
  })

  it('rejects an invalid signature with 401 before doing any work', async () => {
    verifyMock.mockReturnValue(false)
    const response = await POST(makeRequest(linkInteraction()))
    expect(response.status).toBe(401)
    expect(claimMock).not.toHaveBeenCalled()
    expect(afterQueue).toHaveLength(0)
  })

  it('answers PING with PONG', async () => {
    const response = await POST(makeRequest({ type: 1 }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ type: 1 })
  })

  it('defers /link ephemerally, claims the seat and edits the original reply', async () => {
    claimMock.mockResolvedValue({ status: 'claimed', licenseId: 'lic_1', memberId: 'm1' })

    const response = await POST(makeRequest(linkInteraction()))
    expect(await response.json()).toEqual({ type: 5, data: { flags: 64 } })

    await flushAfter()

    expect(claimMock).toHaveBeenCalledWith(
      expect.objectContaining({
        licenseKey: 'WCPOS-AAAA-1234',
        identity: { id: 'discord_1', username: 'ada', avatar: 'hash' },
      })
    )
    expect(syncMock).toHaveBeenCalledWith('discord_1', expect.anything())
    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.com/api/v10/webhooks/123456789012345678/aW50ZXJhY3Rpb25fdG9rZW4/messages/@original',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(editedContent()).toContain('✅')
    expect(editedContent()).toContain('`****-1234`')
  })

  it('reports a generic failure into the deferred reply when the claim throws', async () => {
    claimMock.mockRejectedValue(new Error('keygen down'))

    await POST(makeRequest(linkInteraction()))
    await flushAfter()

    expect(editedContent()).toMatch(/went wrong/)
    expect(errorMock).toHaveBeenCalled()
  })

  it('does not let a rejected Discord follow-up edit escape the background task', async () => {
    claimMock.mockRejectedValue(new Error('keygen down'))
    fetchMock.mockRejectedValueOnce(new Error('discord down'))

    await POST(makeRequest(linkInteraction()))
    await expect(flushAfter()).resolves.toBeUndefined()

    expect(errorMock).toHaveBeenCalled()
  })

  it('defers /unlink and edits with the self-unlink outcome', async () => {
    removeSelfMock.mockResolvedValue({ status: 'removed', licenseId: 'lic_1' })

    const response = await POST(
      makeRequest({
        type: 2,
        application_id: '123456789012345678',
        token: 'aW50ZXJhY3Rpb25fdG9rZW4',
        guild_id: 'guild_1',
        member,
        data: { type: 1, name: 'unlink', options: [{ name: 'key', value: 'WCPOS-AAAA-1234' }] },
      })
    )
    expect(await response.json()).toEqual({ type: 5, data: { flags: 64 } })

    await flushAfter()
    expect(removeSelfMock).toHaveBeenCalledWith(
      expect.objectContaining({ licenseKey: 'WCPOS-AAAA-1234', discordUserId: 'discord_1' })
    )
    // No inline role removal on unlink — reconciliation settles the role.
    expect(syncMock).not.toHaveBeenCalled()
  })

  // The directory upsert is a slow, best-effort fleet scan. Awaiting it before
  // the follow-up edit would strand the user in the loading state and can
  // outlive the interaction token even though the command already succeeded.
  it('edits the /link reply before kicking off the directory upsert', async () => {
    claimMock.mockResolvedValue({ status: 'claimed', licenseId: 'lic_1', memberId: 'm1' })

    await POST(makeRequest(linkInteraction()))
    await flushAfter()

    expect(directorySyncMock).toHaveBeenCalledWith('discord_1')
    expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(
      directorySyncMock.mock.invocationCallOrder[0]
    )
  })

  it('edits the /unlink reply before kicking off the directory upsert', async () => {
    removeSelfMock.mockResolvedValue({ status: 'removed', licenseId: 'lic_1' })

    await POST(makeRequest(unlinkInteraction()))
    await flushAfter()

    expect(directorySyncMock).toHaveBeenCalledWith('discord_1')
    expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(
      directorySyncMock.mock.invocationCallOrder[0]
    )
  })

  it('keeps the successful /link reply when the best-effort directory upsert throws', async () => {
    claimMock.mockResolvedValue({ status: 'claimed', licenseId: 'lic_1', memberId: 'm1' })
    directorySyncMock.mockRejectedValueOnce(new Error('directory channel gone'))

    await POST(makeRequest(linkInteraction()))
    await expect(flushAfter()).resolves.toBeUndefined()

    // One edit only: the success reply is never overwritten by the failure reply.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(editedContent()).toContain('✅')
    expect(warnMock).toHaveBeenCalled()
  })

  it('keeps the successful /unlink reply when the best-effort directory upsert throws', async () => {
    removeSelfMock.mockResolvedValue({ status: 'removed', licenseId: 'lic_1' })
    directorySyncMock.mockRejectedValueOnce(new Error('directory channel gone'))

    await POST(makeRequest(unlinkInteraction()))
    await expect(flushAfter()).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(errorMock).not.toHaveBeenCalled()
    expect(warnMock).toHaveBeenCalled()
  })

  it('refuses Customer info for members without Manage Server', async () => {
    const response = await POST(
      makeRequest({
        type: 2,
        application_id: '123456789012345678',
        token: 'aW50ZXJhY3Rpb25fdG9rZW4',
        guild_id: 'guild_1',
        member: { ...member, permissions: '0' },
        data: { type: 2, name: 'Customer info', target_id: 'discord_9' },
      })
    )
    const payload = await response.json()
    expect(payload.type).toBe(4)
    expect(payload.data.content).toMatch(/Manage Server/)
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it('runs Customer info for an admin and edits with the card', async () => {
    lookupMock.mockResolvedValue({ licences: [], customerSince: null, roleState: 'not_in_guild' })

    const response = await POST(
      makeRequest({
        type: 2,
        application_id: '123456789012345678',
        token: 'aW50ZXJhY3Rpb25fdG9rZW4',
        guild_id: 'guild_1',
        member: { ...member, permissions: '32' },
        data: {
          type: 2,
          name: 'Customer info',
          target_id: 'discord_9',
          resolved: { users: { discord_9: { id: 'discord_9', username: 'oceanwatcher' } } },
        },
      })
    )
    expect(await response.json()).toEqual({ type: 5, data: { flags: 64 } })

    await flushAfter()
    expect(lookupMock).toHaveBeenCalledWith('discord_9', expect.anything())
    const embed = editedPayload().embeds?.[0]
    expect(embed?.title).toContain('@oceanwatcher')
    expect(embed?.description).toContain('No licenses have this Discord account')
  })

  it('rejects signed commands from any guild other than the configured WCPOS guild', async () => {
    const response = await POST(makeRequest({ ...linkInteraction(), guild_id: 'staging_guild' }))

    const payload = await response.json()
    expect(payload.type).toBe(4)
    expect(payload.data.content).toMatch(/inside the WCPOS Discord server/)
    expect(claimMock).not.toHaveBeenCalled()
    expect(afterQueue).toHaveLength(0)
  })

  it('tells DM invocations the commands are guild-only', async () => {
    const response = await POST(
      makeRequest({
        type: 2,
        application_id: '123456789012345678',
        token: 'aW50ZXJhY3Rpb25fdG9rZW4',
        user: { id: 'discord_1', username: 'ada', avatar: null },
        data: { type: 1, name: 'link', options: [{ name: 'key', value: 'WCPOS-AAAA-1234' }] },
      })
    )
    const payload = await response.json()
    expect(payload.type).toBe(4)
    expect(payload.data.content).toMatch(/inside the WCPOS Discord server/)
  })
})
