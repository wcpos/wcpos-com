import { NextResponse } from 'next/server'
import { proService } from '@/services/core/business/pro-service'
import { licenseLogger } from '@/lib/logger'

/**
 * License Status Check API
 *
 * GET /api/pro/license/status?key=XXX&instance=YYY
 *
 * Checks the status of a license key for a specific instance.
 *
 * @example
 * GET /api/pro/license/status?key=ABCD-1234-EFGH-5678&instance=https://mysite.com
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  const instance = searchParams.get('instance')

  if (!key || !instance) {
    return NextResponse.json(
      { status: 400, error: 'Missing required parameters: key, instance' },
      { status: 400 }
    )
  }

  try {
    const result = await proService.getLicenseStatus(key, instance)

    return NextResponse.json(result, { status: result.status })
  } catch (error) {
    licenseLogger.error`License status check failed: ${error}`
    return NextResponse.json(
      { status: 500, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// No caching for license status - dynamic by default with cacheComponents

