import type { DiscordClaimResult, DiscordSelfUnlinkResult } from './connected-member-service'

/**
 * Discord interaction handling for the WCPOS server: /link, /unlink and the
 * admin-only "Customer info" user context command (ADR-0007 amendment,
 * ADR-0014). Pure command logic — the route wires real dependencies.
 *
 * Replies are deliberately English-only: they are messages inside the
 * (English-speaking) community server, not site UI, so they stay out of the
 * 10-locale message catalogues.
 */

export const DISCORD_INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const

export const DISCORD_COMMAND_TYPE = {
  CHAT_INPUT: 1,
  USER: 2,
} as const

export const DISCORD_LINK_COMMAND = 'link'
export const DISCORD_UNLINK_COMMAND = 'unlink'
export const DISCORD_CUSTOMER_INFO_COMMAND = 'Customer info'

export interface DiscordInteractionUser {
  id: string
  username: string | null
  avatar: string | null
}

export interface DiscordInteraction {
  type: number
  application_id: string
  token: string
  guild_id?: string
  data?: {
    name?: string
    type?: number
    target_id?: string
    options?: Array<{ name: string; value?: unknown }>
    resolved?: {
      users?: Record<string, { id: string; username?: string | null }>
    }
  }
  member?: {
    user?: DiscordInteractionUser
    permissions?: string
  }
  user?: DiscordInteractionUser
}

/** The user who invoked the interaction (guild member or DM user). */
export function getInvokingUser(interaction: DiscordInteraction): DiscordInteractionUser | null {
  return interaction.member?.user ?? interaction.user ?? null
}

export function getStringOption(interaction: DiscordInteraction, name: string): string | null {
  const value = interaction.data?.options?.find((option) => option.name === name)?.value
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

// BigInt() calls rather than literals — the tsconfig target predates ES2020.
const ADMINISTRATOR = BigInt(0x8)
const MANAGE_GUILD = BigInt(0x20)
const NONE = BigInt(0)

/**
 * Server-side double check behind the command's default_member_permissions —
 * command permissions are guild-admin-editable in Discord, so the endpoint
 * cannot trust registration-time gating alone (ADR-0014).
 */
export function hasCustomerInfoPermission(interaction: DiscordInteraction): boolean {
  const permissions = interaction.member?.permissions
  if (typeof permissions !== 'string' || !/^\d+$/.test(permissions)) return false
  const bits = BigInt(permissions)
  return (bits & ADMINISTRATOR) !== NONE || (bits & MANAGE_GUILD) !== NONE
}

function maskedKey(licenseKey: string): string {
  return `\`****-${licenseKey.slice(-4)}\``
}

export function formatLinkReply(result: DiscordClaimResult, licenseKey: string): string {
  switch (result.status) {
    case 'claimed':
      return `✅ Discord connected to license ${maskedKey(licenseKey)}. Your Pro role is on its way — welcome!`
    case 'already_connected':
      return `ℹ️ This Discord account is already connected to license ${maskedKey(licenseKey)}.`
    case 'invalid_license':
      return '❌ That license key was not recognised. You can copy it from Account → Licenses on wcpos.com.'
    case 'license_not_active':
      return '❌ That license is not active, so it cannot grant Discord access. Renewing it on wcpos.com restores the perk.'
    case 'blocked':
      return '❌ The license holder removed this Discord account from that license, so it cannot reconnect with this key.'
    case 'seat_cap_reached':
      return '❌ That license has no free Discord seats. Ask the license holder to remove a member on wcpos.com first.'
  }
}

export function formatUnlinkReply(result: DiscordSelfUnlinkResult, licenseKey: string): string {
  switch (result.status) {
    case 'removed':
      return `✅ Disconnected from license ${maskedKey(licenseKey)} — the seat is free again. If no other license backs your Pro role, the nightly sync removes it.`
    case 'not_connected':
      return `ℹ️ This Discord account is not connected to license ${maskedKey(licenseKey)}.`
    case 'invalid_license':
      return '❌ That license key was not recognised. You can copy it from Account → Licenses on wcpos.com.'
  }
}

export const CUSTOMER_INFO_PERMISSION_DENIED_REPLY =
  'You need the Manage Server permission to look up customer info.'

export const GUILD_ONLY_REPLY = 'This command only works inside the WCPOS Discord server.'

export const GENERIC_FAILURE_REPLY =
  'Something went wrong on our side. Please try again, or contact support@wcpos.com.'

export interface DiscordCustomerLicenceInfo {
  keySuffix: string
  status: string
  expiry: string | null
  holderEmail: string | null
  usedSeats: number
  seatCap: number
  connectedAt: string | null
}

export interface DiscordCustomerInfo {
  licences: DiscordCustomerLicenceInfo[]
  /** Earliest order date across the holder accounts backing this member. */
  customerSince: string | null
  roleState: 'has_role' | 'missing_role' | 'not_in_guild' | 'unknown'
}

function formatDate(value: string | null): string {
  if (!value) return 'unknown date'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'unknown date'
  return parsed.toISOString().slice(0, 10)
}

const ROLE_STATE_LABEL: Record<DiscordCustomerInfo['roleState'], string> = {
  has_role: 'held',
  missing_role: 'not held',
  not_in_guild: 'user not in server',
  unknown: 'unknown',
}

const DISCORD_MESSAGE_CONTENT_LIMIT = 2000

export function formatCustomerInfoReply(
  info: DiscordCustomerInfo,
  target: { id: string; username: string | null }
): string {
  const header = `**Customer info — ${target.username ? `@${target.username}` : `<@${target.id}>`}**`

  if (info.licences.length === 0) {
    return [
      header,
      'No licenses have this Discord account as a connected member.',
      `Pro role: ${ROLE_STATE_LABEL[info.roleState]}.`,
    ].join('\n')
  }

  const lines = info.licences.map((licence) => {
    const expiry = licence.expiry ? `expires ${formatDate(licence.expiry)}` : 'lifetime'
    const holder = licence.holderEmail ?? 'holder unknown'
    const connected = licence.connectedAt
      ? `connected ${formatDate(licence.connectedAt)}`
      : 'connection date unknown'
    return `• \`****-${licence.keySuffix}\` — ${licence.status}, ${expiry} · ${holder} · seats ${licence.usedSeats}/${licence.seatCap} · ${connected}`
  })

  const prefixLines = [
    header,
    `Customer since: ${info.customerSince ? formatDate(info.customerSince) : 'unknown'}`,
    `Pro role: ${ROLE_STATE_LABEL[info.roleState]}.`,
  ]
  const visibleLines: string[] = []

  for (const line of lines) {
    const remaining = lines.length - visibleLines.length - 1
    const omittedLine = remaining > 0 ? `…and ${remaining} more licences omitted.` : null
    const candidate = [
      ...prefixLines,
      ...visibleLines,
      line,
      ...(omittedLine ? [omittedLine] : []),
    ].join('\n')

    if (candidate.length > DISCORD_MESSAGE_CONTENT_LIMIT) break
    visibleLines.push(line)
  }

  const omittedCount = lines.length - visibleLines.length
  return [
    ...prefixLines,
    ...visibleLines,
    ...(omittedCount > 0 ? [`…and ${omittedCount} more licences omitted.`] : []),
  ].join('\n')
}
