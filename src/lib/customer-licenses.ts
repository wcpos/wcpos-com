import type { LicenseDetail } from '@/types/license'
import {
  getAllCustomerOrders,
  getCustomer,
  type MedusaCustomer,
  type MedusaOrder,
} from '@/lib/medusa-auth'
import {
  extractLicenseReferencesFromOrders,
  type LicenseReference,
} from '@/lib/licenses'
import { listAdminCustomerOrders } from '@/lib/discord/medusa-admin'
import { licenseClient } from '@/services/core/external/license-client'
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

export async function getResolvedCustomerLicenses(customer?: MedusaCustomer): Promise<{
  authenticated: boolean
  licenses: LicenseDetail[]
}> {
  const resolvedCustomer = customer ?? (await getCustomer())
  if (!resolvedCustomer) {
    return { authenticated: false, licenses: [] }
  }

  const orders = customer
    ? await listAdminCustomerOrders(resolvedCustomer.id)
    : await getAllCustomerOrders()

  return {
    authenticated: true,
    licenses: await getResolvedLicensesFromOrders(orders),
  }
}
