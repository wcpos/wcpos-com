import type { LicenseDetail } from '@/types/license'
import { getConnectedDiscordAccess } from './connected-members'
import type { DiscordCardEnrichmentFailure } from './customer-lookup'
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
 * Changed cards are edited in place; a card is created only for a member with
 * no card. Escape hatch if scale ever demands a real index: #516 §3b.
 */

export interface DirectoryMessage {
  id: string
  /** Parsed from the card footer; null for any non-card message in the channel. */
  memberId: string | null
  /** Existing embed content, used to avoid editing unchanged cards. */
  embed?: DirectoryEmbedSnapshot | null
}

export interface DirectoryEmbedSnapshot {
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
  ): Promise<
    Omit<DiscordCustomerInfo, 'roleState'> & { enrichmentFailures?: DiscordCardEnrichmentFailure[] }
  >
  listDirectoryMessages(): Promise<DirectoryMessage[]>
  /** Fresh lookup before skipping an edit; absent implementations edit. */
  getDirectoryMessage?(messageId: string): Promise<DirectoryMessage | null>
  createDirectoryCard(embed: DiscordEmbed): Promise<void>
  editDirectoryCard(messageId: string, embed: DiscordEmbed): Promise<void>
  deleteDirectoryCard(messageId: string): Promise<void>
  reportFailure?(context: {
    discordUserId?: string
    messageId?: string
    operation: 'build' | 'create' | 'edit' | 'delete' | 'enrich'
    source?: 'medusa' | 'keygen'
    error: unknown
  }): void
  reportChange?(context: {
    discordUserId: string
    messageId?: string
    operation: 'create' | 'edit' | 'delete'
    fields: string[]
  }): void
}

type DirectoryChange = Parameters<NonNullable<DiscordDirectoryDependencies['reportChange']>>[0]

/** A broken reporter must not abort the pass (or event) it exists to observe. */
function callSafely(report: () => void): void {
  try {
    report()
  } catch {
    // swallow — observability only
  }
}

function reportChange(dependencies: DiscordDirectoryDependencies, change: DirectoryChange): void {
  callSafely(() => dependencies.reportChange?.(change))
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
): Promise<{ embed: DiscordEmbed; enrichmentFailures: DiscordCardEnrichmentFailure[] }> {
  const card = await dependencies.assembleCard(member.discordUserId, licenses)
  const embed = buildMemberCardEmbed(
    card,
    { id: member.discordUserId, username: member.username },
    { directoryFooter: true, omitSiteActivity: true }
  )
  return { embed, enrichmentFailures: card.enrichmentFailures ?? [] }
}

// Line labels follow licenceField's layout in interactions.ts.
const LICENCE_LINE_LABELS = ['status', 'holder', 'seats']

/** Names the parts of a card that differ — never their values; empty means unchanged. */
export function directoryCardDiff(
  existing: DirectoryEmbedSnapshot | null | undefined,
  expected: DiscordEmbed
): string[] {
  if (!existing) return ['card']
  const diff: string[] = []
  if (existing.title !== expected.title) diff.push('title')
  if (existing.description !== expected.description) diff.push('description')
  if (existing.color !== expected.color) diff.push('color')
  if (existing.footer?.text !== expected.footer?.text) diff.push('footer')

  const existingFields = existing.fields ?? []
  for (let i = 0; i < Math.max(existingFields.length, expected.fields.length); i += 1) {
    const before = existingFields[i]
    const after = expected.fields[i]
    const label = after?.name ?? before?.name
    if (!before) {
      diff.push(`${label}: added`)
      continue
    }
    if (!after) {
      diff.push(`${label}: removed`)
      continue
    }
    if (before.name !== after.name) diff.push(`${label}: name`)
    if ((before.inline ?? false) !== (after.inline ?? false)) diff.push(`${label}: inline`)
    if (before.value !== after.value) {
      const beforeLines = (before.value ?? '').split('\n')
      const afterLines = after.value.split('\n')
      const lines = new Set<string>()
      for (let j = 0; j < Math.max(beforeLines.length, afterLines.length); j += 1) {
        if (beforeLines[j] !== afterLines[j]) lines.add(LICENCE_LINE_LABELS[j] ?? 'sites')
      }
      diff.push(`${label}: ${[...lines].join('/')}`)
    }
  }
  return diff
}

export interface DirectorySyncSummary {
  members: number
  created: number
  updated: number
  deleted: number
  failed: number
}

