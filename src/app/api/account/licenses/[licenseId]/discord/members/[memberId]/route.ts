import { NextRequest, NextResponse } from 'next/server'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { removeConnectedDiscordMemberForHolder } from '@/lib/discord/connected-member-service'
import { createDiscordRoleSyncDependencies } from '@/lib/discord/default-sync'
import { isDiscordConfigured } from '@/lib/discord/config'
import { syncDiscordProRoleForMember } from '@/lib/discord/sync'
import { licenseClient } from '@/services/core/external/license-client'
import { infraLogger } from '@/lib/logger'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ licenseId: string; memberId: string }> }
) {
  const { licenseId, memberId } = await params
  const { authenticated, licenses } = await getResolvedCustomerLicenses()

  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await removeConnectedDiscordMemberForHolder({
    licenseId,
    memberId,
    holderLicenses: licenses,
    dependencies: {
      now: () => new Date(),
      updateLicenseMetadata: licenseClient.updateLicenseMetadata,
    },
  })

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
        createDiscordRoleSyncDependencies()
      )
    } catch (error) {
      infraLogger.warn`Discord role sync after member removal failed: ${error}`
    }
  }

  return NextResponse.json({ ok: true })
}
