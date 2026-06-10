import 'server-only'

import type { MedusaCustomer } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { DiscordApiClient } from './client'
import { getDiscordConfig, isDiscordConfigured } from './config'
import type { DiscordRoleSyncDependencies, DiscordRoleSyncResult } from './sync'
import { syncDiscordProRole } from './sync'
import { getDiscordLink } from './metadata'

function createCurrentCustomerDependencies(customer: MedusaCustomer): DiscordRoleSyncDependencies {
  const client = new DiscordApiClient(getDiscordConfig())

  return {
    getLicensesForCustomer: async (customerId) =>
      customerId === customer.id
        ? (await getResolvedCustomerLicenses(customer)).licenses
        : [],
    getMemberRoleState: (discordUserId) => client.getMemberRoleState(discordUserId),
    addRole: (discordUserId) => client.addRole(discordUserId),
    removeRole: (discordUserId) => client.removeRole(discordUserId),
    listLinkedCustomers: async () => [],
    listRoleHolderIds: async () => [],
    findCustomerByDiscordUserId: async () => null,
    now: () => new Date(),
  }
}

export async function syncCurrentCustomerDiscordRole(
  customer: MedusaCustomer
): Promise<DiscordRoleSyncResult | null> {
  if (!isDiscordConfigured()) return null
  return syncDiscordProRole(customer, createCurrentCustomerDependencies(customer))
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
