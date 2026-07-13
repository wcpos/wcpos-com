import {
  billingCountryRequiresPostalCode,
  isBillingCountry,
} from './billing-countries'
import type { BillingAddress } from '@/components/pro/checkout/billing-step'

/**
 * Billing details live on the customer's default billing address in Medusa
 * (`customer_address`) — the single source of truth shared by the profile
 * page, receipts, and checkout prefill. The optional tax registration
 * (ABN/VAT/EIN) rides the same record under `metadata.tax_number`.
 *
 * This module owns both directions of that correspondence so they cannot
 * drift: projecting the saved address into the shapes the UI reads, and
 * normalizing form/checkout submissions into the store-API address patch
 * that writes it back (`upsertDefaultBillingAddress` in medusa-auth.ts).
 */

export interface MedusaCustomerAddress {
  id: string
  address_name?: string | null
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
  is_default_billing?: boolean
  is_default_shipping?: boolean
  metadata?: Record<string, unknown> | null
}

export const TAX_NUMBER_ADDRESS_METADATA_KEY = 'tax_number'

/** What the profile form and receipts render. Country is uppercase ISO-2 for
 * the UI vocabulary (COUNTRY_PROFILES/receipts); Medusa stores it lowercase. */
export interface BillingDetails {
  countryCode: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  taxNumber: string
}

/**
 * The store-API body for the default billing address. `undefined` preserves
 * the saved value, `null` clears it. `tax_number` is split out by the writer
 * into `metadata.tax_number` (merged over the address's existing metadata).
 */
