import 'server-only'

import { DiscordApiClient } from './client'
import { getDiscordConfig } from './config'
import { listAdminCustomerOrders, listAdminCustomers } from './medusa-admin'
import { getResolvedLicensesFromOrders } from '@/lib/customer-licenses'
import { extractLicenseReferencesFromOrders } from '@/lib/licenses'
import {
  getConnectedDiscordUserIds,
  getLicensesForDiscordUser as getLicenseLifecyclesForDiscordUser,
} from './connected-member-service'
import type { LicenseLifecycle } from '@/lib/license'
import type {
  DiscordReconcileDependencies,
  DiscordRoleSyncDependencies,
} from './sync'
import type { LicenseDetail } from '@/types/license'

const ADMIN_ORDER_SCAN_CONCURRENCY = 5

interface DiscordLicenseSnapshot {
  licenses: LicenseDetail[]
  complete: boolean
}

function referenceKey(reference: { id?: string; key?: string }): string {
  return reference.id ? `id:${reference.id}` : `key:${reference.key}`
}

async function getAllResolvedLicensesForDiscordSync(): Promise<DiscordLicenseSnapshot> {
  const customers = await listAdminCustomers()
  const snapshots: DiscordLicenseSnapshot[] = []

  for (let index = 0; index < customers.length; index += ADMIN_ORDER_SCAN_CONCURRENCY) {
    const customerBatch = customers.slice(index, index + ADMIN_ORDER_SCAN_CONCURRENCY)
    snapshots.push(...(await Promise.all(
      customerBatch.map(async (customer) => {
        const orders = await listAdminCustomerOrders(customer.id)
        const expectedReferenceCount = new Set(
          extractLicenseReferencesFromOrders(orders).map(referenceKey)
        ).size
        const licenses = await getResolvedLicensesFromOrders(orders)
        return {
          licenses,
          complete: licenses.length >= expectedReferenceCount &&
            licenses.every((license) => license.status !== 'unknown'),
        }
      })
    )))
  }

  return {
    licenses: snapshots.flatMap((snapshot) => snapshot.licenses),
    complete: snapshots.every((snapshot) => snapshot.complete),
  }
}

function createResolvedLicenseSnapshot(): () => Promise<DiscordLicenseSnapshot> {
  let snapshot: Promise<DiscordLicenseSnapshot> | null = null
  return () => {
    snapshot ??= getAllResolvedLicensesForDiscordSync()
    return snapshot
  }
}

function getLicensesForDiscordUserFromSnapshot(
  discordUserId: string,
  snapshot: DiscordLicenseSnapshot
) {
  const licenses = getLicenseLifecyclesForDiscordUser(discordUserId, snapshot.licenses)
  return snapshot.complete
    ? licenses
    : [...licenses, { status: 'unknown' as const, expiry: null }]
}

export function createDiscordRoleSyncDependencies(
  getLicensesForDiscordUser: (discordUserId: string) => Promise<LicenseLifecycle[]>
): DiscordRoleSyncDependencies {
  const client = new DiscordApiClient(getDiscordConfig())

  return {
    getLicensesForDiscordUser,
    getMemberRoleState: (discordUserId) => client.getMemberRoleState(discordUserId),
    addRole: (discordUserId) => client.addRole(discordUserId),
    removeRole: (discordUserId) => client.removeRole(discordUserId),
    now: () => new Date(),
  }
}

export function createDiscordReconcileDependencies(): DiscordReconcileDependencies {
  const client = new DiscordApiClient(getDiscordConfig())
  const getResolvedLicenses = createResolvedLicenseSnapshot()

  return {
    getLicensesForDiscordUser: async (discordUserId) =>
      getLicensesForDiscordUserFromSnapshot(
        discordUserId,
        await getResolvedLicenses()
      ),
    getMemberRoleState: (discordUserId) => client.getMemberRoleState(discordUserId),
    addRole: (discordUserId) => client.addRole(discordUserId),
    removeRole: (discordUserId) => client.removeRole(discordUserId),
    now: () => new Date(),
    listConnectedDiscordUserIds: async () =>
      getConnectedDiscordUserIds((await getResolvedLicenses()).licenses),
    canRemoveOrphanRoleHolders: async () =>
      (await getResolvedLicenses()).complete,
    listRoleHolderIds: () => client.listRoleHolderIds(),
  }
}
