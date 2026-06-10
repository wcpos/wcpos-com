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