export interface BillingAddressPatch {
  first_name?: string
  last_name?: string
  country_code?: string
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  tax_number?: string | null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * Whether an address satisfies the checkout form's required-field contract.
 * Postal code follows the shared country contract: required only where the
 * selected country's address metadata requires one.
 */
export function isCompleteBillingAddress(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const address = value as Record<string, unknown>
  const requiredFields = ['first_name', 'last_name', 'address_1', 'city']
  const hasRequiredFields = requiredFields.every((field) => {
    const fieldValue = address[field]
    return typeof fieldValue === 'string' && fieldValue.trim().length > 0
  })
  const countryCode = address.country_code
  const normalizedCountryCode =
    typeof countryCode === 'string' ? countryCode.trim() : ''
  const postalCode = address.postal_code
  const hasRequiredPostalCode =
    !billingCountryRequiresPostalCode(normalizedCountryCode) ||
    (typeof postalCode === 'string' && postalCode.trim().length > 0)

  return (
    hasRequiredFields &&
    isBillingCountry(normalizedCountryCode) &&
    hasRequiredPostalCode
  )
}

/**
 * Only an address flagged is_default_billing counts — this is also the write
 * target of upsertDefaultBillingAddress, and falling back to an arbitrary
 * other address would turn a display heuristic into an overwrite of a record
 * this module does not own (e.g. a shipping address).
 */
export function pickDefaultBillingAddress(
  addresses: MedusaCustomerAddress[] | null | undefined
): MedusaCustomerAddress | null {
  return addresses?.find((address) => address.is_default_billing) ?? null
}

/**
 * Whether a patch carries actual address content (not just a country/name).
 * Guards address creation: the profile form always submits a country (the
 * dropdown default) and checkout can submit an empty billing object, and
 * neither should mint a junk default-billing record for a customer who never
 * entered an address.
 */
export function billingPatchHasAddressContent(
  patch: BillingAddressPatch
): boolean {
  return Boolean(
    patch.address_1 ||
      patch.address_2 ||
      patch.city ||
      patch.province ||
      patch.postal_code ||
      patch.tax_number
  )
}

export function billingDetailsFromAddress(
  address: MedusaCustomerAddress | null | undefined
): BillingDetails {
  return {
    countryCode: asString(address?.country_code).toUpperCase(),
    addressLine1: asString(address?.address_1),
    addressLine2: asString(address?.address_2),
    city: asString(address?.city),
    region: asString(address?.province),
    postalCode: asString(address?.postal_code),
    taxNumber: asString(
      address?.metadata?.[TAX_NUMBER_ADDRESS_METADATA_KEY]
    ),
  }
}

/** The pick-then-project pairing every reader shares. */
export function billingDetailsFromCustomer(customer: {
  addresses?: MedusaCustomerAddress[]
}): BillingDetails {
  return billingDetailsFromAddress(pickDefaultBillingAddress(customer.addresses))
}

export interface BillingPrefill {
  address: BillingAddress | null
  taxNumber?: string
}

interface PrefillCustomer {
  first_name?: string
  last_name?: string
  addresses?: MedusaCustomerAddress[]
}

export function billingPrefillFromCustomer(
  customer: PrefillCustomer
): BillingPrefill {
  const saved = pickDefaultBillingAddress(customer.addresses)
  const details = billingDetailsFromAddress(saved)

  // Only a country the customer actually saved — and one the checkout's
  // country list offers — may be asserted into the form. Anything else keeps
  // the form's own default.
  const countryCode =
    details.countryCode && isBillingCountry(details.countryCode)
      ? details.countryCode.toLowerCase()
      : 'us'

  // An all-empty prefill would just override the form's defaults with blanks.
  const address =
    details.addressLine1 ||
    details.addressLine2 ||
    details.city ||
    details.region ||
    details.postalCode
      ? {
          first_name: saved?.first_name || customer.first_name || '',
          last_name: saved?.last_name || customer.last_name || '',
          address_1: details.addressLine1,
          address_2: details.addressLine2,
          city: details.city,
          province: details.region,
          postal_code: details.postalCode,
          country_code: countryCode,
        }
      : null

  return { address, taxNumber: details.taxNumber || undefined }
}

/**
 * One-click renewal may only use an authoritative, complete default billing
 * record. Unlike editable checkout prefill, this never synthesizes a country
 * or accepts a partial address; customer names are the sole fallback.
 */
export function renewalBillingPrefillFromCustomer(
  customer: PrefillCustomer
): BillingPrefill {
  const saved = pickDefaultBillingAddress(customer.addresses)
  if (!saved) return { address: null, taxNumber: undefined }

  const details = billingDetailsFromAddress(saved)
  const address: BillingAddress = {
    first_name:
      asString(saved.first_name).trim() || asString(customer.first_name).trim(),
    last_name:
      asString(saved.last_name).trim() || asString(customer.last_name).trim(),
    address_1: details.addressLine1,
    address_2: details.addressLine2,
    city: details.city,
    province: details.region,
    postal_code: details.postalCode,
    country_code: details.countryCode.toLowerCase(),
  }

  return {
    address: isCompleteBillingAddress(address) ? address : null,
    taxNumber: details.taxNumber || undefined,
  }
}

/**
 * The address patch a confirmed checkout billing submission produces.
 * `taxNumber === undefined` means "field not submitted, preserve saved
 * value"; an empty string means "explicitly cleared". Required address
 * fields are only written when non-empty. Optional fields that checkout
 * submitted are written as null when blank, so clearing them in checkout
 * clears stale saved receipt/profile values too.
 */
export function billingPatchFromCheckout(
  billingAddress: Record<string, unknown>,
  taxNumber: string | undefined
): BillingAddressPatch {
  const trimmed = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined
  const submittedTrimmedOrNull = (key: string) => {
    if (!(key in billingAddress)) return undefined
    const value = billingAddress[key]
    if (typeof value !== 'string') return undefined
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }

  const country = trimmed(billingAddress.country_code)

  return {
    first_name: trimmed(billingAddress.first_name),
    last_name: trimmed(billingAddress.last_name),
    country_code: country ? country.toLowerCase() : undefined,
    address_1: trimmed(billingAddress.address_1),
    address_2: submittedTrimmedOrNull('address_2'),
    city: trimmed(billingAddress.city),
    province: submittedTrimmedOrNull('province'),
    postal_code: submittedTrimmedOrNull('postal_code'),
    tax_number: taxNumber === undefined ? undefined : taxNumber.trim() || null,
  }
}

/**
 * The address patch a profile-form save produces. The form always submits
 * every billing field, so every submitted string is asserted: trimmed value
 * or null (clear). A country outside the billing vocabulary is ignored
 * rather than written.
 */
export function billingPatchFromProfileForm(
  input: unknown
): BillingAddressPatch | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const body = input as Record<string, unknown>

  const submitted = (key: string): string | null | undefined => {
    if (!(key in body)) return undefined
    const value = body[key]
    if (value === null) return null
    if (typeof value !== 'string') return undefined
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }

  const country = submitted('countryCode')
  const patch: BillingAddressPatch = {
    country_code:
      typeof country === 'string' && isBillingCountry(country)
        ? country.toLowerCase()
        : undefined,
    address_1: submitted('addressLine1'),
    address_2: submitted('addressLine2'),
    city: submitted('city'),
    province: submitted('region'),
    postal_code: submitted('postalCode'),
    tax_number: submitted('taxNumber'),
  }

  const hasAnyField = Object.values(patch).some(
    (value) => value !== undefined
  )
  return hasAnyField ? patch : null
}
