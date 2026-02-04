/**
 * WooCommerce POS Pro Service (stub)
 *
 * Handles license validation, update checks, and download URL resolution
 * for the Pro plugin.
 *
 * TODO: Implement when Pro plugin licensing is set up
 */

interface ErrorResponse {
  status: number
  error: string
}

interface LicenseStatusResponse {
  status: number
  valid: boolean
  message?: string
}

interface UpdateInfoResponse {
  status: number
  version?: string
  downloadUrl?: string
  releaseDate?: string
  notes?: string
  error?: string
}

class ProService {
  async getDownloadUrl(
    _version: string,
    _key: string,
    _instance: string
  ): Promise<string | ErrorResponse> {
    return { status: 501, error: 'Pro service not yet implemented' }
  }

  async getLicenseStatus(
    _key: string,
    _instance: string
  ): Promise<LicenseStatusResponse> {
    return { status: 501, valid: false, message: 'Pro service not yet implemented' }
  }

  async getUpdateInfo(_version: string): Promise<UpdateInfoResponse> {
    return { status: 501, error: 'Pro service not yet implemented' }
  }
}

export const proService = new ProService()
