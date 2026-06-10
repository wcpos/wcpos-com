/**
 * Presentation rule for license statuses, for the account UI.
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
