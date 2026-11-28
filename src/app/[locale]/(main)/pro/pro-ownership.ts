import 'server-only'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { licenseLogger } from '@/lib/logger'
import { getPlanByPolicyId } from '@/lib/plans'

export interface ProOwnership {
  /** Expiry of the visitor's running Yearly licence; null when none runs or they hold Lifetime. */
  yearlyUntil: string | null
}

/**
 * Whether the signed-in visitor already holds a Pro licence, for the buy
 * box's owner notice. Never throws: a failed lookup sells as to anyone.
 */
export async function getProOwnership(): Promise<ProOwnership | null> {
  try {
    const { authenticated, licenses } = await getResolvedCustomerLicenses()
    if (!authenticated) return null

    const held = licenses.filter(
      (license) => license.status !== 'revoked' && license.status !== 'suspended'
    )
    if (held.length === 0) return null

    const plans = held.map((license) => getPlanByPolicyId(license.policyId)?.id)
    if (plans.includes('lifetime')) return { yearlyUntil: null }

    // Read after the request-scoped lookup above (Cache Components rule).
    const now = Date.now()
    const running = held
      .filter((license, index) => plans[index] === 'yearly' && license.expiry)
      .map((license) => license.expiry as string)
      .filter((expiry) => Date.parse(expiry) > now)
      .sort((a, b) => Date.parse(a) - Date.parse(b))
    return { yearlyUntil: running.at(-1) ?? null }
  } catch (error) {
    licenseLogger.error`Pro owner lookup failed on /pro: ${error}`
    return null
  }
}
