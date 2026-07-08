import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAllOrders } from '@/lib/customer-orders'
import { getCustomer } from '@/lib/medusa-auth'
import { extractLicenseIdsFromOrders } from '@/lib/licenses'
import {
  licenseClient,
  KeygenAuthNotConfiguredError,
} from '@/services/core/external/license-client'
import { licenseLogger } from '@/lib/logger'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'

type MachineErrorCode =
  | 'read_only_inspection'
  | 'unauthorized'
  | 'forbidden'
  | 'machine_not_found_for_license'
  | 'deactivate_failed'
  | 'machine_management_unconfigured'
  | 'internal'

function errorResponse(errorCode: MachineErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

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
      return errorResponse('read_only_inspection', 403)
    }
    throw error
  }

  try {
    const { licenseId, machineId } = await params

    const customer = await getCustomer()
    if (!customer) {
      return errorResponse('unauthorized', 401)
    }

    const orders = await getAllOrders()
    const licenseIds = extractLicenseIdsFromOrders(orders)

    if (!licenseIds.includes(licenseId)) {
      return errorResponse('forbidden', 403)
    }

    // Verify machine belongs to this license
    const machines = await licenseClient.getLicenseMachines(licenseId)
    const machineOwned = machines.some((m) => m.id === machineId)
    if (!machineOwned) {
      return errorResponse('machine_not_found_for_license', 403)
    }

    const success = await licenseClient.deactivateMachine(machineId)

    if (!success) {
      return errorResponse('deactivate_failed', 500)
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    // Fail LOUD when machine management can't authenticate to Keygen (no
    // KEYGEN_API_TOKEN) rather than a vague 500 — the operator needs to know
    // the credential is missing, not chase a phantom bug.
    if (error instanceof KeygenAuthNotConfiguredError) {
      licenseLogger.error`Machine deactivation unavailable: ${error.message}`
      return errorResponse('machine_management_unconfigured', 503)
    }
    licenseLogger.error`Failed to deactivate machine: ${error}`
    return errorResponse('internal', 500)
  }
}
