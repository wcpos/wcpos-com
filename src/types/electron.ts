/**
 * Electron Update API Types
 */

export interface ElectronAsset {
  name: string
  contentType: string
  size: number
  url: string
}

export interface ElectronUpdateResponse {
  version: string
  name: string
  assets: ElectronAsset[]
  releaseDate: string
  notes: string
}

/**
 * Response format for electron >= 1.4.0
 */
export interface ElectronUpdateResponseV2 {
  status: number
  data: ElectronUpdateResponse
}

/**
 * Legacy response format for electron < 1.4.0
 * Returns flat object without status wrapper
 */
export type ElectronUpdateResponseLegacy = ElectronUpdateResponse

export interface ElectronErrorResponse {
  status: number
  error: string
}

export type Platform = 'darwin-arm64' | 'darwin-x64' | 'win32-x64' | 'linux-x64'

export interface PlatformMapping {
  extension: string
  identifier?: string
}

export const PLATFORM_MAPPINGS: Record<Platform, PlatformMapping> = {
  'darwin-arm64': { extension: 'dmg', identifier: 'arm64' },
  'darwin-x64': { extension: 'dmg', identifier: 'x64' },
  'win32-x64': { extension: 'exe', identifier: 'Setup' },
  'linux-x64': { extension: 'AppImage' },
}

