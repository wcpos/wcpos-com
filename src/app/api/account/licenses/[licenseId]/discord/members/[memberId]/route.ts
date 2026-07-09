import { NextRequest, NextResponse } from 'next/server'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import {
  getLicensesForDiscordUser,
  removeConnectedDiscordMemberForHolder,
} from '@/lib/discord/connected-member-service'
import {
  createDiscordRoleSyncDependencies,
  syncDiscordDirectoryForMember,
} from '@/lib/discord/default-sync'
import { isDiscordConfigured } from '@/lib/discord/config'
import { syncDiscordProRoleForMember } from '@/lib/discord/sync'
import type { LicenseLifecycle } from '@/lib/license'
import {
  licenseClient,
  KeygenAuthNotConfiguredError,
} from '@/services/core/external/license-client'
import { infraLogger } from '@/lib/logger'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'

type DiscordMemberErrorCode =
  | 'read_only_inspection'
  | 'unauthorized'
  | 'discord_management_unconfigured'
  | 'forbidden'
  | 'member_not_found'

function errorResponse(errorCode: DiscordMemberErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

const UNVERIFIABLE_DISCORD_ENTITLEMENT: LicenseLifecycle[] = [
  { status: 'unknown', expiry: null },
]

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ licenseId: string; memberId: string }> }
) {
  try {
    await assertViewOnly()
  } catch (error) {
    if (error instanceof ViewOnlyError) {
      return errorResponse('read_only_inspection', 403)
    }
    throw error
  }

  const { licenseId, memberId } = await params
  const { authenticated, licenses } = await getResolvedCustomerLicenses()

  if (!authenticated) {
    return errorResponse('unauthorized', 401)
  }

  let result
  try {
    result = await removeConnectedDiscordMemberForHolder({
      licenseId,
      memberId,
      holderLicenses: licenses,
      dependencies: {
        now: () => new Date(),
        getLicense: licenseClient.getLicense,
        updateLicenseMetadata: licenseClient.updateLicenseMetadata,
      },
    })
  } catch (error) {
    // Fail LOUD when Discord seat management can't authenticate to Keygen (no
    // KEYGEN_API_TOKEN) rather than a vague 500 — mirrors machine deactivation.
    // The operator needs to know the credential is missing, not chase a phantom
    // bug. The token is set in prod; this only bites if it ever lapses.
    if (error instanceof KeygenAuthNotConfiguredError) {
      infraLogger.error`Discord member removal unavailable: ${error.message}`
      return errorResponse('discord_management_unconfigured', 503)
    }
    throw error
  }

  if (result.status === 'license_not_found') {
    return errorResponse('forbidden', 403)
  }
  if (result.status === 'member_not_found') {
    return errorResponse('member_not_found', 404)
  }

  if (isDiscordConfigured()) {
    try {
      await syncDiscordProRoleForMember(
        result.discordUserId,
        createDiscordRoleSyncDependencies(async (discordUserId) => {
          const latestLicense = await licenseClient.getLicense(licenseId)
          const holderLicenses = licenses.map((license) =>
            license.id === latestLicense.id ? latestLicense : license
          )
          const memberLicenses = getLicensesForDiscordUser(discordUserId, holderLicenses)
          return memberLicenses.length > 0
            ? memberLicenses
            : UNVERIFIABLE_DISCORD_ENTITLEMENT
        })
      )
    } catch (error) {
      infraLogger.warn`Discord role sync after member removal failed: ${error}`
    }

    try {
      await syncDiscordDirectoryForMember(result.discordUserId)
    } catch (error) {
      // Best-effort: the nightly directory reconcile heals any miss.
      infraLogger.warn`Discord directory sync after member removal failed: ${error}`
    }
  }

  return NextResponse.json({ ok: true })
}
