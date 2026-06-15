import type { CanonicalLicenseStatus } from '@/lib/license-status'

const DAY_MS = 24 * 60 * 60 * 1000

/** How close to expiry a license gets before we surface a renewal warning. */
export const EXPIRY_WARNING_WINDOW_DAYS = 30

/**
 * The canonical lifecycle facts every license question is answered from.
 * `status` is ALWAYS canonical (CONTEXT.md) — normalization happens once, at
 * the Keygen adapter seam (license-client mapLicenseData), never here.
 * `LicenseDetail` and the plugin `entitlement` object both satisfy this shape.
 */
export interface LicenseLifecycle {
  status: CanonicalLicenseStatus
  expiry: string | null
}

/** Minimal release shape for entitlement decisions (structural typing). */
export interface EntitledRelease {
  publishedAt: string
}

/**
 * Display status for the account UI. A canonical-active license whose expiry
 * has already passed presents as `expired`, matching download entitlement.
 * Unparseable expiry fails closed (treated as expired).
 */
export function getLicenseDisplayStatus(
  license: LicenseLifecycle,
  nowMs: number
): CanonicalLicenseStatus {
  if (license.status === 'active' && license.expiry) {
    const expiryTime = new Date(license.expiry).getTime()
    if (Number.isNaN(expiryTime) || expiryTime < nowMs) {
      return 'expired'
    }
  }
  return license.status
}

/** True when the license grants entitlement right now. */
export function isLicenseActive(
  license: LicenseLifecycle,
  nowMs: number
): boolean {
  if (license.status !== 'active') return false
  if (!license.expiry) return true
  return new Date(license.expiry).getTime() >= nowMs
}

export function hasActiveLicense(
  licenses: LicenseLifecycle[],
  nowMs: number = Date.now()
): boolean {
  return licenses.some((license) => isLicenseActive(license, nowMs))
}

/**
 * Latest expiry (ISO string) across active/expired licenses — the only states
 * that grant expiry-based access. Suspended and revoked grant nothing because
 * those states only occur deliberately (refund, chargeback); see docs/adr/0001.
 * Returns null when none qualify.
 */
export function getLatestEntitledExpiry(
  licenses: LicenseLifecycle[]
): string | null {
  let latest: { time: number; expiry: string } | null = null
  for (const license of licenses) {
    if (license.status !== 'active' && license.status !== 'expired') continue
    if (!license.expiry) continue
    const time = new Date(license.expiry).getTime()
    if (Number.isNaN(time)) continue
    if (!latest || time > latest.time) {
      latest = { time, expiry: license.expiry }
    }
  }
  return latest ? latest.expiry : null
}

/**
 * Whether a release is downloadable for a set of licenses. Any active license
 * grants every release; otherwise access is decided per release by comparing
 * its publish date to the latest expiry across active/expired licenses.
 */
export function isReleaseAllowedForLicenses(
  release: EntitledRelease,
  licenses: LicenseLifecycle[],
  nowMs: number = Date.now()
): boolean {
  if (hasActiveLicense(licenses, nowMs)) return true
  const latest = getLatestEntitledExpiry(licenses)
  if (!latest) return false
  return new Date(release.publishedAt).getTime() <= new Date(latest).getTime()
}

/**
 * True when this license displays as active but its expiry falls inside the
 * warning window. Drives the "renew to keep receiving updates" notices.
 * Lifetime licenses (null expiry) never expire; already-expired/suspended/
 * unknown licenses get their own messaging.
 */
export function isLicenseExpiringSoon(
  license: LicenseLifecycle,
  nowMs: number,
  windowDays: number = EXPIRY_WARNING_WINDOW_DAYS
): boolean {
  if (!license.expiry) return false
  if (getLicenseDisplayStatus(license, nowMs) !== 'active') return false
  const expiryTime = new Date(license.expiry).getTime()
  if (Number.isNaN(expiryTime)) return false
  return expiryTime - nowMs <= windowDays * DAY_MS
}

/**
 * Account-level expiry warning: the expiry (ISO string) at which update access
 * lapses, when that moment falls inside the warning window. Returns null when
 * nothing is about to lapse — including when an active lifetime license keeps
 * update access open forever, or a later-expiring active license extends it.
 */
export function getExpiringSoonExpiry(
  licenses: LicenseLifecycle[],
  nowMs: number,
  windowDays: number = EXPIRY_WARNING_WINDOW_DAYS
): string | null {
  let latest: { time: number; expiry: string } | null = null
  for (const license of licenses) {
    if (getLicenseDisplayStatus(license, nowMs) !== 'active') continue
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

export interface DownloadAccessSummary {
  hasActiveLicense: boolean
  latestExpiry: string | null
  expiryHasPassed: boolean
  suspendedCount: number
  revokedCount: number
  unknownCount: number
}

/**
 * One-pass diagnosis for the downloads page: enough to explain WHY a release
 * is or isn't available (active vs expired vs suspended vs unverifiable).
 * Replaces the inline mirror that previously lived in downloads/page.tsx.
 */
export function summarizeDownloadAccess(
  licenses: LicenseLifecycle[],
  nowMs: number
): DownloadAccessSummary {
  const hasActive = hasActiveLicense(licenses, nowMs)
  const hasActiveLifetime = licenses.some(
    (license) => license.status === 'active' && license.expiry === null
  )
  const latestExpiry = hasActiveLifetime ? null : getLatestEntitledExpiry(licenses)
  const latestExpiryMs = latestExpiry ? new Date(latestExpiry).getTime() : null
  return {
    hasActiveLicense: hasActive,
    latestExpiry,
    expiryHasPassed: latestExpiryMs !== null && latestExpiryMs < nowMs,
    suspendedCount: licenses.filter((l) => l.status === 'suspended').length,
    revokedCount: licenses.filter((l) => l.status === 'revoked').length,
    unknownCount: licenses.filter((l) => l.status === 'unknown').length,
  }
}
