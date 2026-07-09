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

export interface DiscordLicenceSite {
  /** domain → siteUrl → machine name, same precedence as the account UI. */
  label: string
  url: string | null
  lastSeenAt: string | null
  pluginVersion: string | null
}

export interface DiscordCustomerLicenceInfo {
  keySuffix: string
  status: string
  expiry: string | null
  /** From the plan registry via policyId — never inferred from expiry (#526). */
  planId: 'yearly' | 'lifetime' | null
  holderEmail: string | null
  holderName: string | null
  usedSeats: number
  seatCap: number
  connectedAt: string | null
  sites: DiscordLicenceSite[]
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

const PLAN_LABEL: Record<'yearly' | 'lifetime', string> = {
  yearly: 'Pro Yearly',
  lifetime: 'Pro Lifetime',
}

// Accent colours per plan/state — matching the approved prototype (#519).
const EMBED_COLOR = {
  yearly: 0x5865f2,
  lifetime: 0xc9a227,
  inactive: 0x80848e,
} as const

// Discord embed hard limits we can realistically hit: 25 fields per embed and
// 6,000 chars across the embed. Eight licence fields with capped site lines
// stay comfortably inside both.
const MAX_LICENCE_FIELDS = 8
const MAX_SITE_LINES = 3

export interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface DiscordEmbed {
  title: string
  description: string
  color: number
  fields: DiscordEmbedField[]
  footer?: { text: string }
}

function expiryLabel(licence: DiscordCustomerLicenceInfo): string {
  if (licence.expiry) return `expires ${formatDate(licence.expiry)}`
  // No-expiry only means lifetime when the plan registry says so — migrated
  // expired-yearly licences were written with a null expiry (#526).
  return licence.planId === 'lifetime' ? 'lifetime' : 'no expiry on record'
}

function siteLine(site: DiscordLicenceSite): string {
  const label = site.url ? `[${site.label}](${site.url})` : site.label
  const seen = site.lastSeenAt ? `seen ${formatDate(site.lastSeenAt)}` : 'never seen'
  const plugin = site.pluginVersion ? ` · plugin ${site.pluginVersion}` : ''
  return `${label} — ${seen}${plugin}`
}

function licenceField(licence: DiscordCustomerLicenceInfo): DiscordEmbedField {
  const plan = licence.planId ? ` · ${PLAN_LABEL[licence.planId]}` : ''
  const holder = licence.holderEmail
    ? `holder ${licence.holderEmail}${licence.holderName ? ` (${licence.holderName})` : ''}`
    : 'holder unknown'
  const connected = licence.connectedAt
    ? `connected ${formatDate(licence.connectedAt)}`
    : 'connection date unknown'
  const siteLines =
    licence.sites.length === 0
      ? ['sites: none activated yet']
      : [
          `sites: ${licence.sites.slice(0, MAX_SITE_LINES).map(siteLine).join(' · ')}`,
          ...(licence.sites.length > MAX_SITE_LINES
            ? [`…and ${licence.sites.length - MAX_SITE_LINES} more sites`]
            : []),
        ]

  return {
    name: `****-${licence.keySuffix}${plan}`,
    value: [
      `${licence.status}, ${expiryLabel(licence)}`,
      holder,
      `seats ${licence.usedSeats}/${licence.seatCap} · ${connected}`,
      ...siteLines,
    ].join('\n'),
  }
}

function embedColor(licences: DiscordCustomerLicenceInfo[]): number {
  const active = licences.find((licence) => licence.status === 'active')
  if (!active) return EMBED_COLOR.inactive
  return active.planId === 'lifetime' ? EMBED_COLOR.lifetime : EMBED_COLOR.yearly
}

/**
 * The member card as a Discord embed — one builder for both admin surfaces
 * (#519/#522): the ephemeral Customer info reply (roleState shown, no footer)
 * and the #member-directory card (footer carries the member id so the sync
 * can match cards to members without any stored map — the channel is the
 * database).
 */
export function buildMemberCardEmbed(
  info: { licences: DiscordCustomerLicenceInfo[]; customerSince: string | null },
  target: { id: string; username: string | null },
  options: { roleState?: DiscordCustomerInfo['roleState']; directoryFooter?: boolean } = {}
): DiscordEmbed {
  const descriptionLines = [
    `Customer since: ${info.customerSince ? formatDate(info.customerSince) : 'unknown'}`,
    ...(options.roleState ? [`Pro role: ${ROLE_STATE_LABEL[options.roleState]}.`] : []),
  ]
  if (info.licences.length === 0) {
    descriptionLines.unshift('No licenses have this Discord account as a connected member.')
  }

  const fields = info.licences.slice(0, MAX_LICENCE_FIELDS).map(licenceField)
  if (info.licences.length > MAX_LICENCE_FIELDS) {
    fields.push({
      name: 'More licences',
      value: `…and ${info.licences.length - MAX_LICENCE_FIELDS} more licences omitted.`,
    })
  }

  return {
    title: `Customer info — ${target.username ? `@${target.username}` : `<@${target.id}>`}`,
    description: descriptionLines.join('\n'),
    color: embedColor(info.licences),
    fields,
    ...(options.directoryFooter ? { footer: { text: directoryFooterText(target.id) } } : {}),
  }
}

// Footer marker matching cards to members in #member-directory. Parsing is the
// inverse — both live here so they cannot drift apart.
const DIRECTORY_FOOTER_PREFIX = 'member:'

export function directoryFooterText(discordUserId: string): string {
  return `${DIRECTORY_FOOTER_PREFIX}${discordUserId}`
}

export function parseDirectoryFooterMemberId(footerText: string | null | undefined): string | null {
  if (!footerText?.startsWith(DIRECTORY_FOOTER_PREFIX)) return null
  const id = footerText.slice(DIRECTORY_FOOTER_PREFIX.length)
  return /^\d+$/.test(id) ? id : null
}
