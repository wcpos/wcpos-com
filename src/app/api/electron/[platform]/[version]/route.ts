import { NextResponse } from 'next/server'
import { cacheLife } from 'next/cache'
import { electronService } from '@/services/core/business/electron-service'
import { apiLogger } from '@/lib/logger'

/**
 * Electron Update Check API
 *
 * GET /api/electron/[platform]/[version]
 *
 * Returns the latest release information for the specified platform.
 * The response format depends on the client version:
 * - >= 1.4.0: { status: 200, data: { version, assets, ... } }
 * - < 1.4.0: { version, assets, ... } (legacy flat format)
 *
 * @example
 * GET /api/electron/darwin-arm64/1.5.0
 * GET /api/electron/win32-x64/1.3.0
 */

interface RouteParams {
  params: Promise<{
    platform: string
    version: string
  }>
}

/**
 * Cached function to fetch latest update
 */
async function getCachedUpdate(platform: string, version: string) {
  'use cache'
  cacheLife('api-short')
  return electronService.getLatestUpdate(platform, version)
}

export async function GET(request: Request, { params }: RouteParams) {
  const { platform, version } = await params

  try {
    const result = await getCachedUpdate(platform, version)

    // Check if it's an error response
    if ('error' in result) {
      return NextResponse.json(result, { status: result.status })
    }

    // For legacy responses (< 1.4.0), return flat object
    if ('version' in result && !('status' in result)) {
      return NextResponse.json(result, { status: 200 })
    }

    // For modern responses (>= 1.4.0), return with status
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    apiLogger.error`Electron update check failed: ${error}`
    return NextResponse.json(
      { status: 500, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

