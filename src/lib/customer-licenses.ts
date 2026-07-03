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
    machines: [],
    metadata: {},
    policyId: 'unknown',
    createdAt: new Date().toISOString(),
  }
}

export async function resolveLicenseReference(
  reference: LicenseReference
): Promise<LicenseDetail | null> {
  // A 404 on the stored id means Keygen never had it (legacy migrated
  // orders, or an id superseded by re-issue) — data, not an incident. The
  // key fallback below still runs (a stale id can accompany a live key),
  // but a definitively-missing id must not produce an "unknown" placeholder.
  let idNotFound = false

  if (reference.id) {
    try {
      const license = await licenseClient.getLicenseWithMachines(reference.id)
      return { ...license, status: normalizeLicenseStatus(license.status) }
    } catch (error) {
      if (error instanceof KeygenRequestError && error.status === 404) {
        idNotFound = true
        licenseLogger.warn`License ${reference.id} not found in Keygen; trying key fallback`
      } else {
        licenseLogger.error`Failed to fetch license ${reference.id}: ${error}`
      }
    }
  }

  let keyLookupMissing = false

  if (reference.key) {
    try {
      const validation = await licenseClient.validateLicenseKey(reference.key)
      if (validation.license) {
        return {
          ...validation.license,
          status: normalizeLicenseStatus(validation.license.status),
          machines: [],
        }
      }
      keyLookupMissing = true
    } catch (error) {
      licenseLogger.error`Failed to validate license key: ${error}`
    }
  }

  return idNotFound && (!reference.key || keyLookupMissing)
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
