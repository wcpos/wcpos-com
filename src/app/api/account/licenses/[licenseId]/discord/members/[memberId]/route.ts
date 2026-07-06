import { NextRequest, NextResponse } from 'next/server'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import {
  getLicensesForDiscordUser,
  removeConnectedDiscordMemberForHolder,
} from '@/lib/discord/connected-member-service'
import { createDiscordRoleSyncDependencies } from '@/lib/discord/default-sync'
import { isDiscordConfigured } from '@/lib/discord/config'
import { syncDiscordProRoleForMember } from '@/lib/discord/sync'
import type { LicenseLifecycle } from '@/lib/license'
import {
  licenseClient,
  KeygenAuthNotConfiguredError,
} from '@/services/core/external/license-client'
import { infraLogger } from '@/lib/logger'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'

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
      return NextResponse.json(
        { error: 'read_only_inspection' },
        { status: 403 }
      )
    }
    throw error
  }

  const { licenseId, memberId } = await params
  const { authenticated, licenses } = await getResolvedCustomerLicenses()

  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json(
        { error: 'Discord management is not configured' },
        { status: 503 }
      )
    }
    throw error
  }

  if (result.status === 'license_not_found') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (result.status === 'member_not_found') {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
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
  }

  return NextResponse.json({ ok: true })
}
