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
 * The three-way verdict over a set of licenses, for any feature that must tell
 * "no active license" apart from "can't confirm right now". Downloads fail
 * closed and only care whether the result is `entitled`; the Discord Pro role
 * uses all three states — an `unverifiable` outage must NOT by itself strip an
 * already-held role (CONTEXT.md "Unverifiable (license)", docs/adr/0004). This
 * is the single home for that decision: `entitled` agrees exactly with
 * `hasActiveLicense`, and the unverifiable split is the only addition.
 */
export type LicenseEntitlement = 'entitled' | 'not_entitled' | 'unverifiable'

/**
 * A license whose current state can't be confirmed: an explicitly unverifiable
 * (`unknown`) license, or an active one whose expiry won't parse — we can prove
 * neither that it is in-term nor that it has lapsed.
 */
function isLicenseUnverifiable(license: LicenseLifecycle): boolean {
  if (license.status === 'unknown') return true
  if (license.status === 'active' && license.expiry) {
    return Number.isNaN(new Date(license.expiry).getTime())
  }
  return false
}

/**
 * Resolve a set of licenses to a single entitlement verdict. Any active license
 * wins (`entitled`); otherwise the result is `unverifiable` when any license
 * could not be confirmed, else `not_entitled`. Pass a single-element array for
 * the per-licence question (CONTEXT.md "Entitlement").
 */
export function evaluateLicenseEntitlement(
  licenses: LicenseLifecycle[],
  nowMs: number = Date.now()
): LicenseEntitlement {
  let sawUnverifiable = false
  for (const license of licenses) {
    if (isLicenseActive(license, nowMs)) return 'entitled'
    if (isLicenseUnverifiable(license)) sawUnverifiable = true
  }
  return sawUnverifiable ? 'unverifiable' : 'not_entitled'
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
