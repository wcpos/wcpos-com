import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAllOrders } from '@/lib/customer-orders'
import { getCustomer } from '@/lib/medusa-auth'
import { extractLicenseIdsFromOrders } from '@/lib/licenses'
import { licenseClient } from '@/services/core/external/license-client'
import { licenseLogger } from '@/lib/logger'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ licenseId: string; machineId: string }> }
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

  try {
    const { licenseId, machineId } = await params

    const customer = await getCustomer()
    if (!customer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const orders = await getAllOrders()
    const licenseIds = extractLicenseIdsFromOrders(orders)

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
    licenseLogger.error`Failed to deactivate machine: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
