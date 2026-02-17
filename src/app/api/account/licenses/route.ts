import { NextResponse } from 'next/server'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { licenseLogger } from '@/lib/logger'

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

export async function GET() {
  try {
    const { authenticated, licenses } = await getResolvedCustomerLicenses()

    if (!authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json({ licenses }, { status: 200 })
  } catch (error) {
    licenseLogger.error`Failed to fetch licenses: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
