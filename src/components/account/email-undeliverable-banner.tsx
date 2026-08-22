import { getCustomer } from '@/lib/medusa-auth'
import { readEmailDeliveryFailure } from '@/lib/email-delivery-status'
import { UndeliverableBannerClient } from './undeliverable-banner-client'

/**
 * Account-wide notice for a customer we can no longer reach by email.
 *
 * The flag is set when a transactional email permanently bounces. That
 * customer is still signed in and can still read this page — which is the
 * only channel left to tell them, since every email we send them vanishes.
 * Left alone they would find out at the worst possible moment: a password
 * reset that never arrives.
 *
 * Cleared by the backend once the address actually changes, so the banner
 * disappears on its own.
 */
export async function EmailUndeliverableBanner() {
  const customer = await getCustomer()
  if (!customer) return null

  const failure = readEmailDeliveryFailure(customer.metadata)
  if (!failure) return null

  return (
    <UndeliverableBannerClient email={failure.email || customer.email} />
  )
}
