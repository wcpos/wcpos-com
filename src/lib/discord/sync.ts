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
  canRemoveOrphanRoleHolders(): Promise<boolean>
  listRoleHolderIds(): Promise<string[]>
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
  added: number
  removed: number
  unchanged: number
  skipped: number
  errors: number
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
    } catch {
      summary.errors += 1
    }
  }

  try {
    if (!(await dependencies.canRemoveOrphanRoleHolders())) {
      summary.errors += 1
      return summary
    }
  } catch {
    summary.errors += 1
    return summary
  }

  let roleHolderIds: string[]
  try {
    roleHolderIds = await dependencies.listRoleHolderIds()
  } catch {
    summary.errors += 1
    return summary
  }

  for (const discordUserId of roleHolderIds) {
    summary.roleHoldersChecked += 1
    if (seenDiscordIds.has(discordUserId)) continue

    try {
      countResult(summary, await syncDiscordProRoleForMember(discordUserId, dependencies))
    } catch {
      summary.errors += 1
    }
  }

  return summary
}
