/**
 * Canonical license status vocabulary (CONTEXT.md, docs/adr/0001):
 * active / expired / suspended / revoked / unknown (unverifiable).
 *
 * Keygen reports a wider raw status space than the canonical vocabulary.
 * INACTIVE (no validation in ~90 days) and EXPIRING (within days of expiry)
 * are both fully paid, in-term licenses — they must normalize to `active`
 * or entitlement wrongly locks out paying customers. BANNED is Keygen's
 * terminal status and maps to `revoked`. Anything unrecognized fails closed
 * as `unknown`: no entitlement, presented as unverified, never treated as
 * revoked.
 */
export type CanonicalLicenseStatus =
  | 'active'
  | 'expired'
  | 'suspended'
  | 'revoked'
  | 'unknown'

const STATUS_MAP: Record<string, CanonicalLicenseStatus> = {
  // Keygen raw statuses
  active: 'active',
  expiring: 'active',
  inactive: 'active',
  expired: 'expired',
  suspended: 'suspended',
  banned: 'revoked',
  // Canonical values pass through unchanged
  revoked: 'revoked',
  unknown: 'unknown',
}

export function normalizeLicenseStatus(status: string): CanonicalLicenseStatus {
  return STATUS_MAP[status.trim().toLowerCase()] ?? 'unknown'
}
