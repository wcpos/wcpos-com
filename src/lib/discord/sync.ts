import type { LicenseDetail } from '@/types/license'
import { evaluateDiscordProEntitlement } from './entitlement'
import { getDiscordLink } from './metadata'

export interface DiscordRoleSyncCustomer {
  id: string
  email?: string
  metadata?: Record<string, unknown> | null
}

export interface DiscordRoleSyncDependencies {
  getLicensesForCustomer(customerId: string): Promise<Array<Pick<LicenseDetail, 'status'> & { expiry?: string | null }>>
  memberHasRole(discordUserId: string): Promise<boolean>
  addRole(discordUserId: string): Promise<void>
  removeRole(discordUserId: string): Promise<void>
  listLinkedCustomers(): Promise<DiscordRoleSyncCustomer[]>
  listRoleHolderIds(): Promise<string[]>
  findCustomerByDiscordUserId(discordUserId: string): Promise<DiscordRoleSyncCustomer | null>
  now(): Date
}

export type DiscordRoleSyncAction =
  | 'added'
  | 'removed'
  | 'unchanged'
  | 'skipped_no_link'
  | 'skipped_unknown_entitlement'

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
  const entitlement = evaluateDiscordProEntitlement(licenses, dependencies.now())
  const hasRole = await dependencies.memberHasRole(link.userId)

  if (entitlement.state === 'unknown') {
    return {
      action: 'skipped_unknown_entitlement',
      customerId: customer.id,
      discordUserId: link.userId,
    }
  }

  if (entitlement.state === 'entitled' && !hasRole) {
    await dependencies.addRole(link.userId)
    return { action: 'added', customerId: customer.id, discordUserId: link.userId }
  }

  if (entitlement.state === 'not_entitled' && hasRole) {
    await dependencies.removeRole(link.userId)
    return { action: 'removed', customerId: customer.id, discordUserId: link.userId }
  }

  return { action: 'unchanged', customerId: customer.id, discordUserId: link.userId }
}

export async function reconcileDiscordProRoles(
  dependencies: DiscordRoleSyncDependencies
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

  const roleHolderIds = await dependencies.listRoleHolderIds()
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
