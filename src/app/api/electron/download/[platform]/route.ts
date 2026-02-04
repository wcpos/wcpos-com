import { NextResponse } from 'next/server'
import { cacheLife } from 'next/cache'
import { electronService } from '@/services/core/business/electron-service'

/**
 * Electron Download Redirect API
 *
 * GET /api/electron/download/[platform]
 * GET /api/electron/download/[platform]?version=1.5.0
 *
 * Redirects to the GitHub download URL for the specified platform.
 * Defaults to the latest version if no version is specified.
 *
 * @example
 * GET /api/electron/download/darwin-arm64
 * GET /api/electron/download/win32-x64?version=1.4.0
 */

interface RouteParams {
  params: Promise<{
    platform: string
  }>
}

/**
 * Cached function to get download URL
 */
async function getCachedDownloadUrl(platform: string, version: string) {
  'use cache'
  cacheLife('api-short')
  return electronService.getDownloadUrl(platform, version)
}

export async function GET(request: Request, { params }: RouteParams) {
  const { platform } = await params
  const { searchParams } = new URL(request.url)
  const version = searchParams.get('version') || 'latest'

  try {
    const result = await getCachedDownloadUrl(platform, version)

    // Check if it's an error response
    if (typeof result === 'object' && 'error' in result) {
      return NextResponse.json(result, { status: result.status })
    }

    // Redirect to GitHub download URL
    return NextResponse.redirect(result, 302)
  } catch (error) {
    console.error('[ElectronAPI] Download redirect failed:', error)
    return NextResponse.json(
      { status: 500, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

