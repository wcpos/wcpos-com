import 'server-only'

import { DiscordApiClient } from './client'
import { getDiscordConfig } from './config'
import {
  findCustomerByDiscordUserId,
  listAdminCustomerOrders,
  listCustomersWithDiscordLinks,
} from './medusa-admin'
import { getResolvedLicensesFromOrders } from '@/lib/customer-licenses'
import type { DiscordRoleSyncDependencies } from './sync'

export function createDiscordRoleSyncDependencies(): DiscordRoleSyncDependencies {
  const client = new DiscordApiClient(getDiscordConfig())

  return {
    getLicensesForCustomer: async (customerId) =>
      getResolvedLicensesFromOrders(await listAdminCustomerOrders(customerId)),
    memberHasRole: (discordUserId) => client.memberHasRole(discordUserId),
    addRole: (discordUserId) => client.addRole(discordUserId),
    removeRole: (discordUserId) => client.removeRole(discordUserId),
    listLinkedCustomers: () => listCustomersWithDiscordLinks(),
    listRoleHolderIds: () => client.listRoleHolderIds(),
    findCustomerByDiscordUserId: (discordUserId) =>
      findCustomerByDiscordUserId(discordUserId),
    now: () => new Date(),
  }
}
