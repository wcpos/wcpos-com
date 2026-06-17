import 'server-only'

import { getGitHubToken } from './github-auth'
import { infraLogger } from '@/lib/logger'

const FETCH_TIMEOUT_MS = 10_000

/** The minimal release fields needed to fetch the binary from GitHub. */
export interface ReleaseAssetRef {
  assetApiUrl: string
  assetUrl: string
  assetName: string
}

/**
 * The bytes plus the framing facts a route needs. Deliberately free of
 * `next/server`: the route maps this to a NextResponse and owns the
 * Cache-Control / Content-Disposition headers (entitled streams must never
 * be cached). The module only delivers the bytes.
 */
export interface ServedAsset {
  stream: ReadableStream<Uint8Array>
  filename: string
  contentType: 'application/zip'
}

/**
 * Fetch a release asset from GitHub. Tries the authenticated assets API URL
 * first, then the browser download URL, mirroring the account download path.
 * Returns null when every attempt fails so the caller can answer 502. This is
 * the single home for what had drifted across the two streaming routes.
 */
export async function fetchReleaseAsset(
  release: ReleaseAssetRef
): Promise<ServedAsset | null> {
  const githubToken = await getGitHubToken()
  if (!githubToken) {
    infraLogger.warn`GitHub token unavailable for release asset fetch. asset=${release.assetName}`
  }

  const attempts = [
    {
      name: 'asset-api' as const,
      url: release.assetApiUrl,
      headers: {
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        Accept: 'application/octet-stream',
      },
    },
    {
      name: 'asset-browser' as const,
      url: release.assetUrl,
      headers: {
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        Accept: '*/*',
      },
    },
  ]

  for (const attempt of attempts) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(attempt.url, {
        headers: attempt.headers,
        signal: controller.signal,
      })
      if (!response.ok || !response.body) {
        infraLogger.warn`Release asset attempt failed (${attempt.name}). status=${response.status} asset=${release.assetName}`
        continue
      }

      return {
        stream: response.body,
        filename: release.assetName,
        contentType: 'application/zip',
      }
    } catch (error) {
      infraLogger.warn`Release asset attempt error (${attempt.name}). asset=${release.assetName} error=${error}`
    } finally {
      clearTimeout(timeout)
    }
  }

  return null
}
