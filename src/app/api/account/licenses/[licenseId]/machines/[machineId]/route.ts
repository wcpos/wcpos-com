import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAllCustomerOrders, getCustomer } from '@/lib/medusa-auth'
import { extractLicenseReferencesFromOrders } from '@/lib/licenses'
import { licenseClient } from '@/services/core/external/license-client'
import { licenseLogger } from '@/lib/logger'

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
    const { licenseId, machineId } = await params

    const customer = await getCustomer()
    if (!customer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const orders = await getAllCustomerOrders()
    const licenseIds = extractLicenseReferencesFromOrders(orders)
      .flatMap((reference) => (reference.id ? [reference.id] : []))

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
