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
    refreshConnectedDiscordUserIds: vi.fn(async () => []),
    canRemoveOrphanRoleHolders: vi.fn(async () => true),
    listRoleHolderIds: vi.fn(async () => []),
    canContinueOrphanCleanup: vi.fn(() => true),
    isRateLimitError: vi.fn(() => false),
    reportFailure: vi.fn(),
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
      orphanRemovalsDeferred: 0,
      roleRestorationsDeferred: 0,
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
      refreshConnectedDiscordUserIds: vi.fn(async () => ['discord_1']),
    })

    await expect(reconcileDiscordProRoles(d)).resolves.toEqual({
      connectedChecked: 1,
      roleHoldersChecked: 2,
      orphanRemovalsDeferred: 0,
      roleRestorationsDeferred: 0,
      added: 0,
      removed: 1,
      unchanged: 1,
      skipped: 0,
      errors: 0,
    })
    expect(d.removeRole).toHaveBeenCalledWith('orphan')
    expect(d.getMemberRoleState).toHaveBeenCalledTimes(1)
    expect(d.getMemberRoleState).toHaveBeenCalledWith('discord_1')
  })

  it('restores a role when the authoritative post-delete snapshot shows a new connection', async () => {
    const d = reconcileDeps({
      listRoleHolderIds: vi.fn(async () => ['newly_connected', 'orphan']),
      refreshConnectedDiscordUserIds: vi.fn(async () => ['newly_connected']),
    })

    await expect(reconcileDiscordProRoles(d)).resolves.toMatchObject({
      roleHoldersChecked: 2,
      removed: 1,
      added: 0,
      unchanged: 1,
      errors: 0,
    })
    expect(d.removeRole).toHaveBeenCalledTimes(2)
    expect(d.addRole).toHaveBeenCalledOnce()
    expect(d.addRole).toHaveBeenCalledWith('newly_connected')
  })

  it('rolls back orphan removals when the post-delete authority refresh fails', async () => {
    const refreshError = new Error('keygen refresh unavailable')
    const d = reconcileDeps({
      listRoleHolderIds: vi.fn(async () => ['orphan']),
      refreshConnectedDiscordUserIds: vi.fn(async () => {
        throw refreshError
      }),
    })

    await expect(reconcileDiscordProRoles(d)).resolves.toMatchObject({
      roleHoldersChecked: 1,
      removed: 0,
      added: 0,
      unchanged: 1,
      errors: 1,
      orphanRemovalsDeferred: 1,
    })
    expect(d.removeRole).toHaveBeenCalledWith('orphan')
    expect(d.addRole).toHaveBeenCalledWith('orphan')
    expect(d.reportFailure).toHaveBeenCalledWith({
      discordUserId: null,
      operation: 'refresh_snapshot',
      error: refreshError,
    })
  })

  it('stops all reconciliation when connected-member sync is rate limited', async () => {
    const rateLimit = new Error('rate limited')
    const d = reconcileDeps({
      listConnectedDiscordUserIds: vi.fn(async () => ['discord_1', 'discord_2']),
      getMemberRoleState: vi.fn(async () => {
        throw rateLimit
      }),
      isRateLimitError: vi.fn((error) => error === rateLimit),
      listRoleHolderIds: vi.fn(async () => ['orphan']),
    })

    await expect(reconcileDiscordProRoles(d)).resolves.toMatchObject({
      connectedChecked: 1,
      roleHoldersChecked: 0,
      errors: 1,
    })
    expect(d.getMemberRoleState).toHaveBeenCalledOnce()
    expect(d.listRoleHolderIds).not.toHaveBeenCalled()
  })

  it('bounds orphan removals and reports the work deferred to later runs', async () => {
    const orphanIds = Array.from({ length: 30 }, (_, index) => `orphan_${index + 1}`)
    const d = reconcileDeps({
      listRoleHolderIds: vi.fn(async () => orphanIds),
    })

    await expect(reconcileDiscordProRoles(d)).resolves.toEqual({
      connectedChecked: 0,
      roleHoldersChecked: 30,
      orphanRemovalsDeferred: 20,
      roleRestorationsDeferred: 0,
      added: 0,
      removed: 10,
      unchanged: 0,
      skipped: 0,
      errors: 0,
    })
    expect(d.removeRole).toHaveBeenCalledTimes(10)
    expect(d.getMemberRoleState).not.toHaveBeenCalled()
  })

  it('rotates bounded orphan batches so persistent failures cannot starve later holders', async () => {
    const orphanIds = Array.from({ length: 60 }, (_, index) => `orphan_${index + 1}`)
    const removeRole = vi.fn(async (discordUserId: string) => {
      void discordUserId
      throw new Error('missing permissions')
    })

    const firstRun = reconcileDeps({
      listRoleHolderIds: vi.fn(async () => orphanIds),
      removeRole,
      now: () => new Date('2026-06-16T00:00:00.000Z'),
    })
    await reconcileDiscordProRoles(firstRun)
    const firstBatch = removeRole.mock.calls.map(([id]) => id)

    removeRole.mockClear()
    const secondRun = reconcileDeps({
      listRoleHolderIds: vi.fn(async () => orphanIds),
      removeRole,
      now: () => new Date('2026-06-17T00:00:00.000Z'),
    })
    await reconcileDiscordProRoles(secondRun)
    const secondBatch = removeRole.mock.calls.map(([id]) => id)

    expect(firstBatch).toHaveLength(10)
    expect(secondBatch).toHaveLength(10)
    expect(secondBatch).not.toEqual(firstBatch)
    expect(new Set([...firstBatch, ...secondBatch]).size).toBeGreaterThan(10)
  })

  it('stops a cleanup batch on rate limiting and reports the failed member', async () => {
    const rateLimit = new Error('Discord role removal rate limited; retry after 30s')
    const d = reconcileDeps({
      listRoleHolderIds: vi.fn(async () => ['orphan_1', 'orphan_2', 'orphan_3']),
      removeRole: vi.fn(async () => {
        throw rateLimit
      }),
      isRateLimitError: vi.fn((error) => error === rateLimit),
    })

    await expect(reconcileDiscordProRoles(d)).resolves.toMatchObject({
      removed: 0,
      errors: 1,
      orphanRemovalsDeferred: 2,
      roleRestorationsDeferred: 0,
    })
    expect(d.removeRole).toHaveBeenCalledTimes(1)
    expect(d.reportFailure).toHaveBeenCalledWith({
      discordUserId: 'orphan_1',
      operation: 'remove_orphan_role',
      error: rateLimit,
    })
  })

  it('restores a connected member after an ambiguous delete failure', async () => {
    const networkError = new Error('response lost after request')
    const d = reconcileDeps({
      listRoleHolderIds: vi.fn(async () => ['newly_connected']),
      removeRole: vi.fn(async () => {
        throw networkError
      }),
      refreshConnectedDiscordUserIds: vi.fn(async () => ['newly_connected']),
    })

    await expect(reconcileDiscordProRoles(d)).resolves.toMatchObject({
      removed: 0,
      unchanged: 1,
      errors: 1,
    })
    expect(d.addRole).toHaveBeenCalledWith('newly_connected')
  })

  it('defers cleanup when the recovery time reserve is exhausted', async () => {
    const d = reconcileDeps({
      listRoleHolderIds: vi.fn(async () => ['orphan_1', 'orphan_2']),
      canContinueOrphanCleanup: vi.fn(() => false),
    })

    await expect(reconcileDiscordProRoles(d)).resolves.toMatchObject({
      removed: 0,
      orphanRemovalsDeferred: 2,
    })
    expect(d.removeRole).not.toHaveBeenCalled()
    expect(d.refreshConnectedDiscordUserIds).not.toHaveBeenCalled()
  })

  it('stops role restoration on rate limiting and reports unattempted restores', async () => {
    const rateLimit = new Error('rate limited')
    const d = reconcileDeps({
      listRoleHolderIds: vi.fn(async () => ['new_1', 'new_2', 'new_3']),
      refreshConnectedDiscordUserIds: vi.fn(async () => ['new_1', 'new_2', 'new_3']),
      addRole: vi.fn(async () => {
        throw rateLimit
      }),
      isRateLimitError: vi.fn((error) => error === rateLimit),
    })

    await expect(reconcileDiscordProRoles(d)).resolves.toMatchObject({
      removed: 3,
      errors: 1,
      roleRestorationsDeferred: 2,
    })
    expect(d.addRole).toHaveBeenCalledOnce()
  })
})
