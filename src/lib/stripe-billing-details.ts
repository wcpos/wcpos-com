import type { StripeExpressCheckoutElementConfirmEvent } from '@stripe/stripe-js'
import type { BillingAddress } from '@/components/pro/checkout/billing-step'

function trimmed(value: string | null | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized || undefined
}

export function stripeBillingDetailsFromCheckout(
  address: BillingAddress,
  email?: string | null
) {
  const normalizedEmail = trimmed(email)
  const line2 = trimmed(address.address_2)
  const state = trimmed(address.province)
  const postalCode = trimmed(address.postal_code)

  return {
    name: [address.first_name.trim(), address.last_name.trim()].join(' '),
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
    address: {
      line1: address.address_1.trim(),
      ...(line2 ? { line2 } : {}),
      city: address.city.trim(),
      ...(state ? { state } : {}),
      ...(postalCode ? { postal_code: postalCode } : {}),
      country: address.country_code.trim().toUpperCase(),
    },
  }
}

export type StripeCheckoutBillingDetails = ReturnType<typeof stripeBillingDetailsFromCheckout>

export function stripeBillingDetailsWithWalletPrecedence(
  fallback: StripeCheckoutBillingDetails,
  wallet: StripeExpressCheckoutElementConfirmEvent['billingDetails']
): StripeCheckoutBillingDetails {
  if (!wallet) return fallback

  const email = trimmed(wallet.email) ?? fallback.email
  const line2 = trimmed(wallet.address.line2) ?? fallback.address.line2
  const state = trimmed(wallet.address.state) ?? fallback.address.state
  const postalCode =
    trimmed(wallet.address.postal_code) ?? fallback.address.postal_code

  return {
    name: trimmed(wallet.name) ?? fallback.name,
    ...(email ? { email } : {}),
    address: {
      line1: trimmed(wallet.address.line1) ?? fallback.address.line1,
      ...(line2 ? { line2 } : {}),
      city: trimmed(wallet.address.city) ?? fallback.address.city,
      ...(state ? { state } : {}),
      ...(postalCode ? { postal_code: postalCode } : {}),
      country: (trimmed(wallet.address.country) ?? fallback.address.country).toUpperCase(),
    },
  }
}