/**
 * Full pass: edit each changed card in place, create a card only for a member
 * with none, delete cards for members no longer linked. A card whose
 * enrichment failed is kept as posted. Non-card messages (no member footer)
 * are left untouched so a pinned channel intro survives. Sequential on
 * purpose — the writes share one per-channel rate-limit bucket.
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
    failed: 0,
  }
  const recordFailure = (
    operation: 'build' | 'create' | 'edit' | 'delete' | 'enrich',
    error: unknown,
    discordUserId?: string,
    messageId?: string,
    source?: DiscordCardEnrichmentFailure['source']
  ) => {
    summary.failed += 1
    callSafely(() =>
      dependencies.reportFailure?.({ discordUserId, messageId, operation, source, error })
    )
  }
  const deleteCard = async (
    messageId: string,
    discordUserId: string,
    reason: 'duplicate' | 'orphan'
  ) => {
    try {
      await dependencies.deleteDirectoryCard(messageId)
      summary.deleted += 1
      reportChange(dependencies, { discordUserId, messageId, operation: 'delete', fields: [reason] })
    } catch (error) {
      recordFailure('delete', error, discordUserId, messageId)
    }
  }

  // First card per member wins; later duplicates (an event upsert racing a
  // sync can create one) are deleted here, so the nightly pass self-heals.
  const messageByMemberId = new Map<string, DirectoryMessage>()
  for (const message of messages) {
    if (!message.memberId) continue
    if (messageByMemberId.has(message.memberId)) {
      await deleteCard(message.id, message.memberId, 'duplicate')
      continue
    }
    messageByMemberId.set(message.memberId, message)
  }

  for (const member of members) {
    const { discordUserId } = member
    let operation: 'build' | 'create' | 'edit' = 'build'
    let messageId: string | undefined
    try {
      const { embed, enrichmentFailures } = await buildCard(member, licenses, dependencies)
      const existing = messageByMemberId.get(discordUserId)
      if (existing && enrichmentFailures.length > 0) {
        // A weaker card from a transient failure must not overwrite a good one.
        for (const failure of enrichmentFailures) {
          recordFailure('enrich', failure.error, discordUserId, existing.id, failure.source)
        }
        continue
      }
      if (existing) {
        operation = 'edit'
        messageId = existing.id
        const current =
          directoryCardDiff(existing.embed, embed).length === 0
            ? await dependencies.getDirectoryMessage?.(existing.id)
            : existing
        const diff = directoryCardDiff(current?.embed, embed)
        if (diff.length > 0) {
          await dependencies.editDirectoryCard(existing.id, embed)
          summary.updated += 1
          reportChange(dependencies, { discordUserId, messageId, operation: 'edit', fields: diff })
        }
      } else {
        // A new link deserves a card even if enrichment failed; the next pass edits it.
        for (const failure of enrichmentFailures) {
          recordFailure('enrich', failure.error, discordUserId, undefined, failure.source)
        }
        operation = 'create'
        await dependencies.createDirectoryCard(embed)
        summary.created += 1
        reportChange(dependencies, { discordUserId, operation: 'create', fields: [] })
      }
    } catch (error) {
      recordFailure(operation, error, discordUserId, messageId)
    }
  }

  for (const [memberId, message] of messageByMemberId) {
    if (!memberIds.has(memberId)) {
      await deleteCard(message.id, memberId, 'orphan')
    }
  }

  return summary
}

/**
 * Event-path upsert after a claim/unlink/removal touches one member: edit
 * their card in place (create one only when they have none, keep it when
 * enrichment failed), or delete it when no licence links them any more.
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

  const { embed, enrichmentFailures } = await buildCard(member, licenses, dependencies)
  const reportEnrichmentFailures = (messageId?: string) => {
    for (const { source, error } of enrichmentFailures) {
      callSafely(() =>
        dependencies.reportFailure?.({ discordUserId, messageId, operation: 'enrich', source, error })
      )
    }
  }
  if (existing) {
    if (enrichmentFailures.length > 0) {
      reportEnrichmentFailures(existing.id)
      return
    }
    const diff = directoryCardDiff(existing.embed, embed)
    if (diff.length > 0) {
      await dependencies.editDirectoryCard(existing.id, embed)
      reportChange(dependencies, {
        discordUserId,
        messageId: existing.id,
        operation: 'edit',
        fields: diff,
      })
    }
  } else {
    reportEnrichmentFailures()
    await dependencies.createDirectoryCard(embed)
    reportChange(dependencies, { discordUserId, operation: 'create', fields: [] })
  }
}
