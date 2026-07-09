import { NextRequest, NextResponse, after } from 'next/server'
import { env } from '@/utils/env'
import { infraLogger } from '@/lib/logger'
import { verifyDiscordInteractionSignature } from '@/lib/discord/interaction-verify'
import {
  CUSTOMER_INFO_PERMISSION_DENIED_REPLY,
  DISCORD_COMMAND_TYPE,
  DISCORD_CUSTOMER_INFO_COMMAND,
  DISCORD_INTERACTION_TYPE,
  DISCORD_LINK_COMMAND,
  DISCORD_UNLINK_COMMAND,
  GENERIC_FAILURE_REPLY,
  GUILD_ONLY_REPLY,
  buildMemberCardEmbed,
  formatLinkReply,
  formatUnlinkReply,
  getInvokingUser,
  getStringOption,
  hasCustomerInfoPermission,
  type DiscordInteraction,
  type DiscordInteractionUser,
} from '@/lib/discord/interactions'
import {
  claimConnectedDiscordMember,
  removeConnectedDiscordMemberSelf,
} from '@/lib/discord/connected-member-service'
import { syncDiscordProRoleForMember } from '@/lib/discord/sync'
import {
  createDiscordRoleSyncDependencies,
  syncDiscordDirectoryForMember,
} from '@/lib/discord/default-sync'
import { lookupDiscordCustomerInfo } from '@/lib/discord/customer-lookup'
import { findAdminCustomerByEmail, listAdminCustomerOrders } from '@/lib/discord/medusa-admin'
import { DiscordApiClient } from '@/lib/discord/client'
import { getDiscordConfig, isDiscordConfigured } from '@/lib/discord/config'
import { licenseClient } from '@/services/core/external/license-client'

// The Customer info lookup pages the whole Keygen licence fleet (~25
// requests today); give the deferred follow-up the same ceiling as the other
// slow route.
export const maxDuration = 60

const EPHEMERAL = 64
const DISCORD_API_BASE = 'https://discord.com/api/v10'

function ephemeralReply(content: string): NextResponse {
  return NextResponse.json({ type: 4, data: { content, flags: EPHEMERAL } })
}

function deferredEphemeralReply(): NextResponse {
  return NextResponse.json({ type: 5, data: { flags: EPHEMERAL } })
}

// Discord application IDs are numeric snowflakes; interaction tokens are
// base64url strings ([A-Za-z0-9_-]). Both are matched against anchored
// allow-lists so no character that could alter the host or escape the path
// segment (`/`, `\`, `@`, `.`, `:`) can reach the request URL.
const DISCORD_APPLICATION_ID_PATTERN = /^[0-9]+$/
const DISCORD_INTERACTION_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/

/**
 * Build the interaction-token webhook URL from the (already signature-verified)
 * interaction payload, rejecting any values that could redirect the request off
 * Discord. Defence-in-depth against SSRF: the Ed25519 check already proves the
 * payload came from Discord, but the URL parts are still attacker-shaped input.
 *
 * The identifiers are validated against anchored allow-lists (not a reject
 * list) so the whole value is proven safe before it is used to build the URL —
 * this is the sanitising barrier CodeQL's request-forgery query recognises.
 */
function buildEditOriginalUrl(interaction: DiscordInteraction): string {
  const { application_id: applicationId, token } = interaction
  if (
    !DISCORD_APPLICATION_ID_PATTERN.test(applicationId) ||
    !DISCORD_INTERACTION_TOKEN_PATTERN.test(token)
  ) {
    throw new Error('Invalid Discord interaction identifiers')
  }
  // Fixed, trusted base; only the validated segments are appended.
  return `${DISCORD_API_BASE}/webhooks/${applicationId}/${token}/messages/@original`
}

/**
 * Deferred interactions answer by editing the original response through the
 * interaction-token webhook — the bot token is not involved.
 */
