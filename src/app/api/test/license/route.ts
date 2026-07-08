import { NextRequest, NextResponse } from 'next/server'
import { licenseClient } from '@/services/core/external/license-client'
import { licenseLogger } from '@/lib/logger'

/**
 * License activation test harness
 *
 * Only available in development/test environments.
 * Simulates the license operations the Pro plugin performs.
 *
 * POST with JSON body:
 *   { action: 'validate', licenseKey: '...' }
 *   { action: 'activate', licenseId: '...', fingerprint: '...', metadata: { domain: '...' } }
 *   { action: 'deactivate', machineId: '...' }
 *   { action: 'status', licenseId: '...' }
 */
function errorResponse(errorCode: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ errorCode, ...extra }, { status })
}

export async function POST(request: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return errorResponse('not_available_in_production', 403)
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'validate': {
        const { licenseKey } = body
        if (!licenseKey) {
          return errorResponse('license_key_required', 400)
        }
        const result = await licenseClient.validateLicenseKey(licenseKey)
        return NextResponse.json(result)
      }

      case 'activate': {
        const { licenseId, fingerprint, metadata = {} } = body
        if (!licenseId || !fingerprint) {
          return errorResponse('license_id_and_fingerprint_required', 400)
        }
        const machine = await licenseClient.activateMachine(
          licenseId,
          fingerprint,
          metadata
        )
        if (!machine) {
          return errorResponse('activation_failed', 422)
        }
        return NextResponse.json({ success: true, machine })
      }

      case 'deactivate': {
        const { machineId } = body
        if (!machineId) {
          return errorResponse('machine_id_required', 400)
        }
        const success = await licenseClient.deactivateMachine(machineId)
        return NextResponse.json({ success })
      }

      case 'status': {
        const { licenseId } = body
        if (!licenseId) {
          return errorResponse('license_id_required', 400)
        }
        const license =
          await licenseClient.getLicenseWithMachines(licenseId)
        return NextResponse.json({ license })
      }

      default:
        return errorResponse('unknown_action', 400, { action })
    }
  } catch (error) {
    licenseLogger.error`Test harness error: ${error}`
    return errorResponse('test_harness_error', 500)
  }
}
