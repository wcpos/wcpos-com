import 'server-only'

import { DiscordApiClient, DiscordRateLimitError } from './client'
import { getDiscordConfig, isDiscordDirectoryConfigured } from './config'
import { findAdminCustomerByEmail, listAdminCustomerOrders } from './medusa-admin'
import { assembleMemberCardFromFleet } from './customer-lookup'
import {
  parseDirectoryMessage,
  syncMemberDirectory,
  upsertDirectoryCardForMember,
  type DiscordDirectoryDependencies,
  type DirectorySyncSummary,
} from './directory'
import { licenseClient } from '@/services/core/external/license-client'
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
import { infraLogger } from '@/lib/logger'

type DiscordLicenseFleet = Array<Omit<LicenseDetail, 'machines'>>
const INITIAL_FLEET_TIMEOUT_MS = 90_000
const REFRESH_FLEET_TIMEOUT_MS = 60_000
const ORPHAN_CLEANUP_CUTOFF_MS = 100_000

export interface DiscordLicenseFleetSnapshot {
  get(): Promise<DiscordLicenseFleet>
  refresh(): Promise<DiscordLicenseFleet>
}

export function createDiscordLicenseFleetSnapshot(): DiscordLicenseFleetSnapshot {
  let snapshot: Promise<DiscordLicenseFleet> | null = null
  const load = (timeoutMs: number) =>
    licenseClient.listAllLicenses({ signal: AbortSignal.timeout(timeoutMs) })
  return {
    get: () => {
      snapshot ??= load(INITIAL_FLEET_TIMEOUT_MS)
      return snapshot
    },
    refresh: () => {
      snapshot = load(REFRESH_FLEET_TIMEOUT_MS)
      return snapshot
    },
  }
}

function getLicensesForDiscordUserFromSnapshot(
  discordUserId: string,
  licenses: DiscordLicenseFleet
) {
  return getLicenseLifecyclesForDiscordUser(discordUserId, licenses)
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

function createDiscordDirectoryDependencies(
  listAllLicenses: () => Promise<DiscordLicenseFleet> = licenseClient.listAllLicenses
): DiscordDirectoryDependencies {
  const config = getDiscordConfig()
  const channelId = config.directoryChannelId
  if (!channelId) {
    throw new Error('Discord member directory is not configured: DISCORD_DIRECTORY_CHANNEL_ID')
  }
  const client = new DiscordApiClient(config)

  return {
    listAllLicenses,
    assembleCard: (discordUserId, allLicenses) =>
      assembleMemberCardFromFleet(discordUserId, allLicenses, {
        findCustomerByEmail: findAdminCustomerByEmail,
        listCustomerOrders: listAdminCustomerOrders,
        getLicenseMachines: licenseClient.getLicenseMachines,
      }),
    listDirectoryMessages: async () =>
      (await client.listChannelMessages(channelId)).map(parseDirectoryMessage),
    getDirectoryMessage: async (messageId) => {
      const message = await client.getChannelMessage(channelId, messageId)
      return message ? parseDirectoryMessage(message) : null
    },
    createDirectoryCard: (embed) =>
      client.createChannelMessage(channelId, { embeds: [embed], allowed_mentions: { parse: [] } }),
    editDirectoryCard: (messageId, embed) =>
      client.editChannelMessage(channelId, messageId, { embeds: [embed], allowed_mentions: { parse: [] } }),
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
export async function reconcileDiscordDirectory(
  listAllLicenses?: () => Promise<DiscordLicenseFleet>
): Promise<DirectorySyncSummary | null> {
  if (!isDiscordDirectoryConfigured()) return null
  return syncMemberDirectory(createDiscordDirectoryDependencies(listAllLicenses))
}

export function createDiscordReconcileDependencies(
  fleet: DiscordLicenseFleetSnapshot = createDiscordLicenseFleetSnapshot()
): DiscordReconcileDependencies {
  const client = new DiscordApiClient(getDiscordConfig())
  const orphanCleanupCutoff = Date.now() + ORPHAN_CLEANUP_CUTOFF_MS

  return {
    getLicensesForDiscordUser: async (discordUserId) =>
      getLicensesForDiscordUserFromSnapshot(
        discordUserId,
        await fleet.get()
      ),
    getMemberRoleState: (discordUserId) => client.getMemberRoleState(discordUserId),
    addRole: (discordUserId) => client.addRole(discordUserId),
    removeRole: (discordUserId) => client.removeRole(discordUserId),
    now: () => new Date(),
    listConnectedDiscordUserIds: async () =>
      getConnectedDiscordUserIds(await fleet.get()),
    refreshConnectedDiscordUserIds: async () =>
      getConnectedDiscordUserIds(await fleet.refresh()),
    canRemoveOrphanRoleHolders: async () => {
      await fleet.get()
      return true
    },
    listRoleHolderIds: () => client.listRoleHolderIds(),
    canContinueOrphanCleanup: () => Date.now() < orphanCleanupCutoff,
    isRateLimitError: (error) => error instanceof DiscordRateLimitError,
    reportFailure: ({ discordUserId, operation, error }) => {
      infraLogger.error`Discord reconciliation ${operation} failed for ${discordUserId ?? 'reconciliation phase'}: ${error}`
    },
  }
}
