import 'server-only'

import type { LicenseDetail, LicenseMachine } from '@/types/license'
import type { MedusaOrder } from '@/lib/customer-orders'
import type { MedusaCustomer } from '@/lib/medusa-auth'
import { getPlanByPolicyId } from '@/lib/plans'
import { getConnectedDiscordAccess } from './connected-members'
import type { DiscordCustomerInfo, DiscordCustomerLicenceInfo, DiscordLicenceSite } from './interactions'

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
  /** Activated machines for one licence — the website/last-seen facts. */
  getLicenseMachines(licenseId: string): Promise<LicenseMachine[]>
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

function metadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Same site identity the account UI shows (licenses-client): domain first,
 * then siteUrl, then the machine's display name. Domain-only is the store
 * identity by owner ruling (#527) — no blogname, no member-supplied field.
 */
export function mapMachineToSite(machine: LicenseMachine): DiscordLicenceSite {
  const domain = metadataString(machine.metadata, 'domain')
  const siteUrl =
    metadataString(machine.metadata, 'siteUrl') ??
    metadataString(machine.metadata, 'homeUrl')
  const label = domain ?? siteUrl ?? machine.name ?? machine.fingerprint
  const url = siteUrl ?? (domain ? `https://${domain}` : null)
  return {
    label,
    url,
    lastSeenAt: metadataString(machine.metadata, 'lastSeenAt'),
    pluginVersion: metadataString(machine.metadata, 'pluginVersion'),
  }
}

function customerDisplayName(customer: MedusaCustomer | null): string | null {
  if (!customer) return null
  const name = [customer.first_name, customer.last_name]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ')
  return name.length > 0 ? name : null
}

/**
 * The member-card assembly (map #514 / #522): licences a Discord user is a
 * connected member of, enriched per licence with the plan (from policyId via
 * the plan registry — NEVER inferred from a null expiry, which mislabels
 * migrated expired-yearly licences, #526), the activated sites, and the
 * holder's name. Runs against a fleet the caller already fetched so the
 * directory sync can share one fleet scan across all members.
 */
export async function assembleMemberCardFromFleet(
  discordUserId: string,
  allLicenses: Array<Omit<LicenseDetail, 'machines'>>,
  dependencies: Omit<DiscordCustomerLookupDependencies, 'listAllLicenses' | 'getMemberRoleState'>
): Promise<Omit<DiscordCustomerInfo, 'roleState'>> {
  const matched: Array<{
    license: Omit<LicenseDetail, 'machines'>
    connectedAt: string | null
  }> = []
  const holderEmails = new Set<string>()

  for (const license of allLicenses) {
    const access = getConnectedDiscordAccess(license.metadata)
    const member = access.members.find((candidate) => candidate.discordUserId === discordUserId)
    if (!member) continue
    const email = holderEmail(license)
    if (email) holderEmails.add(email)
    matched.push({ license, connectedAt: member.connectedAt })
  }

  // Best-effort enrichment: a Medusa or Keygen hiccup should not sink the
  // lookup — the licence facts are already useful on their own.
  const holderProfiles = new Map<string, { name: string | null; orderDates: Array<string | null> }>()
  await Promise.all(
    Array.from(holderEmails).map(async (email) => {
      try {
        const customer = await dependencies.findCustomerByEmail(email)
        if (!customer) return
        const orders = await dependencies.listCustomerOrders(customer.id)
        holderProfiles.set(email, {
          name: customerDisplayName(customer),
          orderDates: orders.map((order) => order.created_at ?? null),
        })
      } catch {
        // swallow — enrichment only
      }
    })
  )

  const licences: DiscordCustomerLicenceInfo[] = await Promise.all(
    matched.map(async ({ license, connectedAt }) => {
      const access = getConnectedDiscordAccess(license.metadata)
      const email = holderEmail(license)
      let sites: DiscordLicenceSite[] = []
      try {
        sites = (await dependencies.getLicenseMachines(license.id)).map(mapMachineToSite)
      } catch {
        // swallow — the card renders without site facts
      }
      return {
        keySuffix: license.key.slice(-4),
        status: license.status,
        expiry: license.expiry,
        planId: getPlanByPolicyId(license.policyId)?.id ?? null,
        holderEmail: email,
        holderName: (email ? holderProfiles.get(email)?.name : null) ?? null,
        usedSeats: access.members.length,
        seatCap: access.seatCap,
        connectedAt,
        sites,
      }
    })
  )

  const orderDates = Array.from(holderProfiles.values()).flatMap((profile) => profile.orderDates)
  return {
    licences,
    customerSince:
      earliestDate(orderDates) ??
      earliestDate(matched.map(({ license }) => license.createdAt ?? null)),
  }
}

/**
 * The support-facing view behind the "Customer info" context command
 * (ADR-0014): the member card plus the live Pro-role state. Customer-since is
 * derived from order history (not customer created_at) — migrated orders keep
 * their original dates while migrated customer records carry the migration
 * date. Falls back to licence creation when no order resolves. NOTE: these
 * dates and the holder identity belong to the licence HOLDER; a seat-holder's
 * own history is not knowable without a member↔customer link (#516).
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

  const card = await assembleMemberCardFromFleet(discordUserId, allLicenses, dependencies)
  return { ...card, roleState }
}
