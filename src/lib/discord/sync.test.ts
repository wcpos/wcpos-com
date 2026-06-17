import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncDiscordProRole, reconcileDiscordProRoles } from './sync'
import type {
  DiscordMemberRoleState,
  DiscordReconcileDependencies,
  DiscordRoleSyncCustomer,
  DiscordRoleSyncDependencies,
} from './sync'

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
    getMemberRoleState: memberRoleState('missing_role'),
    addRole: vi.fn(async () => undefined),
    removeRole: vi.fn(async () => undefined),
    now: () => new Date('2026-06-11T00:00:00Z'),
    ...overrides,
  }
}

function reconcileDeps(
  overrides: Partial<DiscordReconcileDependencies> = {}
): DiscordReconcileDependencies {
  return {
    ...deps(),
    listLinkedCustomers: vi.fn(async () => []),
    listRoleHolderIds: vi.fn(async () => []),
    findCustomerByDiscordUserId: vi.fn(async () => null),
    ...overrides,
  }
}

function memberRoleState(state: DiscordMemberRoleState): DiscordRoleSyncDependencies['getMemberRoleState'] {
  return vi.fn(async () => state)
}

describe('syncDiscordProRole', () => {
  beforeEach(() => vi.clearAllMocks())

  it('adds the Pro role when a linked customer has an active entitlement', async () => {
    const d = deps({
      getLicensesForCustomer: vi.fn(async () => [{ status: 'active', expiry: null }]),
      getMemberRoleState: memberRoleState('missing_role'),
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
      getMemberRoleState: memberRoleState('has_role'),
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
      getLicensesForCustomer: vi.fn(async () => [{ status: 'unknown', expiry: null }]),
      getMemberRoleState: memberRoleState('has_role'),
    } as Partial<DiscordRoleSyncDependencies>)

    await expect(syncDiscordProRole(customer(), d)).resolves.toEqual({
      action: 'skipped_unverifiable_entitlement',
      customerId: 'cust_1',
      discordUserId: 'discord_1',
    })
    expect(d.removeRole).not.toHaveBeenCalled()
    expect(d.getMemberRoleState).not.toHaveBeenCalled()
  })

  it('skips role changes when the linked Discord user is not in the guild', async () => {
    const d = deps({
      getLicensesForCustomer: vi.fn(async () => [{ status: 'active', expiry: null }]),
      getMemberRoleState: memberRoleState('not_in_guild'),
    } as Partial<DiscordRoleSyncDependencies>)

    await expect(syncDiscordProRole(customer(), d)).resolves.toEqual({
      action: 'skipped_not_in_guild',
      customerId: 'cust_1',
      discordUserId: 'discord_1',
    })
    expect(d.addRole).not.toHaveBeenCalled()
    expect(d.removeRole).not.toHaveBeenCalled()
  })
})

describe('reconcileDiscordProRoles', () => {
  it('sweeps linked customers and orphan current role holders', async () => {
    const d = reconcileDeps({
      listLinkedCustomers: vi.fn(async () => [customer()]),
      getLicensesForCustomer: vi.fn(async () => [{ status: 'active', expiry: null }]),
      getMemberRoleState: memberRoleState('has_role'),
      listRoleHolderIds: vi.fn(async () => ['discord_1', 'orphan_discord']),
      findCustomerByDiscordUserId: vi.fn(async (discordUserId: string) =>
        discordUserId === 'discord_1' ? customer() : null
      ),
    } as Partial<DiscordReconcileDependencies>)

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

  it('counts a role-holder sweep failure without rejecting the reconciliation run', async () => {
    const d = reconcileDeps({
      listLinkedCustomers: vi.fn(async () => [customer()]),
      getLicensesForCustomer: vi.fn(async () => [{ status: 'active', expiry: null }]),
      getMemberRoleState: memberRoleState('has_role'),
      listRoleHolderIds: vi.fn(async () => {
        throw new Error('Discord member list failed: Missing Access')
      }),
    } as Partial<DiscordReconcileDependencies>)

    await expect(reconcileDiscordProRoles(d)).resolves.toEqual({
      linkedChecked: 1,
      roleHoldersChecked: 0,
      added: 0,
      removed: 0,
      unchanged: 1,
      skipped: 0,
      errors: 1,
    })
  })
})
