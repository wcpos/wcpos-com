import 'server-only'

import { DiscordApiClient } from './client'
import { getDiscordConfig } from './config'
import {
  findCustomerByDiscordUserId,
  listAdminCustomerOrders,
  listCustomersWithDiscordLinks,
} from './medusa-admin'
import { getResolvedLicensesFromOrders } from '@/lib/customer-licenses'
import type {
  DiscordReconcileDependencies,
  DiscordRoleSyncDependencies,
} from './sync'

/**
 * The single factory for the per-Discord-user role-sync seam. The Discord
 * client calls and the clock are fixed here; the only thing that varies between
 * callers is where a customer's licenses come from (live session vs admin
 * orders vs, later, licence-member links), so that is the one parameter.
 */
export function createDiscordRoleSyncDependencies(
  getLicensesForCustomer: DiscordRoleSyncDependencies['getLicensesForCustomer']
): DiscordRoleSyncDependencies {
  const client = new DiscordApiClient(getDiscordConfig())

  return {
    getLicensesForCustomer,
    getMemberRoleState: (discordUserId) => client.getMemberRoleState(discordUserId),
    addRole: (discordUserId) => client.addRole(discordUserId),
    removeRole: (discordUserId) => client.removeRole(discordUserId),
    now: () => new Date(),
  }
}

/**
 * The reconciliation sweep extends the sync seam with enumeration of the
 * population to walk. Built on the single factory above with the admin license
 * source (each customer's licenses resolved from their Medusa orders).
 */
export function createDiscordReconcileDependencies(): DiscordReconcileDependencies {
  const client = new DiscordApiClient(getDiscordConfig())

  return {
    ...createDiscordRoleSyncDependencies((customerId) =>
      listAdminCustomerOrders(customerId).then(getResolvedLicensesFromOrders)
    ),
    listLinkedCustomers: () => listCustomersWithDiscordLinks(),
    listRoleHolderIds: () => client.listRoleHolderIds(),
    findCustomerByDiscordUserId: (discordUserId) =>
      findCustomerByDiscordUserId(discordUserId),
  }
}
