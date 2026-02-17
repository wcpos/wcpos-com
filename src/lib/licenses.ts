import type { MedusaOrder } from './medusa-auth'

type RawLicenseEntry = {
  license_id?: string
  licenseId?: string
  id?: string
}

function getLicenseId(entry: RawLicenseEntry): string | null {
  return entry.license_id ?? entry.licenseId ?? entry.id ?? null
}

export function extractLicenseIdsFromOrders(orders: MedusaOrder[]): string[] {
  const ids = new Set<string>()

  for (const order of orders) {
    const licenses = order.metadata?.licenses
    if (!Array.isArray(licenses)) continue

    for (const license of licenses as RawLicenseEntry[]) {
      const licenseId = getLicenseId(license)
      if (licenseId) ids.add(licenseId)
    }
  }

  return Array.from(ids)
}
