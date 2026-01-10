import { NextResponse } from 'next/server'
import { cacheLife } from 'next/cache'
import { proService } from '@/services/core/business/pro-service'

/**
 * Pro Plugin Update Check API
 *
 * GET /api/pro/update/[version]
 *
 * Returns the latest release info for WooCommerce POS Pro.
 * This endpoint is public - no license required to check for updates.
 *
 * @example
 * GET /api/pro/update/1.0.0
 */

interface RouteParams {
  params: Promise<{
    version: string
  }>
}

/**
 * Cached function to get update info
 */
async function getCachedUpdateInfo(version: string) {
  'use cache'
  cacheLife('api-short')
  return proService.getUpdateInfo(version)
}

export async function GET(request: Request, { params }: RouteParams) {
  const { version } = await params

  try {
    const result = await getCachedUpdateInfo(version)

    return NextResponse.json(result, { status: result.status })
  } catch (error) {
    console.error('[ProAPI] Update check failed:', error)
    return NextResponse.json(
      { status: 500, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

