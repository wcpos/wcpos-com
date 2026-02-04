import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCustomerOrders } from '@/lib/medusa-auth'
import { licenseClient } from '@/services/core/external/license-client'
import type { MedusaOrder } from '@/lib/medusa-auth'

/**
 * Machine Deactivation API
 *
 * DELETE /api/account/licenses/[licenseId]/machines/[machineId]
 *
 * Deactivates a machine from the customer's license.
 *
 * Auth: Reads the Medusa JWT from the session cookie.
 * Ownership is verified by checking the licenseId exists in order metadata.
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ licenseId: string; machineId: string }> }
) {
  try {
    const { licenseId, machineId } = await params

    const orders = await getCustomerOrders(100)

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const licenseIds = extractLicenseIds(orders)

    if (!licenseIds.includes(licenseId)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Verify machine belongs to this license
    const machines = await licenseClient.getLicenseMachines(licenseId)
    const machineOwned = machines.some((m) => m.id === machineId)
    if (!machineOwned) {
      return NextResponse.json(
        { error: 'Machine does not belong to this license' },
        { status: 403 }
      )
    }

    const success = await licenseClient.deactivateMachine(machineId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to deactivate machine' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('[AccountLicenses] Failed to deactivate machine:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
