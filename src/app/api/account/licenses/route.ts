import { NextResponse } from 'next/server'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { getDiscordAccessByLicense } from '@/lib/discord/connected-member-service'
import { DISCORD_ACCESS_METADATA_KEY } from '@/lib/discord/connected-members'
import { licenseLogger } from '@/lib/logger'
import type { LicenseDetail } from '@/types/license'

type LicensesErrorCode = 'unauthorized' | 'internal'

function errorResponse(errorCode: LicensesErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

/**
 * Customer Licenses API
 *
 * GET /api/account/licenses
 *
 * Returns all licenses belonging to the authenticated customer,
 * enriched with machine activation data from Keygen.
 *
 * Auth: Reads the Medusa JWT from the session cookie.
 * Ownership is verified by extracting license IDs from order metadata.
 */

function stripDiscordAccessMetadata(licenses: LicenseDetail[]): LicenseDetail[] {
  return licenses.map((license) => {
    const metadata = { ...license.metadata }
    delete metadata[DISCORD_ACCESS_METADATA_KEY]
    return { ...license, metadata }
  })
}

export async function GET() {
  try {
    const { authenticated, licenses } = await getResolvedCustomerLicenses()

    if (!authenticated) {
      return errorResponse('unauthorized', 401)
    }

    return NextResponse.json({
      licenses: stripDiscordAccessMetadata(licenses),
      discordAccessByLicense: getDiscordAccessByLicense(licenses),
    }, { status: 200 })
  } catch (error) {
    licenseLogger.error`Failed to fetch licenses: ${error}`
    return errorResponse('internal', 500)
  }
}
