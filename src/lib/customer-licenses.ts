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
  if (reference.id) {
    try {
      const license = await licenseClient.getLicenseWithMachines(reference.id)
      return { ...license, status: normalizeLicenseStatus(license.status) }
    } catch (error) {
      if (error instanceof KeygenRequestError && error.status === 404) {
        // The reference points at a license Keygen never had (legacy
        // migrated orders) — that's data, not an incident. Don't render a
        // bogus "unknown" row for it either.
        licenseLogger.warn`License ${reference.id} not found in Keygen; skipping`
        return null
      }
      licenseLogger.error`Failed to fetch license ${reference.id}: ${error}`
    }
  }

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
    } catch (error) {
      licenseLogger.error`Failed to validate license key: ${error}`
    }
  }

  return buildLicensePlaceholder(reference)
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
