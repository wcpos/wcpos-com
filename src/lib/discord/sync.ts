import { evaluateLicenseEntitlement, type LicenseLifecycle } from '@/lib/license'
import { getDiscordLink } from './metadata'

export interface DiscordRoleSyncCustomer {
  id: string
  email?: string
  metadata?: Record<string, unknown> | null
}

/**
 * What the per-Discord-user role sync needs: resolve a subject's licenses,
 * read/grant/remove the role, and a clock. This is exactly the surface
 * syncDiscordProRole touches — no enumeration — so an inline caller cannot be
 * forced to stub methods it never calls.
 */
export interface DiscordRoleSyncDependencies {
  getLicensesForCustomer(customerId: string): Promise<LicenseLifecycle[]>
  getMemberRoleState(discordUserId: string): Promise<DiscordMemberRoleState>
  addRole(discordUserId: string): Promise<void>
  removeRole(discordUserId: string): Promise<void>
  now(): Date
}

/**
 * What the reconciliation sweep additionally needs: enumerate the population to
 * walk — linked customers, current role holders, and the reverse lookup. Only
 * the scheduled sweep depends on this wider surface.
 */
export interface DiscordReconcileDependencies extends DiscordRoleSyncDependencies {
  listLinkedCustomers(): Promise<DiscordRoleSyncCustomer[]>
  listRoleHolderIds(): Promise<string[]>
  findCustomerByDiscordUserId(discordUserId: string): Promise<DiscordRoleSyncCustomer | null>
}

export type DiscordRoleSyncAction =
  | 'added'
  | 'removed'
  | 'unchanged'
  | 'skipped_no_link'
  | 'skipped_not_in_guild'
  | 'skipped_unverifiable_entitlement'

export type DiscordMemberRoleState = 'has_role' | 'missing_role' | 'not_in_guild'

export interface DiscordRoleSyncResult {
  action: DiscordRoleSyncAction
  customerId: string
  discordUserId: string | null
}

export interface DiscordReconcileSummary {
  linkedChecked: number
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

export async function syncDiscordProRole(
  customer: DiscordRoleSyncCustomer,
  dependencies: DiscordRoleSyncDependencies
): Promise<DiscordRoleSyncResult> {
  const link = getDiscordLink(customer.metadata)
  if (!link) {
    return {
      action: 'skipped_no_link',
      customerId: customer.id,
      discordUserId: null,
    }
  }

  const licenses = await dependencies.getLicensesForCustomer(customer.id)
  const entitlement = evaluateLicenseEntitlement(licenses, dependencies.now().getTime())

  if (entitlement === 'unverifiable') {
    return {
      action: 'skipped_unverifiable_entitlement',
      customerId: customer.id,
      discordUserId: link.userId,
    }
  }

  const memberRoleState = await dependencies.getMemberRoleState(link.userId)
  if (memberRoleState === 'not_in_guild') {
    return {
      action: 'skipped_not_in_guild',
      customerId: customer.id,
      discordUserId: link.userId,
    }
  }

  const hasRole = memberRoleState === 'has_role'
  if (entitlement === 'entitled' && !hasRole) {
    await dependencies.addRole(link.userId)
    return { action: 'added', customerId: customer.id, discordUserId: link.userId }
  }

  if (entitlement === 'not_entitled' && hasRole) {
    await dependencies.removeRole(link.userId)
    return { action: 'removed', customerId: customer.id, discordUserId: link.userId }
  }

  return { action: 'unchanged', customerId: customer.id, discordUserId: link.userId }
}

export async function reconcileDiscordProRoles(
  dependencies: DiscordReconcileDependencies
): Promise<DiscordReconcileSummary> {
  const summary: DiscordReconcileSummary = {
    linkedChecked: 0,
    roleHoldersChecked: 0,
    added: 0,
    removed: 0,
    unchanged: 0,
    skipped: 0,
    errors: 0,
  }

  const linkedCustomers = await dependencies.listLinkedCustomers()
  const seenDiscordIds = new Set<string>()

  for (const customer of linkedCustomers) {
    summary.linkedChecked += 1
    const link = getDiscordLink(customer.metadata)
    if (link) seenDiscordIds.add(link.userId)

    try {
      countResult(summary, await syncDiscordProRole(customer, dependencies))
    } catch {
      summary.errors += 1
    }
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
      const linkedCustomer = await dependencies.findCustomerByDiscordUserId(discordUserId)
      if (!linkedCustomer) {
        await dependencies.removeRole(discordUserId)
        summary.removed += 1
        continue
      }

      countResult(summary, await syncDiscordProRole(linkedCustomer, dependencies))
    } catch {
      summary.errors += 1
    }
  }

  return summary
}
