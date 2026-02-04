import { NextRequest, NextResponse } from 'next/server'
import { licenseClient } from '@/services/core/external/license-client'

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
export async function POST(request: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'validate': {
        const { licenseKey } = body
        if (!licenseKey) {
          return NextResponse.json(
            { error: 'licenseKey required' },
            { status: 400 }
          )
        }
        const result = await licenseClient.validateLicenseKey(licenseKey)
        return NextResponse.json(result)
      }

      case 'activate': {
        const { licenseId, fingerprint, metadata = {} } = body
        if (!licenseId || !fingerprint) {
          return NextResponse.json(
            { error: 'licenseId and fingerprint required' },
            { status: 400 }
          )
        }
        const machine = await licenseClient.activateMachine(
          licenseId,
          fingerprint,
          metadata
        )
        if (!machine) {
          return NextResponse.json(
            {
              error:
                'Activation failed (limit reached or invalid license)',
            },
            { status: 422 }
          )
        }
        return NextResponse.json({ success: true, machine })
      }

      case 'deactivate': {
        const { machineId } = body
        if (!machineId) {
          return NextResponse.json(
            { error: 'machineId required' },
            { status: 400 }
          )
        }
        const success = await licenseClient.deactivateMachine(machineId)
        return NextResponse.json({ success })
      }

      case 'status': {
        const { licenseId } = body
        if (!licenseId) {
          return NextResponse.json(
            { error: 'licenseId required' },
            { status: 400 }
          )
        }
        const license =
          await licenseClient.getLicenseWithMachines(licenseId)
        return NextResponse.json({ license })
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Valid actions: validate, activate, deactivate, status`,
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[TestHarness] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
