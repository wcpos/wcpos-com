import 'server-only'

import type { LicenseDetail } from '@/types/license'
import type { MedusaOrder } from '@/lib/customer-orders'
import type { MedusaCustomer } from '@/lib/medusa-auth'
import { getConnectedDiscordAccess } from './connected-members'
import type { DiscordCustomerInfo, DiscordCustomerLicenceInfo } from './interactions'

export interface DiscordCustomerLookupDependencies {
  /**
   * The full licence fleet straight from Keygen. Deliberately NOT the
   * reconcile-style admin-customers→orders walk: that scan takes minutes at
   * fleet scale and can never answer an interactive command; paging Keygen's
   * licence list is ~25 requests.
   */
  listAllLicenses(): Promise<Array<Omit<LicenseDetail, 'machines'>>>
  findCustomerByEmail(email: string): Promise<MedusaCustomer | null>
  listCustomerOrders(customerId: string): Promise<MedusaOrder[]>
  getMemberRoleState(
    discordUserId: string
  ): Promise<'has_role' | 'missing_role' | 'not_in_guild'>
}

function holderEmail(license: Omit<LicenseDetail, 'machines'>): string | null {
  const email = license.metadata?.email
  return typeof email === 'string' && email.length > 0 ? email : null
}

function earliestDate(values: Array<string | null | undefined>): string | null {
  const times = values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => ({ value, time: new Date(value).getTime() }))
    .filter((entry) => !Number.isNaN(entry.time))
  if (times.length === 0) return null
  return times.reduce((a, b) => (a.time <= b.time ? a : b)).value
}

/**
 * The support-facing view behind the "Customer info" context command
 * (ADR-0014): the licences a Discord user is a connected member of, plus
 * customer-since derived from order history. Order history (not customer
 * created_at) is the honest signal — migrated orders keep their original
 * dates while migrated customer records carry the migration date. Falls back
 * to licence creation when no order resolves.
 */
export async function lookupDiscordCustomerInfo(
  discordUserId: string,
  dependencies: DiscordCustomerLookupDependencies
): Promise<DiscordCustomerInfo> {
  const [allLicenses, roleState] = await Promise.all([
    dependencies.listAllLicenses(),
    dependencies
      .getMemberRoleState(discordUserId)
      .catch(() => 'unknown' as const),
  ])

  const licences: DiscordCustomerLicenceInfo[] = []
  const holderEmails = new Set<string>()
  const licenceCreationDates: Array<string | null> = []

  for (const license of allLicenses) {
    const access = getConnectedDiscordAccess(license.metadata)
    const member = access.members.find((candidate) => candidate.discordUserId === discordUserId)
    if (!member) continue

    const email = holderEmail(license)
    if (email) holderEmails.add(email)
    licenceCreationDates.push(license.createdAt ?? null)
    licences.push({
      keySuffix: license.key.slice(-4),
      status: license.status,
      expiry: license.expiry,
      holderEmail: email,
      usedSeats: access.members.length,
      seatCap: access.seatCap,
      connectedAt: member.connectedAt,
    })
  }

  const orderDateGroups = await Promise.all(
    Array.from(holderEmails).map(async (email) => {
      try {
        const customer = await dependencies.findCustomerByEmail(email)
        if (!customer) return []
        const orders = await dependencies.listCustomerOrders(customer.id)
        return orders.map((order) => order.created_at ?? null)
      } catch {
        // Best-effort enrichment: a Medusa hiccup should not sink the lookup —
        // the licence facts above are already useful on their own.
        return []
      }
    })
  )
  const orderDates = orderDateGroups.flat()

  return {
    licences,
    customerSince: earliestDate(orderDates) ?? earliestDate(licenceCreationDates),
    roleState,
  }
}
