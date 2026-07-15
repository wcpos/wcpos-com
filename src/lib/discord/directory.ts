import type { LicenseDetail } from '@/types/license'
import { getConnectedDiscordAccess } from './connected-members'
import {
  buildMemberCardEmbed,
  parseDirectoryFooterMemberId,
  type DiscordCustomerInfo,
  type DiscordEmbed,
} from './interactions'

/**
 * #member-directory sync (map #514 / #522): one bot-maintained card per linked
 * member in a channel locked to owner + bot. THE CHANNEL IS THE DATABASE —
 * each card's footer carries the member's Discord id, and the sync matches
 * cards to members by reading the channel back. No stored message-id map
 * anywhere; hand-deleted cards are recreated, orphan cards are removed.
 * Escape hatch if scale ever demands a real index: #516 §3b.
 */

export interface DirectoryMessage {
  id: string
  /** Parsed from the card footer; null for any non-card message in the channel. */
  memberId: string | null
  /** Existing embed content, used to avoid PATCHing unchanged old messages. */
  embed?: DirectoryEmbedSnapshot | null
}

interface DirectoryEmbedSnapshot {
  title?: string
  description?: string
  color?: number
  fields?: Array<{ name?: string; value?: string; inline?: boolean }>
  footer?: { text?: string }
}

export interface DiscordDirectoryDependencies {
  listAllLicenses(): Promise<Array<Omit<LicenseDetail, 'machines'>>>
  assembleCard(
    discordUserId: string,
    allLicenses: Array<Omit<LicenseDetail, 'machines'>>
  ): Promise<Omit<DiscordCustomerInfo, 'roleState'>>
  listDirectoryMessages(): Promise<DirectoryMessage[]>
  /** Fresh lookup before suppressing a PATCH; absent implementations fail safe and edit. */
  getDirectoryMessage?(messageId: string): Promise<DirectoryMessage | null>
  createDirectoryCard(embed: DiscordEmbed): Promise<void>
  editDirectoryCard(messageId: string, embed: DiscordEmbed): Promise<void>
  deleteDirectoryCard(messageId: string): Promise<void>
}

export function parseDirectoryMessage(message: {
  id: string
  embeds?: DirectoryEmbedSnapshot[]
}): DirectoryMessage {
  const embed = message.embeds?.[0] ?? null
  return {
    id: message.id,
    memberId: parseDirectoryFooterMemberId(embed?.footer?.text),
    embed,
  }
}

interface LinkedMember {
  discordUserId: string
  /** Username snapshot from the claim; stale after a Discord rename, which is
   *  acceptable for the directory (the live name shows on the profile). */
  username: string | null
}

export function listLinkedMembers(
  licenses: Array<Omit<LicenseDetail, 'machines'>>
): LinkedMember[] {
  const members = new Map<string, LinkedMember>()
  for (const license of licenses) {
    for (const member of getConnectedDiscordAccess(license.metadata).members) {
      const existing = members.get(member.discordUserId)
      if (!existing || (!existing.username && member.username)) {
        members.set(member.discordUserId, {
          discordUserId: member.discordUserId,
          username: member.username,
        })
      }
    }
  }
  return [...members.values()]
}

async function buildCard(
  member: LinkedMember,
  licenses: Array<Omit<LicenseDetail, 'machines'>>,
  dependencies: DiscordDirectoryDependencies
): Promise<DiscordEmbed> {
  const card = await dependencies.assembleCard(member.discordUserId, licenses)
  return buildMemberCardEmbed(
    card,
    { id: member.discordUserId, username: member.username },
    { directoryFooter: true }
  )
}

