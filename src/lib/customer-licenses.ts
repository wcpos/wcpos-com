import type { LicenseDetail } from '@/types/license'
import { getAllCustomerOrders, getCustomer } from '@/lib/medusa-auth'
import {
  extractLicenseReferencesFromOrders,
  type LicenseReference,
} from '@/lib/licenses'
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
  if (reference.id) {
    try {
      return await licenseClient.getLicenseWithMachines(reference.id)
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
          status: validation.license.status.toLowerCase(),
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

  const orders = await getAllCustomerOrders()
  const references = extractLicenseReferencesFromOrders(orders)

  const licenses = await Promise.all(
    references.map((reference) => resolveLicenseReference(reference))
  )

  return {
    authenticated: true,
    licenses: licenses.filter((license): license is LicenseDetail => Boolean(license)),
  }
}
