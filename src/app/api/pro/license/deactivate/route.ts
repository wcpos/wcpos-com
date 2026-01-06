import { NextResponse } from 'next/server'
import { proService } from '@/services/core/business/pro-service'

/**
 * License Deactivation API
 *
 * POST /api/pro/license/deactivate
 *
 * Deactivates a license key from a specific instance.
 *
 * @example
 * POST /api/pro/license/deactivate
 * Body: { "key": "ABCD-1234-EFGH-5678", "instance": "https://mysite.com" }
 */

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { key, instance } = body

    if (!key || !instance) {
      return NextResponse.json(
        { status: 400, error: 'Missing required fields: key, instance' },
        { status: 400 }
      )
    }

    const result = await proService.deactivateLicense(key, instance)

    return NextResponse.json(result, { status: result.status })
  } catch (error) {
    console.error('[ProAPI] License deactivation failed:', error)
    return NextResponse.json(
      { status: 500, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

