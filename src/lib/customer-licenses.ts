import 'server-only'
import { cache } from 'react'
import type { LicenseDetail } from '@/types/license'
import {
  getAllOrders,
  type MedusaOrder,
} from '@/lib/customer-orders'
import { getCustomer } from '@/lib/medusa-auth'
import {
  extractLicenseReferencesFromOrders,
  type LicenseReference,
} from '@/lib/licenses'
import { normalizeLicenseStatus } from '@/lib/license-status'
import {
  licenseClient,
  KeygenRequestError,
} from '@/services/core/external/license-client'
import { licenseLogger } from '@/lib/logger'

const LICENSE_LOOKUP_BATCH_SIZE = 10

export interface ResolvedLicenseSnapshot {
  licenses: LicenseDetail[]
  complete: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function legacyCustomerLicenseReferences(customer: {
  metadata?: Record<string, unknown> | null
}): LicenseReference[] {
  const metadata = isRecord(customer.metadata) ? customer.metadata : {}
  const key = stringOrNull(metadata.wc_master_api_key)
  return key ? [{ key }] : []
}

function buildLicensePlaceholder(reference: LicenseReference): LicenseDetail | null {
  if (!reference.key) return null

  return {
    id: reference.id ?? `meta_${Buffer.from(reference.key).toString('base64url')}`,
    key: reference.key,
    status: 'unknown',
    expiry: null,
    maxMachines: 0,
    activationCount: 0,
    machines: [],
    metadata: {},
    policyId: 'unknown',
    createdAt: new Date().toISOString(),
  }
}

/**
 * The activation COUNT on `base` is already authoritative (from the public
 * validate-key response). Layer on the machine detail LIST only when a Keygen
 * token is configured — it powers the machine-management UI. When auth is
 * absent or the call fails, the list stays empty but the count is untouched
 * (correct count, no detail rows) — never a wrong "0".
 *
 * Uses `base.id` — the canonical Keygen id from validate-key — so key-only and
 * re-issued (stale-id) references still fetch the right machine list.
 */
async function enrichWithMachineList(base: LicenseDetail): Promise<LicenseDetail> {
  if (!base.id || !licenseClient.canManageMachines()) {
    return base
  }
  try {
    const machines = await licenseClient.getLicenseMachines(base.id)
    // Keep the authoritative `activationCount` from validate-key. `machines` is
    // only the detail list, and getLicenseMachines returns a single (paginated)
    // page — using its length as the count could UNDERCOUNT a license with more
    // machines than one page. The list is for display/deactivation only.
    return { ...base, machines }
  } catch (error) {
    licenseLogger.warn`Machine list unavailable for license ${base.id}; showing count only: ${error}`
    return base
  }
}

export async function resolveLicenseReference(
  reference: LicenseReference
): Promise<LicenseDetail | null> {
  // Primary path: the PUBLIC validate-key endpoint. It returns status, expiry,
  // maxMachines, and the authoritative activation COUNT with NO admin token, so
  // activation counts are correct even when KEYGEN_API_TOKEN is unset. The
  // machine detail list is layered on afterwards only when auth is available.
  // `keyDefinitivelyMissing` = validate-key ran and reported no such license
  // (safe to drop). A THROWN validate-key error is transient and must NOT drop
  // a possibly-real license — it stays false so the placeholder survives.
  let keyDefinitivelyMissing = false
  if (reference.key) {
    try {
      const validation = await licenseClient.validateLicenseKey(reference.key)
      if (validation.license) {
        const base: LicenseDetail = {
          ...validation.license,
          status: normalizeLicenseStatus(validation.license.status),
          machines: [],
        }
        return await enrichWithMachineList(base)
      }
      keyDefinitivelyMissing = true
    } catch (error) {
      licenseLogger.error`Failed to validate license key: ${error}`
    }
  }

  // Fallback: authed lookup by id, for legacy id-only references or a key that
  // didn't resolve. Requires KEYGEN_API_TOKEN; without it getLicenseWithMachines
  // throws KeygenAuthNotConfiguredError, handled here as "unresolved". A 404
  // means Keygen never had the id (legacy migration) — data, not an incident.
  let idNotFound = false
  if (reference.id) {
    try {
      const license = await licenseClient.getLicenseWithMachines(reference.id)
      return { ...license, status: normalizeLicenseStatus(license.status) }
    } catch (error) {
      if (error instanceof KeygenRequestError && error.status === 404) {
        idNotFound = true
        licenseLogger.warn`License ${reference.id} not found in Keygen`
      } else {
        licenseLogger.error`Failed to fetch license ${reference.id}: ${error}`
      }
    }
  }

  // Drop to null ONLY when the id is definitively gone (404) AND the key is
  // definitively absent (no key, or validate-key said not-found). A transient
  // key/id error keeps the "unknown" placeholder rather than hiding a license.
  return idNotFound && (!reference.key || keyDefinitivelyMissing)
    ? null
    : buildLicensePlaceholder(reference)
}

function referenceKey(reference: LicenseReference): string | null {
  return reference.key ? `key:${reference.key}` : null
}

function referenceId(reference: LicenseReference): string | null {
  return reference.id ? `id:${reference.id}` : null
}

function findExistingReferenceIdentity(
  references: Map<string, LicenseReference>,
  reference: LicenseReference
): string | undefined {
  const keyIdentity = referenceKey(reference)
  if (keyIdentity && references.has(keyIdentity)) return keyIdentity

  const idIdentity = referenceId(reference)
  if (idIdentity && references.has(idIdentity)) return idIdentity

  for (const [identity, existing] of references.entries()) {
    if (reference.key && existing.key === reference.key) return identity
    if (reference.id && existing.id === reference.id) return identity
  }

  return undefined
}

function canonicalReferenceIdentity(reference: LicenseReference): string | null {
  return referenceKey(reference) ?? referenceId(reference)
}

function mergeLicenseReferences(
  references: LicenseReference[]
): LicenseReference[] {
  const uniqueReferences = new Map<string, LicenseReference>()

  for (const reference of references) {
    const existingIdentity = findExistingReferenceIdentity(
      uniqueReferences,
      reference
    )
    const existing = existingIdentity
      ? uniqueReferences.get(existingIdentity)
      : undefined

    if (
      existing?.key &&
      reference.key === existing.key &&
      existing.id &&
      reference.id &&
      existing.id !== reference.id
    ) {
      // Same key but different ids: keep both references so id fallback can
      // still try the alternate id if validate-key is temporarily unavailable.
      uniqueReferences.set(`id:${reference.id}`, reference)
      continue
    }

    const merged = existing
      ? {
          ...existing,
          id: existing.id ?? reference.id,
          key: existing.key ?? reference.key,
        }
      : reference
    const canonicalIdentity = canonicalReferenceIdentity(merged)

    if (!canonicalIdentity) continue
    if (existingIdentity && existingIdentity !== canonicalIdentity) {
      uniqueReferences.delete(existingIdentity)
    }
    uniqueReferences.set(canonicalIdentity, merged)
  }

  return Array.from(uniqueReferences.values())
}

function licenseIdentity(license: LicenseDetail): string {
  return license.key ? `key:${license.key}` : `id:${license.id}`
}

function preferResolvedLicense(
  existing: LicenseDetail,
  next: LicenseDetail
): LicenseDetail {
  if (existing.status === 'unknown' && next.status !== 'unknown') return next
  return existing
}

function uniqueResolvedLicenses(licenses: LicenseDetail[]): LicenseDetail[] {
  const uniqueLicenses = new Map<string, LicenseDetail>()

  for (const license of licenses) {
    const identity = licenseIdentity(license)
    const existing = uniqueLicenses.get(identity)
    uniqueLicenses.set(
      identity,
      existing ? preferResolvedLicense(existing, license) : license
    )
  }

  return Array.from(uniqueLicenses.values())
}

export async function getResolvedLicenseSnapshotFromOrders(
  orders: MedusaOrder[],
  additionalReferences: LicenseReference[] = []
): Promise<ResolvedLicenseSnapshot> {
  const references = [
    ...extractLicenseReferencesFromOrders(orders),
    ...additionalReferences,
  ]
  const uniqueReferences = mergeLicenseReferences(references)

  const resolvedReferences: Array<LicenseDetail | null> = []
  for (
    let index = 0;
    index < uniqueReferences.length;
    index += LICENSE_LOOKUP_BATCH_SIZE
  ) {
    const batch = uniqueReferences.slice(index, index + LICENSE_LOOKUP_BATCH_SIZE)
    resolvedReferences.push(
      ...(await Promise.all(batch.map(resolveLicenseReference)))
    )
  }

  const licenses = uniqueResolvedLicenses(
    resolvedReferences.filter((license): license is LicenseDetail =>
      Boolean(license)
    )
  )

  return {
    licenses,
    complete:
      resolvedReferences.every(Boolean) &&
      licenses.every((license) => license.status !== 'unknown'),
  }
}

export async function getResolvedLicensesFromOrders(
  orders: MedusaOrder[],
  additionalReferences: LicenseReference[] = []
): Promise<LicenseDetail[]> {
  return (
    await getResolvedLicenseSnapshotFromOrders(orders, additionalReferences)
  ).licenses
}

/**
 * Wrapped in React `cache()` so the account layout's expiry banner and the
 * licenses page share a single orders+Keygen resolve within one request
 * (both render on a full load of /account/licenses).
 */
export const getResolvedCustomerLicenses = cache(
  async (): Promise<{
    authenticated: boolean
    licenses: LicenseDetail[]
  }> => {
    const customer = await getCustomer()
    if (!customer) {
      return { authenticated: false, licenses: [] }
    }

    const orders = await getAllOrders()

    return {
      authenticated: true,
      licenses: await getResolvedLicensesFromOrders(
        orders,
        legacyCustomerLicenseReferences(customer)
      ),
    }
  }
)
