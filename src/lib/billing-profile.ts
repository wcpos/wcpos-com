import { readAccountProfileMetadataWithPresence } from './customer-profile-metadata'
import { isBillingCountry } from './billing-countries'
import type { BillingAddress } from '@/components/pro/checkout/billing-step'

/**
 * The two halves of the checkout↔profile correspondence live together here
 * so they cannot drift: what the billing form prefills FROM the profile
 * (account_profile metadata — the same source receipts read) and what a
 * confirmed billing submission writes BACK to it.
 */

export interface BillingPrefill {
  address: BillingAddress | null
  taxNumber?: string
}

interface PrefillCustomer {
  first_name?: string
  last_name?: string
  metadata?: Record<string, unknown>
}

export function billingPrefillFromCustomer(
  customer: PrefillCustomer
): BillingPrefill {
  const { profile, hasCountryCode } =
    readAccountProfileMetadataWithPresence(customer.metadata)

  // The reader defaults countryCode to 'US'; only a country the customer
  // actually saved — and one the checkout's country list offers — may be
  // asserted into the form. Anything else keeps the form's own default.
  const countryCode = hasCountryCode && isBillingCountry(profile.countryCode)
    ? profile.countryCode.toLowerCase()
    : 'us'

  // An all-empty prefill would just override the form's defaults with blanks.
  const address =
    profile.addressLine1 ||
    profile.addressLine2 ||
    profile.city ||
    profile.region ||
    profile.postalCode
      ? {
          first_name: customer.first_name ?? '',
          last_name: customer.last_name ?? '',
          address_1: profile.addressLine1,
          address_2: profile.addressLine2 || undefined,
          city: profile.city,
          province: profile.region || undefined,
          postal_code: profile.postalCode,
          country_code: countryCode,
        }
      : null

  return { address, taxNumber: profile.taxNumber || undefined }
}

/**
 * The account_profile patch a confirmed billing submission produces.
 * `taxNumber === undefined` means "field not submitted, preserve saved
 * value"; an empty string means "explicitly cleared" (the merge maps it to
 * null, which clears the profile field). Address fields are only written
 * when non-empty — checkout never blanks parts of a saved address.
 */
export function profilePatchFromBillingAddress(
  billingAddress: Record<string, unknown>,
  taxNumber: string | undefined
): Record<string, unknown> {
  const trimmed = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined

  const country = trimmed(billingAddress.country_code)

  return {
    countryCode: country ? country.toUpperCase() : undefined,
    addressLine1: trimmed(billingAddress.address_1),
    addressLine2: trimmed(billingAddress.address_2),
    city: trimmed(billingAddress.city),
    region: trimmed(billingAddress.province),
    postalCode: trimmed(billingAddress.postal_code),
    taxNumber,
  }
}
