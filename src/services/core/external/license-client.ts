import 'server-only'

import type { LicenseStatusResponse } from '@/types/license'

/**
 * License Client
 *
 * TODO: This is a placeholder implementation.
 * Will be replaced with integration to the new license server.
 *
 * Future implementation will:
 * - Connect to the license server API
 * - Validate license keys
 * - Track activations per instance
 * - Handle subscription status
 */

/**
 * Validate a license key and instance
 *
 * @param licenseKey - The license key to validate
 * @param instance - The unique instance identifier (site URL, device ID, etc.)
 */
export async function validateLicense(
  licenseKey: string,
  instance: string
): Promise<LicenseStatusResponse> {
  // TODO: Replace with actual license server call
  console.log(`[LicenseClient] Validating license: ${licenseKey.substring(0, 8)}... for instance: ${instance}`)

  // Dummy implementation - always returns valid for testing
  // In production, this will call the actual license server
  if (!licenseKey || licenseKey.length < 8) {
    return {
      status: 400,
      error: 'Invalid license key format',
    }
  }

  // Simulate different license states based on key prefix (for testing)
  if (licenseKey.startsWith('EXPIRED_')) {
    return {
      status: 200,
      data: {
        activated: false,
        status: 'expired',
        expiresAt: '2024-01-01T00:00:00Z',
        productName: 'WooCommerce POS Pro',
      },
    }
  }

  if (licenseKey.startsWith('INVALID_')) {
    return {
      status: 404,
      error: 'License key not found',
      message: 'The provided license key does not exist.',
    }
  }

  // Default: return active license
  return {
    status: 200,
    data: {
      activated: true,
      status: 'active',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      activationsLimit: 5,
      activationsCount: 1,
      productName: 'WooCommerce POS Pro',
      customerEmail: 'customer@example.com',
    },
  }
}

/**
 * Activate a license for an instance
 */
export async function activateLicense(
  licenseKey: string,
  instance: string
): Promise<LicenseStatusResponse> {
  // TODO: Replace with actual license server call
  console.log(`[LicenseClient] Activating license: ${licenseKey.substring(0, 8)}... for instance: ${instance}`)

  // Dummy implementation
  return {
    status: 200,
    data: {
      activated: true,
      status: 'active',
      activationsLimit: 5,
      activationsCount: 1,
      productName: 'WooCommerce POS Pro',
    },
  }
}

/**
 * Deactivate a license for an instance
 */
export async function deactivateLicense(
  licenseKey: string,
  instance: string
): Promise<LicenseStatusResponse> {
  // TODO: Replace with actual license server call
  console.log(`[LicenseClient] Deactivating license: ${licenseKey.substring(0, 8)}... for instance: ${instance}`)

  // Dummy implementation
  return {
    status: 200,
    data: {
      activated: false,
      status: 'inactive',
      productName: 'WooCommerce POS Pro',
    },
  }
}

export const licenseClient = {
  validateLicense,
  activateLicense,
  deactivateLicense,
}

