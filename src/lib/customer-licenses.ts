import 'server-only'
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

export async function getResolvedLicensesFromOrders(
  orders: MedusaOrder[]
): Promise<LicenseDetail[]> {
  const references = extractLicenseReferencesFromOrders(orders)
  const uniqueReferences = Array.from(
    new Map(
      references.map((reference) => [
        reference.id ? `id:${reference.id}` : `key:${reference.key}`,
        reference,
      ])
    ).values()
  )

  const licenses: Array<LicenseDetail | null> = []
  for (let index = 0; index < uniqueReferences.length; index += LICENSE_LOOKUP_BATCH_SIZE) {
    const batch = uniqueReferences.slice(index, index + LICENSE_LOOKUP_BATCH_SIZE)
    licenses.push(...(await Promise.all(batch.map(resolveLicenseReference))))
  }

  return licenses.filter((license): license is LicenseDetail => Boolean(license))
}

export async function getResolvedCustomerLicenses(): Promise<{
  authenticated: boolean
  licenses: LicenseDetail[]
}> {
  const customer = await getCustomer()
  if (!customer) {
    return { authenticated: false, licenses: [] }
  }

  const orders = await getAllOrders()

  return {
    authenticated: true,
    licenses: await getResolvedLicensesFromOrders(orders),
  }
}
