import { NextRequest, NextResponse } from 'next/server'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { unblockConnectedDiscordUserForHolder } from '@/lib/discord/connected-member-service'
import {
  licenseClient,
  KeygenAuthNotConfiguredError,
} from '@/services/core/external/license-client'
import { infraLogger } from '@/lib/logger'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'

type DiscordUnblockErrorCode =
  | 'read_only_inspection'
  | 'unauthorized'
  | 'discord_management_unconfigured'
  | 'forbidden'
  | 'not_blocked'

function errorResponse(errorCode: DiscordUnblockErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

/**
 * Holder unblock (ADR-0007): lifts the block a holder removal placed on a
 * Discord user id, so the person can reconnect through the normal claim flow.
 * Unblocking grants nothing by itself — no seat, no role — so unlike member
 * removal there is no role sync to run here; the reclaim does its own.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ licenseId: string; discordUserId: string }> }
) {
  try {
    await assertViewOnly()
  } catch (error) {
    if (error instanceof ViewOnlyError) {
      return errorResponse('read_only_inspection', 403)
    }
    throw error
  }

  const { licenseId, discordUserId } = await params
  const { authenticated, licenses } = await getResolvedCustomerLicenses()

  if (!authenticated) {
    return errorResponse('unauthorized', 401)
  }

  let result
  try {
    result = await unblockConnectedDiscordUserForHolder({
      licenseId,
      discordUserId,
      holderLicenses: licenses,
      dependencies: {
        getLicense: licenseClient.getLicense,
        updateLicenseMetadata: licenseClient.updateLicenseMetadata,
      },
    })
  } catch (error) {
    // Fail LOUD when Discord seat management can't authenticate to Keygen (no
    // KEYGEN_API_TOKEN) rather than a vague 500 — mirrors member removal.
    if (error instanceof KeygenAuthNotConfiguredError) {
      infraLogger.error`Discord member unblock unavailable: ${error.message}`
      return errorResponse('discord_management_unconfigured', 503)
    }
    throw error
  }

  if (result.status === 'license_not_found') {
    return errorResponse('forbidden', 403)
  }
  if (result.status === 'not_blocked') {
    return errorResponse('not_blocked', 404)
  }

  return NextResponse.json({ ok: true })
}
