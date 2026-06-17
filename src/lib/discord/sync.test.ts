import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LicenseLifecycle } from '@/lib/license'
import {
  reconcileDiscordProRoles,
  syncDiscordProRoleForMember,
  type DiscordMemberRoleState,
  type DiscordReconcileDependencies,
  type DiscordRoleSyncDependencies,
} from './sync'

function lifecycle(status: LicenseLifecycle['status'], expiry: string | null): LicenseLifecycle {
  return { status, expiry }
}

function roleState(state: DiscordMemberRoleState) {
  return vi.fn(async () => state)
}

function deps(overrides: Partial<DiscordRoleSyncDependencies> = {}): DiscordRoleSyncDependencies {
  return {
    getLicensesForDiscordUser: vi.fn(async () => []),
    getMemberRoleState: roleState('missing_role'),
    addRole: vi.fn(async () => undefined),
    removeRole: vi.fn(async () => undefined),
    now: () => new Date('2026-06-17T00:00:00.000Z'),
    ...overrides,
  }
}

function reconcileDeps(overrides: Partial<DiscordReconcileDependencies> = {}): DiscordReconcileDependencies {
  return {
    ...deps(),
    listConnectedDiscordUserIds: vi.fn(async () => []),
    canRemoveOrphanRoleHolders: vi.fn(async () => true),
    listRoleHolderIds: vi.fn(async () => []),
    ...overrides,
  }
}

describe('syncDiscordProRoleForMember', () => {
  beforeEach(() => vi.clearAllMocks())

  it('adds the Pro role when any connected licence is active', async () => {
    const d = deps({
      getLicensesForDiscordUser: vi.fn(async () => [lifecycle('expired', '2026-01-01T00:00:00Z'), lifecycle('active', null)]),
    })

    await expect(syncDiscordProRoleForMember('discord_1', d)).resolves.toEqual({ action: 'added', discordUserId: 'discord_1' })
    expect(d.addRole).toHaveBeenCalledWith('discord_1')
  })

  it('removes the Pro role only when no connected licence is active', async () => {
    const d = deps({
      getLicensesForDiscordUser: vi.fn(async () => [lifecycle('expired', '2026-01-01T00:00:00Z')]),
      getMemberRoleState: roleState('has_role'),
    })

    await expect(syncDiscordProRoleForMember('discord_1', d)).resolves.toEqual({ action: 'removed', discordUserId: 'discord_1' })
    expect(d.removeRole).toHaveBeenCalledWith('discord_1')
  })

  it('skips removal when the aggregate entitlement is unverifiable', async () => {
    const d = deps({
      getLicensesForDiscordUser: vi.fn(async () => [lifecycle('unknown', null)]),
      getMemberRoleState: roleState('has_role'),
    })

    await expect(syncDiscordProRoleForMember('discord_1', d)).resolves.toEqual({ action: 'skipped_unverifiable_entitlement', discordUserId: 'discord_1' })
    expect(d.removeRole).not.toHaveBeenCalled()
  })
})

describe('reconcileDiscordProRoles', () => {
  it('does not remove orphan role holders when the connected-member snapshot is incomplete', async () => {
    const d = reconcileDeps({
      listConnectedDiscordUserIds: vi.fn(async () => []),
      canRemoveOrphanRoleHolders: vi.fn(async () => false),
      listRoleHolderIds: vi.fn(async () => ['orphan']),
    })

    await expect(reconcileDiscordProRoles(d)).resolves.toEqual({
      connectedChecked: 0,
      roleHoldersChecked: 0,
      added: 0,
      removed: 0,
      unchanged: 0,
      skipped: 0,
      errors: 1,
    })
    expect(d.listRoleHolderIds).not.toHaveBeenCalled()
    expect(d.removeRole).not.toHaveBeenCalled()
  })

  it('syncs connected members and removes orphan role holders', async () => {
    const d = reconcileDeps({
      listConnectedDiscordUserIds: vi.fn(async () => ['discord_1']),
      getLicensesForDiscordUser: vi.fn(async (discordUserId: string) =>
        discordUserId === 'discord_1' ? [lifecycle('active', null)] : []
      ),
      getMemberRoleState: roleState('has_role'),
      listRoleHolderIds: vi.fn(async () => ['discord_1', 'orphan']),
    })

    await expect(reconcileDiscordProRoles(d)).resolves.toEqual({
      connectedChecked: 1,
      roleHoldersChecked: 2,
      added: 0,
      removed: 1,
      unchanged: 1,
      skipped: 0,
      errors: 0,
    })
    expect(d.removeRole).toHaveBeenCalledWith('orphan')
  })
})
