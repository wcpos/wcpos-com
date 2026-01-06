import { NextResponse } from 'next/server'
import { electronService } from '@/services/core/business/electron-service'

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

export async function GET(request: Request, { params }: RouteParams) {
  const { platform, version } = await params

  try {
    const result = await electronService.getLatestUpdate(platform, version)

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
    console.error('[ElectronAPI] Update check failed:', error)
    return NextResponse.json(
      { status: 500, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Enable ISR-style caching - revalidate every 5 minutes
export const revalidate = 300

