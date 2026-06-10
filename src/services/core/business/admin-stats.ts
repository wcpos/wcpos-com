import 'server-only'

import { licenseClient } from '@/services/core/external/license-client'
import { getLicenseDisplayStatus } from '@/lib/license-display'
import type { LicenseDetail } from '@/types/license'

/**
 * Admin dashboard statistics, aggregated from the Keygen CE API.
 *
 * Keygen's list endpoints are paginated with no total counts in CE, so we
 * page through results with a hard cap. When the cap is hit, `truncated`
 * is true and the totals are lower bounds.
 */

export type RecentLicense = Omit<LicenseDetail, 'machines'> & {
  /** Presentation status (lowercase, active-past-expiry shown as expired). */
  displayStatus: string
}

export interface LicenseStats {
  totalLicenses: number
  byStatus: Record<string, number>
  totalMachines: number
  recentLicenses: RecentLicense[]
  truncated: boolean
}

const PAGE_SIZE = 100
const MAX_PAGES = 10
const RECENT_COUNT = 5

export async function getLicenseStats(
  now: Date = new Date()
): Promise<LicenseStats> {
  const nowMs = now.getTime()

  let totalLicenses = 0
  const byStatus: Record<string, number> = {}
  let recentLicenses: RecentLicense[] = []
  let licensesTruncated = false

  async function pageLicenses() {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const result = await licenseClient.listLicenses(page, PAGE_SIZE)

      if (page === 1) {
        // Keygen returns newest-first by default.
        recentLicenses = result.items.slice(0, RECENT_COUNT).map((license) => ({
          ...license,
          displayStatus: getLicenseDisplayStatus(
            license.status,
            license.expiry,
            nowMs
          ),
        }))
      }

      totalLicenses += result.items.length
      for (const license of result.items) {
        const status = getLicenseDisplayStatus(
          license.status,
          license.expiry,
          nowMs
        )
        byStatus[status] = (byStatus[status] ?? 0) + 1
      }

      if (!result.hasNextPage) return
    }
    licensesTruncated = true
  }

  let totalMachines = 0
  let machinesTruncated = false

  async function pageMachines() {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const result = await licenseClient.listMachines(page, PAGE_SIZE)
      totalMachines += result.items.length
      if (!result.hasNextPage) return
    }
    machinesTruncated = true
  }

  await Promise.all([pageLicenses(), pageMachines()])

  return {
    totalLicenses,
    byStatus,
    totalMachines,
    recentLicenses,
    truncated: licensesTruncated || machinesTruncated,
  }
}
