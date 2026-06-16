export interface DiscordLink {
  userId: string
  username: string | null
  avatar: string | null
  linkedAt: string | null
}

export interface DiscordIdentity {
  id: string
  username: string | null
  avatar: string | null
  linkedAt: Date
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function getDiscordLink(
  metadata: Record<string, unknown> | null | undefined
): DiscordLink | null {
  const userId = stringOrNull(metadata?.discord_user_id)
  if (!userId) return null

  return {
    userId,
    username: stringOrNull(metadata?.discord_username),
    avatar: stringOrNull(metadata?.discord_avatar),
    linkedAt: stringOrNull(metadata?.discord_linked_at),
  }
}

export function buildDiscordLinkMetadata(
  metadata: Record<string, unknown> | null | undefined,
  identity: DiscordIdentity
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    discord_user_id: identity.id,
    discord_username: identity.username,
    discord_avatar: identity.avatar,
    discord_linked_at: identity.linkedAt.toISOString(),
  }
}

export function clearDiscordLinkMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) }
  delete next.discord_user_id
  delete next.discord_username
  delete next.discord_avatar
  delete next.discord_linked_at
  return next
}
