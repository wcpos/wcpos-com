import { NextResponse } from 'next/server'
import { githubClient } from '@/services/core/external/github-client'
import { apiLogger } from '@/lib/logger'

const ELECTRON_REPO = 'electron'

/**
 * Desktop Releases API
 * 
 * GET /api/desktop-releases
 * 
 * Returns the latest release information with all assets for displaying
 * download links on the homepage.
 */
export async function GET() {
  try {
    const release = await githubClient.getLatestRelease(ELECTRON_REPO)
    
    if (!release) {
      return NextResponse.json(
        { errorCode: 'release_not_found' },
        { status: 404 }
      )
    }
    
    const response = {
      version: release.tagName.replace(/^v/, ''),
      name: release.name,
      assets: release.assets.map(asset => ({
        name: asset.name,
        browser_download_url: asset.browser_download_url,
        size: asset.size,
      })),
      releaseDate: release.publishedAt,
      notes: release.body,
    }
    
    return NextResponse.json(response)
  } catch (error) {
    apiLogger.error`Failed to fetch desktop release: ${error}`
    return NextResponse.json(
      { errorCode: 'failed_fetch_release_information' },
      { status: 500 }
    )
  }
}