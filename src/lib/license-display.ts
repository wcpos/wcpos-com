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

const DAY_MS = 24 * 60 * 60 * 1000

/** How close to expiry a license gets before we surface a renewal warning. */
export const EXPIRY_WARNING_WINDOW_DAYS = 30

/** Minimal license shape needed for expiry-warning decisions. */
export interface LicenseExpiryInput {
  status: string
  expiry: string | null
}

/**
 * True when this license displays as active but its expiry falls inside the
 * warning window. Yearly licenses renew by manual re-purchase (no
 * auto-billing), so this drives the "renew to keep receiving updates"
 * notices. Lifetime licenses (null expiry) never expire, and licenses that
 * are already expired/suspended/unknown get their own messaging.
 */
export function isLicenseExpiringSoon(
  license: LicenseExpiryInput,
  nowMs: number,
  windowDays: number = EXPIRY_WARNING_WINDOW_DAYS
): boolean {
  if (!license.expiry) return false
  if (getLicenseDisplayStatus(license.status, license.expiry, nowMs) !== 'active') {
    return false
  }
  const expiryTime = new Date(license.expiry).getTime()
  if (Number.isNaN(expiryTime)) return false
  return expiryTime - nowMs <= windowDays * DAY_MS
}

/**
 * Account-level expiry warning: returns the expiry (ISO string) at which
 * update access lapses, when that moment falls inside the warning window.
 *
 * Returns null when nothing is about to lapse — including when an active
 * lifetime license (null expiry) keeps update access open forever, or when
 * a later-expiring active license extends access beyond the window.
 */
export function getExpiringSoonExpiry(
  licenses: LicenseExpiryInput[],
  nowMs: number,
  windowDays: number = EXPIRY_WARNING_WINDOW_DAYS
): string | null {
  let latest: { time: number; expiry: string } | null = null

  for (const license of licenses) {
    if (
      getLicenseDisplayStatus(license.status, license.expiry, nowMs) !== 'active'
    ) {
      continue
    }
    // An active lifetime license means update access never lapses.
    if (!license.expiry) return null
    const time = new Date(license.expiry).getTime()
    if (Number.isNaN(time)) continue
    if (!latest || time > latest.time) {
      latest = { time, expiry: license.expiry }
    }
  }

  if (!latest) return null
  return latest.time - nowMs <= windowDays * DAY_MS ? latest.expiry : null
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
