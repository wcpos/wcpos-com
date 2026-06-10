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

/**
 * Client-safe machine row for the admin licenses browser. Deliberately
 * excludes `metadata`, which the table never renders.
 */
export interface AdminLicenseMachineRow {
  id: string
  fingerprint: string
  name: string | null
  createdAt: string
}

/**
 * Client-safe license row for the admin licenses browser.
 *
 * These rows cross the server -> client component boundary and are
 * serialized into the RSC payload, so they must never carry the raw
 * license key (an activation credential) or raw metadata. The key is
 * masked server-side via toAdminLicenseRow before it gets here.
 */
export interface AdminLicenseRow {
  id: string
  /** Already masked server-side; the raw key never leaves the server. */
  maskedKey: string
  status: string
  expiry: string | null
  maxMachines: number
  policyId: string
  createdAt: string
  /** null means the machines lookup failed for that license. */
  machines: AdminLicenseMachineRow[] | null
}

