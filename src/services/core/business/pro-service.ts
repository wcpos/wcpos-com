import 'server-only'

import { githubClient } from '../external/github-client'
import { licenseClient } from '../external/license-client'
import type { ProUpdateResponse, LicenseStatusResponse } from '@/types/license'

const PRO_REPO = 'woocommerce-pos-pro'

/**
 * Pro Plugin Service
 *
 * Handles update checks and license validation for the
 * WooCommerce POS Pro plugin.
 */

/**
 * Get the latest update info for the Pro plugin
 * @param _currentVersion - The client's current version (unused for now, could be used for comparison)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getUpdateInfo(
  _currentVersion: string
): Promise<ProUpdateResponse> {
  const release = await githubClient.getLatestRelease(PRO_REPO)

  if (!release) {
    return { status: 404, error: 'No release found' }
  }

  const version = release.tagName.replace(/^v/, '')

  return {
    status: 200,
    data: {
      version,
      name: release.name,
      releaseDate: release.publishedAt,
      notes: release.body,
      // Download requires license validation, so we point to our API
      downloadUrl: `https://updates.wcpos.com/api/pro/download/${version}`,
    },
  }
}

/**
 * Check license status
 */
export async function getLicenseStatus(
  licenseKey: string,
  instance: string
): Promise<LicenseStatusResponse> {
  return licenseClient.validateLicense(licenseKey, instance)
}

/**
 * Activate a license for an instance
 */
export async function activateLicense(
  licenseKey: string,
  instance: string
): Promise<LicenseStatusResponse> {
  return licenseClient.activateLicense(licenseKey, instance)
}

/**
 * Deactivate a license from an instance
 */
export async function deactivateLicense(
  licenseKey: string,
  instance: string
): Promise<LicenseStatusResponse> {
  return licenseClient.deactivateLicense(licenseKey, instance)
}

/**
 * Get the download URL for the Pro plugin
 * Validates license before returning the URL
 */
export async function getDownloadUrl(
  version: string,
  licenseKey: string,
  instance: string
): Promise<string | { status: number; error: string; message?: string }> {
  // First validate the license
  const licenseStatus = await licenseClient.validateLicense(licenseKey, instance)

  if (licenseStatus.status !== 200) {
    return {
      status: licenseStatus.status,
      error: licenseStatus.error || 'License validation failed',
      message: licenseStatus.message,
    }
  }

  if (!licenseStatus.data?.activated) {
    return {
      status: 403,
      error: 'License not active',
      message: 'Your license is not active. Please activate or renew your license.',
    }
  }

  if (licenseStatus.data.status === 'expired') {
    return {
      status: 403,
      error: 'License expired',
      message: 'Your license has expired. Please renew to continue receiving updates.',
    }
  }

  // License is valid, get the download URL from GitHub
  const release = version === 'latest'
    ? await githubClient.getLatestRelease(PRO_REPO)
    : await githubClient.getReleaseByTag(PRO_REPO, version)

  if (!release) {
    return { status: 404, error: 'Release not found' }
  }

  // Find the zip asset
  const zipAsset = release.assets.find(a => a.name.endsWith('.zip'))

  if (!zipAsset) {
    return { status: 404, error: 'Download not available' }
  }

  // Return the GitHub asset URL (needs auth header to download)
  return zipAsset.url
}

export const proService = {
  getUpdateInfo,
  getLicenseStatus,
  activateLicense,
  deactivateLicense,
  getDownloadUrl,
}

