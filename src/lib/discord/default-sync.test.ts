import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LicenseDetail } from '@/types/license'

const mocks = vi.hoisted(() => ({
  listAllLicenses: vi.fn(),
  listAdminCustomerOrders: vi.fn(),
  findAdminCustomerByEmail: vi.fn(),
  isDiscordDirectoryConfigured: vi.fn(() => false),
  getMemberRoleState: vi.fn(async () => 'missing_role'),
  addRole: vi.fn(async () => undefined),
  removeRole: vi.fn(async () => undefined),
  listRoleHolderIds: vi.fn(async () => []),
}))

vi.mock('./client', () => ({
  DiscordApiClient: vi.fn(function DiscordApiClient() {
    return {
      getMemberRoleState: mocks.getMemberRoleState,
      addRole: mocks.addRole,
      removeRole: mocks.removeRole,
      listRoleHolderIds: mocks.listRoleHolderIds,
    }
  }),
}))

// These factories replace the whole module, so every named export that
// default-sync.ts imports has to appear here — a missing one resolves to
// undefined and only explodes when the code under test calls it.
vi.mock('./config', () => ({
  getDiscordConfig: () => ({ clientId: 'client', clientSecret: 'secret', botToken: 'bot', guildId: 'guild', proRoleId: 'role' }),
  isDiscordDirectoryConfigured: mocks.isDiscordDirectoryConfigured,
}))

vi.mock('./medusa-admin', () => ({
  listAdminCustomerOrders: mocks.listAdminCustomerOrders,
  findAdminCustomerByEmail: mocks.findAdminCustomerByEmail,
}))

vi.mock('@/services/core/external/license-client', () => ({
  licenseClient: {
    listAllLicenses: mocks.listAllLicenses,
  },
}))

import {
  createDiscordLicenseFleetSnapshot,
  createDiscordReconcileDependencies,
  createDiscordRoleSyncDependencies,
  reconcileDiscordDirectory,
  syncDiscordDirectoryForMember,
} from './default-sync'

function license(metadata: Record<string, unknown>): LicenseDetail {
  return {
    id: 'lic_1',
    key: 'WCPOS-AAAA',
    status: 'active',
    expiry: null,
    maxMachines: 1,
    activationCount: 0,
    machines: [],
    metadata,
    policyId: 'policy_1',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}


describe('createDiscordReconcileDependencies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reuses one direct Keygen fleet snapshot across a reconciliation dependency instance', async () => {
    mocks.listAllLicenses.mockResolvedValue([
      license({
        discordAccess: {
          seatCap: 5,
          blockedDiscordUserIds: [],
          members: [{ id: 'member_1', discordUserId: 'discord_1', connectedAt: '2026-01-01T00:00:00.000Z' }],
        },
      }),
    ])

    const dependencies = createDiscordReconcileDependencies()

    await expect(dependencies.listConnectedDiscordUserIds()).resolves.toEqual(['discord_1'])
    await expect(dependencies.getLicensesForDiscordUser('discord_1')).resolves.toEqual([
      { status: 'active', expiry: null },
    ])

    expect(mocks.listAllLicenses).toHaveBeenCalledTimes(1)
    expect(mocks.listAllLicenses).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) })
  })

  it('refreshes the direct fleet before destructive orphan cleanup', async () => {
    mocks.listAllLicenses
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        license({
          discordAccess: {
            seatCap: 5,
            blockedDiscordUserIds: [],
            members: [{ id: 'member_1', discordUserId: 'discord_new', connectedAt: '2026-01-01T00:00:00.000Z' }],
          },
        }),
      ])

    const fleet = createDiscordLicenseFleetSnapshot()
    const dependencies = createDiscordReconcileDependencies(fleet)

    await expect(dependencies.listConnectedDiscordUserIds()).resolves.toEqual([])
    await expect(dependencies.refreshConnectedDiscordUserIds()).resolves.toEqual(['discord_new'])
    await expect(dependencies.getLicensesForDiscordUser('discord_new')).resolves.toEqual([
      { status: 'active', expiry: null },
    ])
    expect(mocks.listAllLicenses).toHaveBeenCalledTimes(2)
    expect(mocks.listAllLicenses).toHaveBeenLastCalledWith({
      signal: expect.any(AbortSignal),
    })
  })

  it('marks orphan removals safe only after the direct fleet snapshot succeeds', async () => {
    mocks.listAllLicenses.mockResolvedValue([])

    const dependencies = createDiscordReconcileDependencies()

    await expect(dependencies.canRemoveOrphanRoleHolders()).resolves.toBe(true)
    expect(mocks.listAllLicenses).toHaveBeenCalledTimes(1)
  })

  it('fails closed when the direct Keygen fleet snapshot fails', async () => {
    mocks.listAllLicenses.mockRejectedValue(new Error('keygen unavailable'))

    const dependencies = createDiscordReconcileDependencies()

    await expect(dependencies.canRemoveOrphanRoleHolders()).rejects.toThrow(
      'keygen unavailable'
    )
    expect(mocks.removeRole).not.toHaveBeenCalled()
  })
})

describe('directory sync gating', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is a silent no-op until DISCORD_DIRECTORY_CHANNEL_ID is configured', async () => {
    mocks.isDiscordDirectoryConfigured.mockReturnValue(false)

    await expect(syncDiscordDirectoryForMember('discord_1')).resolves.toBeUndefined()
    await expect(reconcileDiscordDirectory()).resolves.toBeNull()
  })

  it('fails loud when the directory is flagged on but the channel id is absent', async () => {
    mocks.isDiscordDirectoryConfigured.mockReturnValue(true)

    // getDiscordConfig is mocked without directoryChannelId, so dependency
    // construction must reject rather than silently posting nowhere.
    await expect(syncDiscordDirectoryForMember('discord_1')).rejects.toThrow(
      /DISCORD_DIRECTORY_CHANNEL_ID/
    )
  })
})

describe('createDiscordRoleSyncDependencies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses a caller-provided licence resolver without scanning the Keygen fleet', async () => {
    const dependencies = createDiscordRoleSyncDependencies(async (discordUserId) => {
      expect(discordUserId).toBe('discord_1')
      return [{ status: 'active', expiry: null }]
    })

    await expect(dependencies.getLicensesForDiscordUser('discord_1')).resolves.toEqual([
      { status: 'active', expiry: null },
    ])

    expect(mocks.listAllLicenses).not.toHaveBeenCalled()
  })
})