function directoryCardMatches(
  existing: DirectoryEmbedSnapshot | null | undefined,
  expected: DiscordEmbed
): boolean {
  if (
    !existing ||
    existing.title !== expected.title ||
    existing.description !== expected.description ||
    existing.color !== expected.color ||
    existing.footer?.text !== expected.footer?.text
  ) {
    return false
  }

  const existingFields = existing.fields ?? []
  if (existingFields.length !== expected.fields.length) return false
  return existingFields.every((field, index) => {
    const expectedField = expected.fields[index]
    return (
      field.name === expectedField.name &&
      field.value === expectedField.value &&
      (field.inline ?? false) === (expectedField.inline ?? false)
    )
  })
}

export interface DirectorySyncSummary {
  members: number
  created: number
  updated: number
  deleted: number
}

/**
 * Full pass: upsert a card per linked member, delete cards for members no
 * longer linked. Non-card messages (no member footer) are left untouched so a
 * pinned channel intro survives. Sequential on purpose — the writes share one
 * per-channel rate-limit bucket and the fleet is small.
 */
export async function syncMemberDirectory(
  dependencies: DiscordDirectoryDependencies
): Promise<DirectorySyncSummary> {
  const [licenses, messages] = await Promise.all([
    dependencies.listAllLicenses(),
    dependencies.listDirectoryMessages(),
  ])
  const members = listLinkedMembers(licenses)
  const memberIds = new Set(members.map((member) => member.discordUserId))

  const summary: DirectorySyncSummary = {
    members: members.length,
    created: 0,
    updated: 0,
    deleted: 0,
  }

  // First card per member wins; later duplicates (an event upsert racing a
  // sync can create one) are deleted here, so the nightly pass self-heals.
  const messageByMemberId = new Map<string, DirectoryMessage>()
  for (const message of messages) {
    if (!message.memberId) continue
    if (messageByMemberId.has(message.memberId)) {
      await dependencies.deleteDirectoryCard(message.id)
      summary.deleted += 1
      continue
    }
    messageByMemberId.set(message.memberId, message)
  }

  for (const member of members) {
    const embed = await buildCard(member, licenses, dependencies)
    const existing = messageByMemberId.get(member.discordUserId)
    if (existing) {
      const current = directoryCardMatches(existing.embed, embed)
        ? await dependencies.getDirectoryMessage?.(existing.id)
        : existing
      if (!directoryCardMatches(current?.embed, embed)) {
        await dependencies.editDirectoryCard(existing.id, embed)
        summary.updated += 1
      }
    } else {
      await dependencies.createDirectoryCard(embed)
      summary.created += 1
    }
  }

  for (const [memberId, message] of messageByMemberId) {
    if (!memberIds.has(memberId)) {
      await dependencies.deleteDirectoryCard(message.id)
      summary.deleted += 1
    }
  }

  return summary
}

/**
 * Event-path upsert after a claim/unlink/removal touches one member: refresh
 * (or create) their card, or delete it when no licence links them any more.
 */
export async function upsertDirectoryCardForMember(
  discordUserId: string,
  dependencies: DiscordDirectoryDependencies
): Promise<void> {
  const [licenses, messages] = await Promise.all([
    dependencies.listAllLicenses(),
    dependencies.listDirectoryMessages(),
  ])
  // A concurrent upsert racing this one (or a past race) can leave several
  // cards for the same member — treat the first as canonical and delete the
  // rest, so duplicates heal on the next event, not only overnight.
  const [existing, ...duplicates] = messages
    .filter((message) => message.memberId === discordUserId)
  for (const duplicate of duplicates) {
    await dependencies.deleteDirectoryCard(duplicate.id)
  }
  const member = listLinkedMembers(licenses).find(
    (candidate) => candidate.discordUserId === discordUserId
  )

  if (!member) {
    if (existing) await dependencies.deleteDirectoryCard(existing.id)
    return
  }

  const embed = await buildCard(member, licenses, dependencies)
  if (existing) {
    if (!directoryCardMatches(existing.embed, embed)) {
      await dependencies.editDirectoryCard(existing.id, embed)
    }
  } else {
    await dependencies.createDirectoryCard(embed)
  }
}
