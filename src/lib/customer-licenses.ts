import type { LicenseDetail } from '@/types/license'
import { getAllOrders } from '@/lib/customer-orders'
import { getCustomer } from '@/lib/medusa-auth'
import {
  extractLicenseReferencesFromOrders,
  type LicenseReference,
} from '@/lib/licenses'
import { normalizeLicenseStatus } from '@/lib/license-status'
import { licenseClient } from '@/services/core/external/license-client'
import { licenseLogger } from '@/lib/logger'

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

async function resolveLicenseReference(
  reference: LicenseReference
): Promise<LicenseDetail | null> {
  // Keygen statuses are normalized to the canonical vocabulary here, at the
  // account boundary, so everything downstream (entitlement, badges, banners)
  // only ever sees active/expired/suspended/revoked/unknown.
  if (reference.id) {
    try {
      const license = await licenseClient.getLicenseWithMachines(reference.id)
      return { ...license, status: normalizeLicenseStatus(license.status) }
    } catch (error) {
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

export async function getResolvedCustomerLicenses(): Promise<{
  authenticated: boolean
  licenses: LicenseDetail[]
}> {
  const customer = await getCustomer()
  if (!customer) {
    return { authenticated: false, licenses: [] }
  }

  const orders = await getAllOrders()
  const references = extractLicenseReferencesFromOrders(orders)

  const licenses = await Promise.all(
    references.map((reference) => resolveLicenseReference(reference))
  )

  return {
    authenticated: true,
    licenses: licenses.filter((license): license is LicenseDetail => Boolean(license)),
  }
}
