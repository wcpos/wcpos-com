export const DISCORD_ACCESS_METADATA_KEY = 'discord_access'
export const DEFAULT_DISCORD_SEAT_CAP = 5

export interface ConnectedDiscordIdentity {
  id: string
  username: string | null
  avatar: string | null
  connectedAt: Date
}

export interface ConnectedDiscordMemberRecord {
  id: string
  discordUserId: string
  username: string | null
  avatar: string | null
  connectedAt: string
  removedAt?: string | null
}

export interface ConnectedDiscordAccess {
  seatCap: number
  members: ConnectedDiscordMemberRecord[]
  blockedDiscordUserIds: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function parseSeatCap(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_DISCORD_SEAT_CAP
}

function parseBlockedUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0)))
}

function parseMember(value: unknown): ConnectedDiscordMemberRecord | null {
  if (!isRecord(value)) return null
  const id = stringOrNull(value.id)
  const discordUserId = stringOrNull(value.discordUserId)
  const connectedAt = stringOrNull(value.connectedAt)
  if (!id || !discordUserId || !connectedAt) return null
  const removedAt = stringOrNull(value.removedAt)
  return {
    id,
    discordUserId,
    username: stringOrNull(value.username),
    avatar: stringOrNull(value.avatar),
    connectedAt,
    ...(removedAt ? { removedAt } : {}),
  }
}

function readRawAccess(metadata: Record<string, unknown> | null | undefined) {
  const raw = metadata?.[DISCORD_ACCESS_METADATA_KEY]
  return isRecord(raw) ? raw : {}
}

export function getConnectedDiscordAccess(
  metadata: Record<string, unknown> | null | undefined
): ConnectedDiscordAccess {
  const raw = readRawAccess(metadata)
  const members = Array.isArray(raw.members)
    ? raw.members.map(parseMember).filter((member): member is ConnectedDiscordMemberRecord => Boolean(member))
    : []

  return {
    seatCap: parseSeatCap(raw.seatCap),
    members: members.filter((member) => !member.removedAt),
    blockedDiscordUserIds: parseBlockedUserIds(raw.blockedDiscordUserIds),
  }
}

function getAllMemberRecords(metadata: Record<string, unknown> | null | undefined): ConnectedDiscordMemberRecord[] {
  const raw = readRawAccess(metadata)
  if (!Array.isArray(raw.members)) return []
  return raw.members.map(parseMember).filter((member): member is ConnectedDiscordMemberRecord => Boolean(member))
}

function writeAccessMetadata(
  metadata: Record<string, unknown> | null | undefined,
  access: ConnectedDiscordAccess,
  allMembers: ConnectedDiscordMemberRecord[] = access.members
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [DISCORD_ACCESS_METADATA_KEY]: {
      seatCap: access.seatCap,
      blockedDiscordUserIds: access.blockedDiscordUserIds,
      members: allMembers,
    },
  }
}

export function buildConnectedDiscordMemberId(discordUserId: string): string {
  return `discord-member-${discordUserId}`
}

export function addConnectedDiscordMember(
  metadata: Record<string, unknown> | null | undefined,
  identity: ConnectedDiscordIdentity
): Record<string, unknown> {
  const access = getConnectedDiscordAccess(metadata)
  const existingRecords = getAllMemberRecords(metadata)
  const withoutExistingActive = existingRecords.filter(
    (member) => member.discordUserId !== identity.id || member.removedAt
  )
  const nextMember: ConnectedDiscordMemberRecord = {
    id: buildConnectedDiscordMemberId(identity.id),
    discordUserId: identity.id,
    username: identity.username,
    avatar: identity.avatar,
    connectedAt: identity.connectedAt.toISOString(),
  }

  return writeAccessMetadata(
    metadata,
    access,
    [...withoutExistingActive, nextMember]
  )
}

export function removeConnectedDiscordMember(
  metadata: Record<string, unknown> | null | undefined,
  memberId: string,
  removedAt: Date,
  // Block-listing is the HOLDER-removal semantic (stops an immediate reclaim
  // with the same shared key). A member releasing their own seat passes
  // block: false — leaving voluntarily is not an offence (ADR-0007 amendment).
  { block = true }: { block?: boolean } = {}
): Record<string, unknown> {
  const access = getConnectedDiscordAccess(metadata)
  const allMembers = getAllMemberRecords(metadata)
  let removedDiscordUserId: string | null = null
  const nextMembers = allMembers.map((member) => {
    if (member.id !== memberId || member.removedAt) return member
    removedDiscordUserId = member.discordUserId
    return { ...member, removedAt: removedAt.toISOString() }
  })

  const blockedDiscordUserIds = block && removedDiscordUserId
    ? Array.from(new Set([...access.blockedDiscordUserIds, removedDiscordUserId]))
    : access.blockedDiscordUserIds

  return writeAccessMetadata(
    metadata,
    { ...access, blockedDiscordUserIds },
    nextMembers
  )
}

export interface BlockedDiscordMemberRecord {
  discordUserId: string
  username: string | null
  avatar: string | null
  removedAt: string | null
}

/**
 * Blocked Discord users joined with their removed-member history, so the
 * holder view can show who is behind each blocked id. The block list itself
 * only stores ids; the handle/avatar come from the most recent removed member
 * record for that id (null fields when no record survives).
 */
export function getBlockedDiscordMembers(
  metadata: Record<string, unknown> | null | undefined
): BlockedDiscordMemberRecord[] {
  const access = getConnectedDiscordAccess(metadata)
  const allMembers = getAllMemberRecords(metadata)
  return access.blockedDiscordUserIds.map((discordUserId) => {
    const record = allMembers
      .filter((member) => member.discordUserId === discordUserId && member.removedAt)
      .sort((a, b) => a.removedAt!.localeCompare(b.removedAt!))
      .pop()
    return {
      discordUserId,
      username: record?.username ?? null,
      avatar: record?.avatar ?? null,
      removedAt: record?.removedAt ?? null,
    }
  })
}

export function unblockDiscordUserForLicence(
  metadata: Record<string, unknown> | null | undefined,
  discordUserId: string
): Record<string, unknown> {
  const access = getConnectedDiscordAccess(metadata)
  return writeAccessMetadata(
    metadata,
    {
      ...access,
      blockedDiscordUserIds: access.blockedDiscordUserIds.filter((id) => id !== discordUserId),
    },
    getAllMemberRecords(metadata)
  )
}

export function isDiscordUserBlockedForLicence(
  metadata: Record<string, unknown> | null | undefined,
  discordUserId: string
): boolean {
  return getConnectedDiscordAccess(metadata).blockedDiscordUserIds.includes(discordUserId)
}

export function hasConnectedDiscordMember(
  metadata: Record<string, unknown> | null | undefined,
  discordUserId: string
): boolean {
  return getConnectedDiscordAccess(metadata).members.some(
    (member) => member.discordUserId === discordUserId
  )
}
