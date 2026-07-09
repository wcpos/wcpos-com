import 'server-only'

import { DiscordApiClient } from './client'
import { getDiscordConfig, isDiscordDirectoryConfigured } from './config'
import { findAdminCustomerByEmail, listAdminCustomerOrders, listAdminCustomers } from './medusa-admin'
import { assembleMemberCardFromFleet } from './customer-lookup'
import {
  parseDirectoryMessage,
  syncMemberDirectory,
  upsertDirectoryCardForMember,
  type DiscordDirectoryDependencies,
  type DirectorySyncSummary,
} from './directory'
import { licenseClient } from '@/services/core/external/license-client'
import { getResolvedLicenseSnapshotFromOrders } from '@/lib/customer-licenses'
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

async function getAllResolvedLicensesForDiscordSync(): Promise<DiscordLicenseSnapshot> {
  const customers = await listAdminCustomers()
  const snapshots: DiscordLicenseSnapshot[] = []

  for (let index = 0; index < customers.length; index += ADMIN_ORDER_SCAN_CONCURRENCY) {
    const customerBatch = customers.slice(index, index + ADMIN_ORDER_SCAN_CONCURRENCY)
    snapshots.push(...(await Promise.all(
      customerBatch.map(async (customer) => {
        const orders = await listAdminCustomerOrders(customer.id)
        return getResolvedLicenseSnapshotFromOrders(orders)
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

function createDiscordDirectoryDependencies(): DiscordDirectoryDependencies {
  const config = getDiscordConfig()
  const channelId = config.directoryChannelId
  if (!channelId) {
    throw new Error('Discord member directory is not configured: DISCORD_DIRECTORY_CHANNEL_ID')
  }
  const client = new DiscordApiClient(config)

  return {
    listAllLicenses: licenseClient.listAllLicenses,
    assembleCard: (discordUserId, allLicenses) =>
      assembleMemberCardFromFleet(discordUserId, allLicenses, {
        findCustomerByEmail: findAdminCustomerByEmail,
        listCustomerOrders: listAdminCustomerOrders,
        getLicenseMachines: licenseClient.getLicenseMachines,
      }),
    listDirectoryMessages: async () =>
      (await client.listChannelMessages(channelId)).map(parseDirectoryMessage),
    createDirectoryCard: (embed) => client.createChannelMessage(channelId, { embeds: [embed] }),
    editDirectoryCard: (messageId, embed) =>
      client.editChannelMessage(channelId, messageId, { embeds: [embed] }),
    deleteDirectoryCard: (messageId) => client.deleteChannelMessage(channelId, messageId),
  }
}

/**
 * Event-path directory refresh after a claim/unlink/removal touched one
 * member. A silent no-op until DISCORD_DIRECTORY_CHANNEL_ID is configured, so
 * the feature ships dark until the locked channel exists (#522).
 */
export async function syncDiscordDirectoryForMember(discordUserId: string): Promise<void> {
  if (!isDiscordDirectoryConfigured()) return
  await upsertDirectoryCardForMember(discordUserId, createDiscordDirectoryDependencies())
}

/** Nightly full pass — rides the existing reconcile cron (#522). */
export async function reconcileDiscordDirectory(): Promise<DirectorySyncSummary | null> {
  if (!isDiscordDirectoryConfigured()) return null
  return syncMemberDirectory(createDiscordDirectoryDependencies())
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
