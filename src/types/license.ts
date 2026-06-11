/**
 * License API Types
 */

import type { CanonicalLicenseStatus } from '@/lib/license-status'

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
  /** Plugin-facing display shape. Its `status` vocabulary is what the WP
      plugin understands and MUST NOT drive entitlement: 'inactive' here
      means suspended, while the canonical vocabulary maps 'inactive' to a
      different (in-term, active) Keygen state. */
  data?: LicenseStatus
  /** Canonical-vocabulary input for entitlement decisions
      (isReleaseAllowedForLicenses). Present whenever `data` is. */
  entitlement?: { status: CanonicalLicenseStatus; expiry: string | null }
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


