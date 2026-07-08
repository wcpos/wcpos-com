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
  formatCustomerInfoReply,
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
import { createDiscordRoleSyncDependencies } from '@/lib/discord/default-sync'
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

/**
 * Deferred interactions answer by editing the original response through the
 * interaction-token webhook — the bot token is not involved.
 */
async function editOriginalResponse(
  interaction: DiscordInteraction,
  content: string
): Promise<void> {
  const response = await fetch(
    `${DISCORD_API_BASE}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }
  )
  if (!response.ok) {
    infraLogger.error`Discord interaction follow-up edit failed (${response.status}): ${await response.text()}`
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
      getMemberRoleState: (discordUserId) => client.getMemberRoleState(discordUserId),
    })
    const resolvedTarget = interaction.data?.resolved?.users?.[targetId]
    await editOriginalResponse(
      interaction,
      formatCustomerInfoReply(info, {
        id: targetId,
        username: resolvedTarget?.username ?? null,
      })
    )
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

  const user = getInvokingUser(interaction)
  if (!interaction.member || !user) {
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
