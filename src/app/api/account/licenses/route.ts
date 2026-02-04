import { NextResponse } from 'next/server'
import { getCustomerOrders } from '@/lib/medusa-auth'
import { licenseClient } from '@/services/core/external/license-client'
import type { MedusaOrder } from '@/lib/medusa-auth'

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

function extractLicenseIds(orders: MedusaOrder[]): string[] {
  const ids: string[] = []
  for (const order of orders) {
    const licenses = order.metadata?.licenses as
      | Array<{ license_id: string }>
      | undefined
    if (licenses) {
      for (const lic of licenses) {
        if (lic.license_id) ids.push(lic.license_id)
      }
    }
  }
  return ids
}

export async function GET() {
  try {
    const orders = await getCustomerOrders()

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const licenseIds = extractLicenseIds(orders)

    const licenses = await Promise.all(
      licenseIds.map(async (id) => {
        try {
          return await licenseClient.getLicenseWithMachines(id)
        } catch (error) {
          console.error(
            `[AccountLicenses] Failed to fetch license ${id}:`,
            error
          )
          return null
        }
      })
    )

    const validLicenses = licenses.filter(Boolean)

    return NextResponse.json({ licenses: validLicenses }, { status: 200 })
  } catch (error) {
    console.error('[AccountLicenses] Failed to fetch licenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
