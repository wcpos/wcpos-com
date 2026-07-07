import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { getExpiringSoonExpiry } from '@/lib/license'
import { ExpiryBannerClient } from './expiry-banner-client'

/**
 * Account-wide expiry banner (Phase 5) — shown across every account page when
 * the customer's Pro update access lapses within the 30-day warning window.
 *
 * Detection reuses the same helpers as the licenses page and the Phase 4
 * reminder emails (`getExpiringSoonExpiry`), so all three agree on "expiring
 * soon". Only yearly licences expire; an active lifetime licence keeps update
 * access open forever and suppresses the banner.
 */
export async function AccountExpiryBanner() {
  // Read request data (cookies, via the customer lookup inside the licence
  // resolve) before touching the clock — the Cache Components ordering rule the
  // licenses page follows too.
  const { authenticated, licenses } = await getResolvedCustomerLicenses()
  if (!authenticated) return null

  // Request data (cookies) was read above before the clock, matching the
  // licenses page's Cache Components ordering.
  const nowMs = new Date().getTime()
  const expiry = getExpiringSoonExpiry(licenses, nowMs)
  if (!expiry) return null

  return (
    <ExpiryBannerClient
      expiry={expiry}
      renewHref="/pro/checkout?product=wcpos-pro-yearly"
    />
  )
}
