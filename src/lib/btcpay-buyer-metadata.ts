import { isCompleteBillingAddress } from './billing-profile'

export interface BtcpayBuyerMetadata {
  buyerName: string
  buyerEmail: string
  buyerCompany?: string
  buyerAddress1: string
  buyerAddress2?: string
  buyerCity: string
  buyerState?: string
  buyerZip?: string
  buyerCountry: string
}

export interface BtcpaySessionData {
  locale?: string
  metadata: BtcpayBuyerMetadata
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function btcpaySessionData(
  providerId: string,
  cart: unknown
): BtcpaySessionData | undefined {
  if (
    providerId !== 'pp_btcpay_btcpay' ||
    !cart ||
    typeof cart !== 'object' ||
    Array.isArray(cart)
  ) {
    return undefined
  }

  const cartRecord = cart as Record<string, unknown>
  if (!isCompleteBillingAddress(cartRecord.billing_address)) return undefined

  const email = trimmedString(cartRecord.email)
  if (!email) return undefined

  const address = cartRecord.billing_address as Record<string, unknown>
  const firstName = trimmedString(address.first_name)
  const lastName = trimmedString(address.last_name)
  const optionalMetadata = {
    buyerCompany: trimmedString(address.company),
    buyerAddress2: trimmedString(address.address_2),
    buyerState: trimmedString(address.province),
    buyerZip: trimmedString(address.postal_code),
  }
  const metadata: BtcpayBuyerMetadata = {
    buyerName: [firstName, lastName].filter(Boolean).join(' '),
    buyerEmail: email,
    buyerAddress1: trimmedString(address.address_1),
    buyerCity: trimmedString(address.city),
    buyerCountry: trimmedString(address.country_code).toUpperCase(),
    ...(optionalMetadata.buyerCompany && {
      buyerCompany: optionalMetadata.buyerCompany,
    }),
    ...(optionalMetadata.buyerAddress2 && {
      buyerAddress2: optionalMetadata.buyerAddress2,
    }),
    ...(optionalMetadata.buyerState && {
      buyerState: optionalMetadata.buyerState,
    }),
    ...(optionalMetadata.buyerZip && { buyerZip: optionalMetadata.buyerZip }),
  }

  const cartMetadata = cartRecord.metadata
  const locale =
    cartMetadata && typeof cartMetadata === 'object' && !Array.isArray(cartMetadata)
      ? trimmedString((cartMetadata as Record<string, unknown>).locale)
      : ''

  return {
    ...(locale && { locale }),
    metadata,
  }
}