async function editOriginalResponse(
  interaction: DiscordInteraction,
  reply: string | { content?: string; embeds?: unknown[] }
): Promise<void> {
  try {
    const response = await fetch(
      buildEditOriginalUrl(interaction),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeof reply === 'string' ? { content: reply } : reply),
      }
    )
    if (!response.ok) {
      infraLogger.error`Discord interaction follow-up edit failed (${response.status}): ${await response.text()}`
    }
  } catch (error) {
    infraLogger.error`Discord interaction follow-up edit failed: ${error}`
  }
}

function claimDependencies() {
  return {
    now: () => new Date(),
    validateLicenseKey: licenseClient.validateLicenseKey,
    getLicense: licenseClient.getLicense,
    updateLicenseMetadata: licenseClient.updateLicenseMetadata,
  }
}

async function runLinkCommand(
  interaction: DiscordInteraction,
  user: DiscordInteractionUser,
  licenseKey: string
): Promise<void> {
  try {
    const result = await claimConnectedDiscordMember({
      licenseKey,
      identity: { id: user.id, username: user.username, avatar: user.avatar },
      dependencies: claimDependencies(),
    })

    if (
      isDiscordConfigured() &&
      (result.status === 'claimed' || result.status === 'already_connected')
    ) {
      try {
        await syncDiscordProRoleForMember(
          user.id,
          createDiscordRoleSyncDependencies(async () => {
            const license = await licenseClient.getLicense(result.licenseId)
            return [{ status: license.status, expiry: license.expiry }]
          })
        )
      } catch (syncError) {
        infraLogger.warn`Discord role sync after /link claim failed: ${syncError}`
      }
    }

    if (result.status === 'claimed' || result.status === 'already_connected') {
      try {
        await syncDiscordDirectoryForMember(user.id)
      } catch (directoryError) {
        // Best-effort: the nightly directory reconcile heals any miss.
        infraLogger.warn`Discord directory sync after /link claim failed: ${directoryError}`
      }
    }

    await editOriginalResponse(interaction, formatLinkReply(result, licenseKey))
  } catch (error) {
    infraLogger.error`Discord /link command failed: ${error}`
    await editOriginalResponse(interaction, GENERIC_FAILURE_REPLY)
  }
}

async function runUnlinkCommand(
  interaction: DiscordInteraction,
  user: DiscordInteractionUser,
  licenseKey: string
): Promise<void> {
  try {
    const result = await removeConnectedDiscordMemberSelf({
      licenseKey,
      discordUserId: user.id,
      dependencies: claimDependencies(),
    })
    // No inline role removal: another licence may still back this member, and
    // only the full-fleet view can tell. Reconciliation (the correctness
    // mechanism, ADR-0004) settles the role overnight.
    if (result.status === 'removed') {
      try {
        // The directory upsert IS fleet-wide, so it can refresh (or drop) the
        // card immediately even though the role has to wait for reconcile.
        await syncDiscordDirectoryForMember(user.id)
      } catch (directoryError) {
        infraLogger.warn`Discord directory sync after /unlink failed: ${directoryError}`
      }
    }
    await editOriginalResponse(interaction, formatUnlinkReply(result, licenseKey))
  } catch (error) {
    infraLogger.error`Discord /unlink command failed: ${error}`
    await editOriginalResponse(interaction, GENERIC_FAILURE_REPLY)
  }
}

async function runCustomerInfoCommand(
  interaction: DiscordInteraction,
  targetId: string
): Promise<void> {
  try {
    const client = new DiscordApiClient(getDiscordConfig())
    const info = await lookupDiscordCustomerInfo(targetId, {
      listAllLicenses: licenseClient.listAllLicenses,
      findCustomerByEmail: findAdminCustomerByEmail,
      listCustomerOrders: listAdminCustomerOrders,
      getLicenseMachines: licenseClient.getLicenseMachines,
      getMemberRoleState: (discordUserId) => client.getMemberRoleState(discordUserId),
    })
    const resolvedTarget = interaction.data?.resolved?.users?.[targetId]
    const embed = buildMemberCardEmbed(
      info,
      { id: targetId, username: resolvedTarget?.username ?? null },
      { roleState: info.roleState }
    )
    await editOriginalResponse(interaction, { embeds: [embed] })
  } catch (error) {
    infraLogger.error`Discord Customer info command failed: ${error}`
    await editOriginalResponse(interaction, GENERIC_FAILURE_REPLY)
  }
}

