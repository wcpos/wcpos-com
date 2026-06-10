import type { LicenseDetail } from '@/types/license'

export type DiscordProEntitlement =
  | { state: 'entitled' }
  | { state: 'not_entitled' }
  | { state: 'unknown' }

export type EntitlementLicense = Pick<LicenseDetail, 'status'> & {
  expiry?: string | null
}

export function evaluateDiscordProEntitlement(
  licenses: EntitlementLicense[],
  now: Date = new Date()
): DiscordProEntitlement {
  let sawUnknown = false

  for (const license of licenses) {
    const status = license.status.toLowerCase()
    if (status === 'unknown') {
      sawUnknown = true
      continue
    }

    if (status !== 'active') continue

    if (!license.expiry) {
      return { state: 'entitled' }
    }

    const expiryTime = new Date(license.expiry).getTime()
    if (Number.isNaN(expiryTime)) {
      sawUnknown = true
      continue
    }

    if (expiryTime > now.getTime()) {
      return { state: 'entitled' }
    }
  }

  if (sawUnknown) return { state: 'unknown' }
  return { state: 'not_entitled' }
}
