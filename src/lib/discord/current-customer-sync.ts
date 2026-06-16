import 'server-only'

import type { MedusaCustomer } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { DiscordApiClient } from './client'
import { getDiscordConfig, isDiscordConfigured } from './config'
import { createDiscordRoleSyncDependencies } from './default-sync'
import type { DiscordRoleSyncResult } from './sync'
import { syncDiscordProRole } from './sync'
import { getDiscordLink } from './metadata'

export async function syncCurrentCustomerDiscordRole(
  customer: MedusaCustomer
): Promise<DiscordRoleSyncResult | null> {
  if (!isDiscordConfigured()) return null
  // Inline scope: the licenses are the current customer's own. The reconcile-
  // only enumeration methods are absent from the sync seam, so there is nothing
  // to stub.
  const dependencies = createDiscordRoleSyncDependencies(
    async () => (await getResolvedCustomerLicenses(customer)).licenses
  )
  return syncDiscordProRole(customer, dependencies)
}

export async function removeCurrentCustomerDiscordRole(
  customer: MedusaCustomer
): Promise<void> {
  if (!isDiscordConfigured()) return
  const link = getDiscordLink(customer.metadata)
  if (!link) return
  const client = new DiscordApiClient(getDiscordConfig())
  await client.removeRole(link.userId)
}
