/**
 * License API Types
 */

export interface LicenseStatus {
  activated: boolean
  status: 'active' | 'expired' | 'inactive' | 'invalid'
  expiresAt?: string
  activationsLimit?: number
  activationsCount?: number
  productName?: string
  customerEmail?: string
}

export interface LicenseStatusResponse {
  status: number
  data?: LicenseStatus
  error?: string
  message?: string
}

export interface LicenseActivateRequest {
  key: string
  instance: string
}

export interface ProUpdateInfo {
  version: string
  name: string
  releaseDate: string
  notes: string
  downloadUrl: string
}

export interface ProUpdateResponse {
  status: number
  data?: ProUpdateInfo
  error?: string
}

/**
 * Keygen CE License Types
 */

export interface LicenseMachine {
  id: string
  fingerprint: string
  name: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface LicenseDetail {
  id: string
  key: string
  status: string
  expiry: string | null
  maxMachines: number
  machines: LicenseMachine[]
  metadata: Record<string, unknown>
  policyId: string
  createdAt: string
}