export async function POST(request: NextRequest) {
  const publicKey = env.DISCORD_PUBLIC_KEY
  if (!publicKey) {
    // Fail loud: this endpoint only exists when the Discord app is wired up;
    // a missing key is a deployment defect, not a feature flag.
    infraLogger.error`Discord interactions endpoint hit without DISCORD_PUBLIC_KEY configured`
    return NextResponse.json(
      { errorCode: 'discord_interactions_unconfigured' },
      { status: 503 }
    )
  }

  const signature = request.headers.get('x-signature-ed25519')
  const timestamp = request.headers.get('x-signature-timestamp')
  const rawBody = await request.text()

  if (
    !signature ||
    !timestamp ||
    !verifyDiscordInteractionSignature({
      publicKeyHex: publicKey,
      signatureHex: signature,
      timestamp,
      rawBody,
    })
  ) {
    return NextResponse.json({ errorCode: 'invalid_request_signature' }, { status: 401 })
  }

  let interaction: DiscordInteraction
  try {
    interaction = JSON.parse(rawBody) as DiscordInteraction
  } catch {
    return NextResponse.json({ errorCode: 'malformed_interaction' }, { status: 400 })
  }

  if (interaction.type === DISCORD_INTERACTION_TYPE.PING) {
    return NextResponse.json({ type: 1 })
  }

  if (interaction.type !== DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND) {
    return NextResponse.json({ errorCode: 'unsupported_interaction_type' }, { status: 400 })
  }

  if (!env.DISCORD_GUILD_ID) {
    infraLogger.error`Discord interactions endpoint hit without DISCORD_GUILD_ID configured`
    return NextResponse.json(
      { errorCode: 'discord_interactions_unconfigured' },
      { status: 503 }
    )
  }

  const user = getInvokingUser(interaction)
  if (!interaction.member || !user || interaction.guild_id !== env.DISCORD_GUILD_ID) {
    return ephemeralReply(GUILD_ONLY_REPLY)
  }

  const commandName = interaction.data?.name
  const commandType = interaction.data?.type

  if (commandType === DISCORD_COMMAND_TYPE.CHAT_INPUT && commandName === DISCORD_LINK_COMMAND) {
    const licenseKey = getStringOption(interaction, 'key')
    if (!licenseKey) {
      return ephemeralReply('❌ Provide your license key: `/link key:<your-key>`.')
    }
    after(() => runLinkCommand(interaction, user, licenseKey))
    return deferredEphemeralReply()
  }

  if (commandType === DISCORD_COMMAND_TYPE.CHAT_INPUT && commandName === DISCORD_UNLINK_COMMAND) {
    const licenseKey = getStringOption(interaction, 'key')
    if (!licenseKey) {
      return ephemeralReply('❌ Provide your license key: `/unlink key:<your-key>`.')
    }
    after(() => runUnlinkCommand(interaction, user, licenseKey))
    return deferredEphemeralReply()
  }

  if (
    commandType === DISCORD_COMMAND_TYPE.USER &&
    commandName === DISCORD_CUSTOMER_INFO_COMMAND
  ) {
    if (!hasCustomerInfoPermission(interaction)) {
      return ephemeralReply(CUSTOMER_INFO_PERMISSION_DENIED_REPLY)
    }
    const targetId = interaction.data?.target_id
    if (!targetId) {
      return ephemeralReply(GENERIC_FAILURE_REPLY)
    }
    after(() => runCustomerInfoCommand(interaction, targetId))
    return deferredEphemeralReply()
  }

  return ephemeralReply('Unknown command.')
}
