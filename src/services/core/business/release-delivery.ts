import 'server-only'

import {
  isReleaseAllowedForLicenses,
  type LicenseLifecycle,
} from '@/lib/license'

/**
 * The minimal release fields entitlement decisions and version selection need.
 * Both the full ProPluginRelease and the projected {version, publishedAt} the
 * account pages build satisfy this, so one module serves every caller.
 */
export interface ReleaseEntitlementFields {
  version: string
  publishedAt: string
}

/**
 * How a caller's entitlement is scoped. This makes the per-licence-vs-union
 * decision EXPLICIT (ADR-0006) instead of implicit in the length of a licence
 * array. A `licence` scope can never pool; an `account` scope is a deliberate,
 * named account-wide union, used only for account download authorization.
 */
export type EntitlementScope =
  | { kind: 'licence'; licence: LicenseLifecycle }
  | { kind: 'account'; licences: LicenseLifecycle[] }

export type ReleaseSelection<T> =
  | { ok: true; release: T }
  | { ok: false; reason: 'not_found' | 'not_entitled' }

const UNKNOWN_LICENCE: LicenseLifecycle = { status: 'unknown', expiry: null }

function scopeLicences(scope: EntitlementScope): LicenseLifecycle[] {
  return scope.kind === 'licence' ? [scope.licence] : scope.licences
}

// Equivalent to pro-downloads' normalizeReleaseVersion; inlined to keep this
// module free of the GitHub adapter import (and route-test mock coupling).
function normalizeVersion(version: string): string {
  return version.replace(/^v/i, '')
}

/**
 * Build a single-licence scope from a plugin `validateLicense` result. The
 * entitlement carries the CANONICAL status straight through; when it is absent
 * the licence is treated as unverifiable (`unknown`), which grants nothing.
 * (Do NOT read `data.status` here — the plugin display vocabulary reuses
 * 'inactive' for suspended licences, which the normalizer would misread.)
 */
export function licenceScopeFromValidation(validation: {
  entitlement?: LicenseLifecycle | null
}): EntitlementScope {
  return { kind: 'licence', licence: validation.entitlement ?? UNKNOWN_LICENCE }
}

/**
 * Annotate every release with this scope's download verdict. Drives the account
 * downloads list and the per-licence / union download pages.
 */
export function resolveEntitledReleases<T extends ReleaseEntitlementFields>(
  releases: T[],
  scope: EntitlementScope,
  nowMs: number = Date.now()
): Array<T & { allowed: boolean }> {
  const licences = scopeLicences(scope)
  return releases.map((release) => ({
    ...release,
    allowed: isReleaseAllowedForLicenses(release, licences, nowMs),
  }))
}

/**
 * Select one release by version WITHIN entitlement. 'latest' resolves to the
 * newest release the scope may download (releases arrive newest-first). Returns
 * a discriminated result so each caller maps `not_found` / `not_entitled` to
 * its own status codes without re-deriving the distinction.
 */
export function selectEntitledRelease<T extends ReleaseEntitlementFields>(
  releases: T[],
  version: string,
  scope: EntitlementScope,
  nowMs: number = Date.now()
): ReleaseSelection<T> {
  const licences = scopeLicences(scope)

  if (version === 'latest') {
    const release = releases.find((candidate) =>
      isReleaseAllowedForLicenses(candidate, licences, nowMs)
    )
    return release
      ? { ok: true, release }
      : { ok: false, reason: 'not_entitled' }
  }

  const normalized = normalizeVersion(version)
  const match = releases.find((candidate) => candidate.version === normalized)
  if (!match) return { ok: false, reason: 'not_found' }
  if (!isReleaseAllowedForLicenses(match, licences, nowMs)) {
    return { ok: false, reason: 'not_entitled' }
  }
  return { ok: true, release: match }
}
