import { NextResponse } from 'next/server'
import { getCustomerOrders } from '@/lib/medusa-auth'
import { extractLicenseIdsFromOrders } from '@/lib/licenses'
import { licenseClient } from '@/services/core/external/license-client'
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
    const orders = await getCustomerOrders()

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const licenseIds = extractLicenseIdsFromOrders(orders)

    const licenses = await Promise.all(
      licenseIds.map(async (id) => {
        try {
          return await licenseClient.getLicenseWithMachines(id)
        } catch (error) {
          licenseLogger.error`Failed to fetch license ${id}: ${error}`
          return null
        }
      })
    )

    const validLicenses = licenses.filter(Boolean)

    return NextResponse.json({ licenses: validLicenses }, { status: 200 })
  } catch (error) {
    licenseLogger.error`Failed to fetch licenses: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
