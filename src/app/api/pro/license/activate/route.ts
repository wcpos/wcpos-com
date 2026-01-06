import { NextResponse } from 'next/server'
import { proService } from '@/services/core/business/pro-service'

/**
 * License Activation API
 *
 * POST /api/pro/license/activate
 *
 * Activates a license key for a specific instance.
 *
 * @example
 * POST /api/pro/license/activate
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

    const result = await proService.activateLicense(key, instance)

    return NextResponse.json(result, { status: result.status })
  } catch (error) {
    console.error('[ProAPI] License activation failed:', error)
    return NextResponse.json(
      { status: 500, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

