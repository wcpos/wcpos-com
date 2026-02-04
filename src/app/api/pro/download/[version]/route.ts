import { NextResponse } from 'next/server'
import { proService } from '@/services/core/business/pro-service'
import { getGitHubToken } from '@/services/core/external/github-auth'
import { apiLogger } from '@/lib/logger'

/**
 * Pro Plugin Download API
 *
 * GET /api/pro/download/[version]?key=XXX&instance=YYY
 *
 * Downloads the Pro plugin after validating the license.
 * Streams the file from GitHub with proper authentication.
 *
 * @example
 * GET /api/pro/download/1.0.0?key=ABCD-1234&instance=https://mysite.com
 * GET /api/pro/download/latest?key=ABCD-1234&instance=https://mysite.com
 */

interface RouteParams {
  params: Promise<{
    version: string
  }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const { version } = await params
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
    const result = await proService.getDownloadUrl(version, key, instance)

    // If error response
    if (typeof result === 'object' && 'error' in result) {
      return NextResponse.json(result, { status: result.status })
    }

    // Stream the file from GitHub
    const token = await getGitHubToken()
    const fetchHeaders: Record<string, string> = {
      Accept: 'application/octet-stream',
    }
    if (token) {
      fetchHeaders.Authorization = `Bearer ${token}`
    }
    const githubResponse = await fetch(result, { headers: fetchHeaders })

    if (!githubResponse.ok) {
      return NextResponse.json(
        { status: 502, error: 'Failed to fetch download from GitHub' },
        { status: 502 }
      )
    }

    // Stream the response
    const headers = new Headers()
    headers.set('Content-Type', 'application/zip')
    headers.set('Content-Disposition', 'attachment; filename=woocommerce-pos-pro.zip')

    if (githubResponse.headers.get('content-length')) {
      headers.set('Content-Length', githubResponse.headers.get('content-length')!)
    }

    return new NextResponse(githubResponse.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    apiLogger.error`Pro download failed: ${error}`
    return NextResponse.json(
      { status: 500, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// No caching for downloads - dynamic by default with cacheComponents

