import type {
  AdminLicenseRow,
  LicenseDetail,
  LicenseMachine,
} from '@/types/license'

/**
 * Presentation rule for license statuses, shared by account and admin UIs.
 *
 * Keygen can report status "active" after the expiry date has passed;
 * present those licenses as expired so the UI matches download entitlement
 * (same rule as getDisplayStatus in src/components/account/licenses-client.tsx).
 * Unparseable expiry fails closed (treated as expired).
 */
export function getLicenseDisplayStatus(
  status: string,
  expiry: string | null,
  nowMs: number
): string {
  const normalized = status.toLowerCase()
  if (normalized === 'active' && expiry) {
    const expiryTime = new Date(expiry).getTime()
    if (Number.isNaN(expiryTime) || expiryTime < nowMs) {
      return 'expired'
    }
  }
  return normalized
}

/**
 * Mask a license key for display, matching the account licenses page:
 * only the last 4 characters are shown.
 */
export function maskLicenseKey(key: string): string {
  if (key.length <= 4) return '****'
  return '****-****-' + key.slice(-4)
}

/**
 * Project a full Keygen license (plus its machines) onto the client-safe
 * admin row. Must run server-side: it masks the key and drops metadata so
 * neither ever enters the RSC payload sent to the client. Masking here is
 * a transport-layer guarantee, not display-only.
 */
export function toAdminLicenseRow(
  license: Omit<LicenseDetail, 'machines'>,
  machines: LicenseMachine[] | null
): AdminLicenseRow {
  return {
    id: license.id,
    maskedKey: maskLicenseKey(license.key),
    status: license.status,
    expiry: license.expiry,
    maxMachines: license.maxMachines,
    policyId: license.policyId,
    createdAt: license.createdAt,
    machines:
      machines === null
        ? null
        : machines.map((machine) => ({
            id: machine.id,
            fingerprint: machine.fingerprint,
            name: machine.name,
            createdAt: machine.createdAt,
          })),
  }
}

// Same policy mapping as the account licenses page.
const YEARLY_POLICY_ID = '261cb7e2-6e80-476e-98bd-fe7f406f258d'

export function getPolicyPlanName(policyId: string): string {
  return policyId === YEARLY_POLICY_ID ? 'Yearly' : 'Lifetime'
}

/**
 * Badge color classes per display status, matching the account licenses page.
 */
export function getStatusColorClasses(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'text-green-600 bg-green-50'
    case 'expired':
      return 'text-red-600 bg-red-50'
    case 'suspended':
      return 'text-yellow-600 bg-yellow-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}
