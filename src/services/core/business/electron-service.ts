/**
 * Electron Desktop App Service (stub)
 *
 * Handles update checks and download URL resolution for the Electron desktop app.
 *
 * TODO: Implement when Electron app releases are set up
 */

interface ErrorResponse {
  status: number
  error: string
}

interface UpdateResponse {
  status: number
  version: string
  assets: Array<{
    name: string
    browser_download_url: string
    size: number
  }>
  releaseDate: string
  notes?: string
}

type UpdateResult = UpdateResponse | ErrorResponse

class ElectronService {
  async getLatestUpdate(
    _platform: string,
    _version: string
  ): Promise<UpdateResult> {
    return { status: 404, error: 'Electron service not yet implemented' }
  }

  async getDownloadUrl(
    _platform: string,
    _version: string
  ): Promise<string | ErrorResponse> {
    return { status: 404, error: 'Electron service not yet implemented' }
  }
}

export const electronService = new ElectronService()
