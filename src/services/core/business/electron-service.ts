import 'server-only'

import semver from 'semver'
import { githubClient } from '../external/github-client'
import type { GitHubAsset } from '@/types/github'
import type {
  ElectronAsset,
  ElectronUpdateResponse,
  ElectronUpdateResponseV2,
  ElectronUpdateResponseLegacy,
  ElectronErrorResponse,
} from '@/types/electron'

const ELECTRON_REPO = 'electron'

/**
 * Electron Update Service
 *
 * Handles update checks and download URL generation for the
 * WooCommerce POS desktop application.
 */

/**
 * Get the latest release information for a platform
 *
 * Returns different response formats based on client version:
 * - >= 1.4.0: Wrapped response with status
 * - < 1.4.0: Legacy flat response
 */
export async function getLatestUpdate(
  platform: string,
  currentVersion: string
): Promise<ElectronUpdateResponseV2 | ElectronUpdateResponseLegacy | ElectronErrorResponse> {
  const release = await githubClient.getLatestRelease(ELECTRON_REPO)

  if (!release) {
    return { status: 404, error: 'No release found' }
  }

  const version = release.tagName.replace(/^v/, '')
  const assets = filterAssetsForPlatform(release.assets, platform)

  const updateResponse: ElectronUpdateResponse = {
    version,
    name: release.name,
    assets,
    releaseDate: release.publishedAt,
    notes: release.body,
  }

  // Backwards compatibility for electron versions < 1.4.0
  // They expect a flat response without status wrapper
  if (semver.valid(currentVersion) && semver.lt(currentVersion, '1.4.0')) {
    return updateResponse
  }

  return {
    status: 200,
    data: updateResponse,
  }
}

/**
 * Get the download URL for a specific platform
 * Returns the direct GitHub download URL for the appropriate asset
 */
export async function getDownloadUrl(
  platform: string,
  version: string = 'latest'
): Promise<string | ElectronErrorResponse> {
  const release =
    version === 'latest'
      ? await githubClient.getLatestRelease(ELECTRON_REPO)
      : await githubClient.getReleaseByTag(ELECTRON_REPO, version)

  if (!release) {
    return { status: 404, error: 'No release found' }
  }

  const mapping = getPlatformMapping(platform)
  if (!mapping) {
    return { status: 400, error: `Unsupported platform: ${platform}` }
  }

  // Find matching asset
  const asset = release.assets.find((a) => {
    const matchesExtension = a.name.endsWith(`.${mapping.extension}`)
    const matchesIdentifier = mapping.identifier
      ? a.name.includes(mapping.identifier)
      : true
    return matchesExtension && matchesIdentifier
  })

  if (!asset || !asset.browser_download_url) {
    return { status: 404, error: `No download found for platform: ${platform}` }
  }

  return asset.browser_download_url
}

/**
 * Filter GitHub assets for a specific platform
 */
function filterAssetsForPlatform(
  assets: GitHubAsset[],
  platformArch: string
): ElectronAsset[] {
  const [platform, arch] = platformArch.split('-')

  return assets
    .filter((asset) => {
      // Windows: RELEASES file and nupkg for Squirrel updates
      if (platform === 'win32') {
        return asset.name === 'RELEASES' || asset.name.endsWith('.nupkg')
      }

      // Linux: AppImage
      if (platform === 'linux') {
        return asset.name.endsWith('.AppImage')
      }

      // macOS: zip files with platform-arch in name
      return (
        asset.name.includes(`${platform}-${arch}`) &&
        asset.name.endsWith('.zip')
      )
    })
    .map((asset) => ({
      name: asset.name,
      contentType: asset.content_type,
      size: asset.size,
      url: asset.browser_download_url,
    }))
}

/**
 * Get platform mapping for download URL resolution
 */
function getPlatformMapping(
  platform: string
): { extension: string; identifier?: string } | null {
  const mappings: Record<string, { extension: string; identifier?: string }> = {
    'darwin-arm64': { extension: 'dmg', identifier: 'arm64' },
    'darwin-x64': { extension: 'dmg', identifier: 'x64' },
    'win32-x64': { extension: 'exe', identifier: 'Setup' },
    'linux-x64': { extension: 'AppImage' },
  }

  return mappings[platform] || null
}

/**
 * Check if there's a newer version available
 */
export async function hasUpdate(currentVersion: string): Promise<boolean> {
  const release = await githubClient.getLatestRelease(ELECTRON_REPO)
  if (!release) return false

  const latestVersion = release.tagName.replace(/^v/, '')
  return semver.gt(latestVersion, currentVersion)
}

export const electronService = {
  getLatestUpdate,
  getDownloadUrl,
  hasUpdate,
}

