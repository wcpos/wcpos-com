import { evaluateLicenseEntitlement, type LicenseLifecycle } from '@/lib/license'

export interface DiscordRoleSyncDependencies {
  getLicensesForDiscordUser(discordUserId: string): Promise<LicenseLifecycle[]>
  getMemberRoleState(discordUserId: string): Promise<DiscordMemberRoleState>
  addRole(discordUserId: string): Promise<void>
  removeRole(discordUserId: string): Promise<void>
  now(): Date
}

export interface DiscordReconcileDependencies extends DiscordRoleSyncDependencies {
  listConnectedDiscordUserIds(): Promise<string[]>
  refreshConnectedDiscordUserIds(): Promise<string[]>
  canRemoveOrphanRoleHolders(): Promise<boolean>
  listRoleHolderIds(): Promise<string[]>
  canContinueOrphanCleanup(): boolean
  isRateLimitError(error: unknown): boolean
  reportFailure(failure: DiscordReconcileFailure): void
}

export interface DiscordReconcileFailure {
  discordUserId: string | null
  operation:
    | 'sync_connected_member'
    | 'validate_snapshot'
    | 'list_role_holders'
    | 'refresh_snapshot'
    | 'remove_orphan_role'
    | 'restore_role'
  error: unknown
}

export type DiscordRoleSyncAction =
  | 'added'
  | 'removed'
  | 'unchanged'
  | 'skipped_not_in_guild'
  | 'skipped_unverifiable_entitlement'

export type DiscordMemberRoleState = 'has_role' | 'missing_role' | 'not_in_guild'

export interface DiscordRoleSyncResult {
  action: DiscordRoleSyncAction
  discordUserId: string
}

export interface DiscordReconcileSummary {
  connectedChecked: number
  roleHoldersChecked: number
  orphanRemovalsDeferred: number
  roleRestorationsDeferred: number
  added: number
  removed: number
  unchanged: number
  skipped: number
  errors: number
}

const MAX_ORPHAN_REMOVALS_PER_RUN = 10
const DAY_MS = 24 * 60 * 60 * 1_000

function rotatingBatch<T>(items: T[], size: number, now: Date): T[] {
  if (items.length <= size) return items
  const batchCount = Math.ceil(items.length / size)
  const day = Math.floor(now.getTime() / DAY_MS)
  const start = (day % batchCount) * size
  return [...items.slice(start, start + size), ...items.slice(0, Math.max(0, start + size - items.length))]
}

function reportFailure(
  dependencies: DiscordReconcileDependencies,
  failure: DiscordReconcileFailure
): void {
  try {
    dependencies.reportFailure(failure)
  } catch {
    // Diagnostics must never change reconciliation control flow.
  }
}

function countResult(summary: DiscordReconcileSummary, result: DiscordRoleSyncResult) {
  if (result.action === 'added') summary.added += 1
  else if (result.action === 'removed') summary.removed += 1
  else if (result.action === 'unchanged') summary.unchanged += 1
  else summary.skipped += 1
}

export async function syncDiscordProRoleForMember(
  discordUserId: string,
  dependencies: DiscordRoleSyncDependencies
): Promise<DiscordRoleSyncResult> {
  const licenses = await dependencies.getLicensesForDiscordUser(discordUserId)
  const entitlement = evaluateLicenseEntitlement(licenses, dependencies.now().getTime())

  if (entitlement === 'unverifiable') {
    return { action: 'skipped_unverifiable_entitlement', discordUserId }
  }

  const memberRoleState = await dependencies.getMemberRoleState(discordUserId)
  if (memberRoleState === 'not_in_guild') {
    return { action: 'skipped_not_in_guild', discordUserId }
  }

  const hasRole = memberRoleState === 'has_role'
  if (entitlement === 'entitled' && !hasRole) {
    await dependencies.addRole(discordUserId)
    return { action: 'added', discordUserId }
  }

  if (entitlement === 'not_entitled' && hasRole) {
    await dependencies.removeRole(discordUserId)
    return { action: 'removed', discordUserId }
  }

  return { action: 'unchanged', discordUserId }
}

