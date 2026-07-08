import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LicenseDetail } from '@/types/license'

const mocks = vi.hoisted(() => ({
  listAdminCustomers: vi.fn(),
  listAdminCustomerOrders: vi.fn(),
  getResolvedLicenseSnapshotFromOrders: vi.fn(),
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

vi.mock('./config', () => ({
  getDiscordConfig: () => ({ clientId: 'client', clientSecret: 'secret', botToken: 'bot', guildId: 'guild', proRoleId: 'role' }),
}))

vi.mock('./medusa-admin', () => ({
  listAdminCustomers: mocks.listAdminCustomers,
  listAdminCustomerOrders: mocks.listAdminCustomerOrders,
}))

vi.mock('@/lib/customer-licenses', () => ({
  getResolvedLicenseSnapshotFromOrders: mocks.getResolvedLicenseSnapshotFromOrders,
}))

import {
  createDiscordReconcileDependencies,
  createDiscordRoleSyncDependencies,
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


function order(metadata: Record<string, unknown> = {}) {
  return {
    id: 'order_1',
    status: 'completed',
    display_id: 1,
    email: 'ada@example.com',
    currency_code: 'usd',
    total: 129,
    subtotal: 129,
    tax_total: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    items: [],
    metadata,
  }
}

describe('createDiscordReconcileDependencies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reuses the resolved licence snapshot across a reconciliation dependency instance', async () => {
    mocks.listAdminCustomers.mockResolvedValue([{ id: 'cust_1' }])
    mocks.listAdminCustomerOrders.mockResolvedValue([order({ licenses: [{ license_id: 'lic_1' }] })])
    mocks.getResolvedLicenseSnapshotFromOrders.mockResolvedValue({
      licenses: [
        license({
          discordAccess: {
            seatCap: 5,
            blockedDiscordUserIds: [],
            members: [{ id: 'member_1', discordUserId: 'discord_1', connectedAt: '2026-01-01T00:00:00.000Z' }],
          },
        }),
      ],
      complete: true,
    })

    const dependencies = createDiscordReconcileDependencies()

    await expect(dependencies.listConnectedDiscordUserIds()).resolves.toEqual(['discord_1'])
    await expect(dependencies.getLicensesForDiscordUser('discord_1')).resolves.toEqual([
      { status: 'active', expiry: null },
    ])

    expect(mocks.listAdminCustomers).toHaveBeenCalledTimes(1)
    expect(mocks.listAdminCustomerOrders).toHaveBeenCalledTimes(1)
  })

  it('does not mark orphan removals safe when any resolved licence is unverifiable', async () => {
    mocks.listAdminCustomers.mockResolvedValue([{ id: 'cust_1' }])
    mocks.listAdminCustomerOrders.mockResolvedValue([order({ licenses: [{ license_id: 'lic_1' }] })])
    mocks.getResolvedLicenseSnapshotFromOrders.mockResolvedValue({
      licenses: [
        license({ discordAccess: { seatCap: 5, blockedDiscordUserIds: [], members: [] } }),
        { ...license({}), id: 'lic_unknown', status: 'unknown' },
      ],
      complete: false,
    })

    const dependencies = createDiscordReconcileDependencies()

    await expect(dependencies.canRemoveOrphanRoleHolders()).resolves.toBe(false)
  })


  it('does not mark orphan removals safe when an id-only licence reference is omitted', async () => {
    mocks.listAdminCustomers.mockResolvedValue([{ id: 'cust_1' }])
    mocks.listAdminCustomerOrders.mockResolvedValue([order({ licenses: [{ license_id: 'lic_missing' }] })])
    mocks.getResolvedLicenseSnapshotFromOrders.mockResolvedValue({ licenses: [], complete: false })

    const dependencies = createDiscordReconcileDependencies()

    await expect(dependencies.canRemoveOrphanRoleHolders()).resolves.toBe(false)
  })

  it('scans customer orders with bounded concurrency', async () => {
    const customers = Array.from({ length: 7 }, (_, index) => ({ id: `cust_${index}` }))
    let inFlight = 0
    let maxInFlight = 0
    mocks.listAdminCustomers.mockResolvedValue(customers)
    mocks.listAdminCustomerOrders.mockImplementation(async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 0))
      inFlight -= 1
      return []
    })
    mocks.getResolvedLicenseSnapshotFromOrders.mockResolvedValue({ licenses: [], complete: false })

    const dependencies = createDiscordReconcileDependencies()
    await expect(dependencies.listConnectedDiscordUserIds()).resolves.toEqual([])

    expect(maxInFlight).toBeLessThanOrEqual(5)
  })

})

describe('createDiscordRoleSyncDependencies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses a caller-provided licence resolver without scanning the admin catalog', async () => {
    const dependencies = createDiscordRoleSyncDependencies(async (discordUserId) => {
      expect(discordUserId).toBe('discord_1')
      return [{ status: 'active', expiry: null }]
    })

    await expect(dependencies.getLicensesForDiscordUser('discord_1')).resolves.toEqual([
      { status: 'active', expiry: null },
    ])

    expect(mocks.listAdminCustomers).not.toHaveBeenCalled()
    expect(mocks.listAdminCustomerOrders).not.toHaveBeenCalled()
    expect(mocks.getResolvedLicenseSnapshotFromOrders).not.toHaveBeenCalled()
  })

  it('surfaces incomplete admin snapshots as unverifiable during reconciliation sync', async () => {
    mocks.listAdminCustomers.mockResolvedValue([{ id: 'cust_1' }])
    mocks.listAdminCustomerOrders.mockResolvedValue([order({ licenses: [{ license_id: 'lic_missing' }] })])
    mocks.getResolvedLicenseSnapshotFromOrders.mockResolvedValue({ licenses: [], complete: false })

    const dependencies = createDiscordReconcileDependencies()

    await expect(dependencies.getLicensesForDiscordUser('discord_1')).resolves.toEqual([
      { status: 'unknown', expiry: null },
    ])
  })
})
