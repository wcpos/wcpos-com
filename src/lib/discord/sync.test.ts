import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncDiscordProRole, reconcileDiscordProRoles } from './sync'
import type { DiscordRoleSyncCustomer, DiscordRoleSyncDependencies } from './sync'

function customer(overrides: Partial<DiscordRoleSyncCustomer> = {}): DiscordRoleSyncCustomer {
  return {
    id: 'cust_1',
    email: 'customer@example.com',
    metadata: { discord_user_id: 'discord_1' },
    ...overrides,
  }
}

function deps(overrides: Partial<DiscordRoleSyncDependencies> = {}): DiscordRoleSyncDependencies {
  return {
    getLicensesForCustomer: vi.fn(async () => []),
    memberHasRole: vi.fn(async () => false),
    addRole: vi.fn(async () => undefined),
    removeRole: vi.fn(async () => undefined),
    listLinkedCustomers: vi.fn(async () => []),
    listRoleHolderIds: vi.fn(async () => []),
    findCustomerByDiscordUserId: vi.fn(async () => null),
    now: () => new Date('2026-06-11T00:00:00Z'),
    ...overrides,
  }
}

describe('syncDiscordProRole', () => {
  beforeEach(() => vi.clearAllMocks())

  it('adds the Pro role when a linked customer has an active entitlement', async () => {
    const d = deps({
      getLicensesForCustomer: vi.fn(async () => [{ status: 'active', expiry: null }]),
      memberHasRole: vi.fn(async () => false),
    } as Partial<DiscordRoleSyncDependencies>)

    await expect(syncDiscordProRole(customer(), d)).resolves.toEqual({
      action: 'added',
      customerId: 'cust_1',
      discordUserId: 'discord_1',
    })
    expect(d.addRole).toHaveBeenCalledWith('discord_1')
  })

  it('removes the Pro role when a linked customer is not entitled', async () => {
    const d = deps({
      getLicensesForCustomer: vi.fn(async () => [{ status: 'expired', expiry: '2026-01-01T00:00:00Z' }]),
      memberHasRole: vi.fn(async () => true),
    } as Partial<DiscordRoleSyncDependencies>)

    await expect(syncDiscordProRole(customer(), d)).resolves.toEqual({
      action: 'removed',
      customerId: 'cust_1',
      discordUserId: 'discord_1',
    })
    expect(d.removeRole).toHaveBeenCalledWith('discord_1')
  })

  it('skips removal when entitlement cannot be verified', async () => {
    const d = deps({
      getLicensesForCustomer: vi.fn(async () => [{ status: 'unknown' }]),
      memberHasRole: vi.fn(async () => true),
    } as Partial<DiscordRoleSyncDependencies>)

    await expect(syncDiscordProRole(customer(), d)).resolves.toEqual({
      action: 'skipped_unknown_entitlement',
      customerId: 'cust_1',
      discordUserId: 'discord_1',
    })
    expect(d.removeRole).not.toHaveBeenCalled()
  })
})

describe('reconcileDiscordProRoles', () => {
  it('sweeps linked customers and orphan current role holders', async () => {
    const d = deps({
      listLinkedCustomers: vi.fn(async () => [customer()]),
      getLicensesForCustomer: vi.fn(async () => [{ status: 'active', expiry: null }]),
      memberHasRole: vi.fn(async () => true),
      listRoleHolderIds: vi.fn(async () => ['discord_1', 'orphan_discord']),
      findCustomerByDiscordUserId: vi.fn(async (discordUserId: string) =>
        discordUserId === 'discord_1' ? customer() : null
      ),
    } as Partial<DiscordRoleSyncDependencies>)

    await expect(reconcileDiscordProRoles(d)).resolves.toEqual({
      linkedChecked: 1,
      roleHoldersChecked: 2,
      added: 0,
      removed: 1,
      unchanged: 1,
      skipped: 0,
      errors: 0,
    })
    expect(d.removeRole).toHaveBeenCalledWith('orphan_discord')
  })
})