export async function reconcileDiscordProRoles(
  dependencies: DiscordReconcileDependencies
): Promise<DiscordReconcileSummary> {
  const summary: DiscordReconcileSummary = {
    connectedChecked: 0,
    roleHoldersChecked: 0,
    orphanRemovalsDeferred: 0,
    roleRestorationsDeferred: 0,
    added: 0,
    removed: 0,
    unchanged: 0,
    skipped: 0,
    errors: 0,
  }

  const connectedDiscordUserIds = await dependencies.listConnectedDiscordUserIds()
  const seenDiscordIds = new Set<string>()

  for (const discordUserId of connectedDiscordUserIds) {
    summary.connectedChecked += 1
    seenDiscordIds.add(discordUserId)
    try {
      countResult(summary, await syncDiscordProRoleForMember(discordUserId, dependencies))
    } catch (error) {
      summary.errors += 1
      reportFailure(dependencies, {
        discordUserId,
        operation: 'sync_connected_member',
        error,
      })
      if (dependencies.isRateLimitError(error)) return summary
    }
  }

  try {
    if (!(await dependencies.canRemoveOrphanRoleHolders())) {
      summary.errors += 1
      reportFailure(dependencies, {
        discordUserId: null,
        operation: 'validate_snapshot',
        error: new Error('Connected-member snapshot is incomplete'),
      })
      return summary
    }
  } catch (error) {
    summary.errors += 1
    reportFailure(dependencies, {
      discordUserId: null,
      operation: 'validate_snapshot',
      error,
    })
    return summary
  }

  let roleHolderIds: string[]
  try {
    roleHolderIds = await dependencies.listRoleHolderIds()
  } catch (error) {
    summary.errors += 1
    reportFailure(dependencies, {
      discordUserId: null,
      operation: 'list_role_holders',
      error,
    })
    return summary
  }

  summary.roleHoldersChecked = roleHolderIds.length
  const orphanIds = roleHolderIds.filter((discordUserId) => !seenDiscordIds.has(discordUserId))
  summary.orphanRemovalsDeferred = Math.max(
    0,
    orphanIds.length - MAX_ORPHAN_REMOVALS_PER_RUN
  )

  const removalBatch = rotatingBatch(
    orphanIds,
    MAX_ORPHAN_REMOVALS_PER_RUN,
    dependencies.now()
  )
  const attemptedOrphanIds: string[] = []
  const removedOrphanIds = new Set<string>()

  for (const [index, discordUserId] of removalBatch.entries()) {
    if (!dependencies.canContinueOrphanCleanup()) {
      summary.orphanRemovalsDeferred += removalBatch.length - index
      break
    }
    attemptedOrphanIds.push(discordUserId)
    try {
      // listRoleHolderIds already proves this member is in the guild and has
      // the role. The complete connected-member snapshot proves there is no
      // backing licence, so avoid a redundant per-holder member lookup.
      await dependencies.removeRole(discordUserId)
      summary.removed += 1
      removedOrphanIds.add(discordUserId)
    } catch (error) {
      summary.errors += 1
      reportFailure(dependencies, {
        discordUserId,
        operation: 'remove_orphan_role',
        error,
      })
      if (dependencies.isRateLimitError(error)) {
        summary.orphanRemovalsDeferred += removalBatch.length - index - 1
        break
      }
    }
  }

  if (attemptedOrphanIds.length === 0) return summary

  let idsToRestore: string[]
  let rollbackOrphanRemovals = false
  try {
    const connectedIds = new Set(await dependencies.refreshConnectedDiscordUserIds())
    idsToRestore = attemptedOrphanIds.filter((discordUserId) => connectedIds.has(discordUserId))
  } catch (error) {
    // If the post-delete authority check fails, fail safe by rolling back every
    // removal. This also closes the race with a member linking during the run.
    summary.errors += 1
    rollbackOrphanRemovals = true
    reportFailure(dependencies, {
      discordUserId: null,
      operation: 'refresh_snapshot',
      error,
    })
    idsToRestore = attemptedOrphanIds
  }

  for (const [index, discordUserId] of idsToRestore.entries()) {
    try {
      await dependencies.addRole(discordUserId)
      if (removedOrphanIds.has(discordUserId)) summary.removed -= 1
      summary.unchanged += 1
      if (rollbackOrphanRemovals) summary.orphanRemovalsDeferred += 1
    } catch (error) {
      summary.errors += 1
      reportFailure(dependencies, { discordUserId, operation: 'restore_role', error })
      if (dependencies.isRateLimitError(error)) {
        summary.roleRestorationsDeferred += idsToRestore.length - index - 1
        break
      }
    }
  }

  return summary
}
