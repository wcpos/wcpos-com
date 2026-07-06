import 'server-only'

/**
 * Seller identity printed on order receipts. Static facts live here; the
 * legal registration details (trading name, ABN) come from env so they never
 * need a code change — set RECEIPT_SELLER_NAME / RECEIPT_SELLER_ABN in the
 * deployment environment. When the ABN is unset the receipt omits the ABN
 * line but still prints the not-registered-for-GST statement.
 */
export interface ReceiptSellerFact {
  /** Trading / legal name shown in the receipt footer. */
  name: string
  /** Australian Business Number, or null to omit. */
  abn: string | null
  website: string
  email: string
}

export function getReceiptSeller(): ReceiptSellerFact {
  const name = process.env.RECEIPT_SELLER_NAME?.trim()
  const abn = process.env.RECEIPT_SELLER_ABN?.trim()

  return {
    name: name || 'WCPOS',
    abn: abn || null,
    website: 'wcpos.com',
    email: 'support@wcpos.com',
  }
}
