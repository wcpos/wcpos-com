import { NextRequest, NextResponse } from 'next/server'
import { storeCartErrorResponse } from '@/lib/store-cart-errors'
import { getCart } from '@/services/core/external/medusa-client'
import { getCustomer } from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import type { MedusaCart } from '@/types/medusa'

/**
 * The lifecycle a BTCPay-paid cart moves through, as the storefront's
 * return page needs it. `completed` is authoritative (the webhook turned
 * the cart into an order); the invoice-derived states are best-effort
 * progress reporting while the customer waits.
 */
export type CartPaymentState =
  | 'completed'
  | 'confirming'
  | 'awaiting_payment'
  | 'expired'
  | 'no_payment'
  | 'unknown'

const BTCPAY_PROVIDER_ID = 'pp_btcpay_btcpay'

// Greenfield invoice.status values. Anything paid-but-not-final reads as
// "confirming"; the webhook completes the cart when BTCPay settles. Only a
// positively-reported 'New' may read as unpaid — a missing or unrecognized
// status must NOT collapse to awaiting_payment, because that state renders
// "we haven't seen your payment" copy on the return page.
const CONFIRMING_STATUSES = new Set(['Processing', 'Settled', 'Complete'])
const DEAD_STATUSES = new Set(['Expired', 'Invalid'])
const UNPAID_STATUSES = new Set(['New'])

function derivePaymentState(cart: MedusaCart): {
  state: CartPaymentState
  checkoutLink: string | null
} {
  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.provider_id === BTCPAY_PROVIDER_ID
  )
  const data = (session?.data ?? {}) as {
    checkoutLink?: unknown
    btc_invoice?: { status?: unknown; checkoutLink?: unknown }
  }
  const rawLink = data.checkoutLink ?? data.btc_invoice?.checkoutLink
  const checkoutLink = typeof rawLink === 'string' && rawLink ? rawLink : null

  if (cart.completed_at) {
    return { state: 'completed', checkoutLink }
  }
  if (!session) {
    return { state: 'no_payment', checkoutLink: null }
  }

  const invoiceStatus = data.btc_invoice?.status
  if (typeof invoiceStatus === 'string' && DEAD_STATUSES.has(invoiceStatus)) {
    return { state: 'expired', checkoutLink }
  }
  if (typeof invoiceStatus === 'string' && CONFIRMING_STATUSES.has(invoiceStatus)) {
    return { state: 'confirming', checkoutLink }
  }
  if (typeof invoiceStatus === 'string' && UNPAID_STATUSES.has(invoiceStatus)) {
    return { state: 'awaiting_payment', checkoutLink }
  }
  return { state: 'unknown', checkoutLink }
}

/**
 * GET /api/store/cart/payment-status?cartId=...
 *
 * Read-only poll target for the BTCPay return page (/processing). Reports
 * where the customer's payment stands so the page can forward them to the
 * success page once the webhook has completed the cart into an order.
 *
 * Returns: { state, checkoutLink } — checkoutLink lets the page offer
 * "reopen the invoice" while the invoice is still unpaid.
 */
export async function GET(request: NextRequest) {
  try {
    const customer = await getCustomer()
    if (!customer) {
      return storeCartErrorResponse('authentication_required', 401)
    }

    const cartId = request.nextUrl.searchParams.get('cartId')?.trim()
    if (!cartId) {
      return storeCartErrorResponse('cart_id_required', 400)
    }

    const cart = await getCart(cartId)
    if (!cart) {
      return storeCartErrorResponse('cart_not_found', 404)
    }

    // Bind the cart to the caller (carts carry the session customer's email).
    if (cart.email !== customer.email) {
      return storeCartErrorResponse('cart_not_found', 404)
    }

    return NextResponse.json(derivePaymentState(cart))
  } catch (error) {
    storeLogger.error`Error checking cart payment status: ${error}`
    return storeCartErrorResponse('internal', 500)
  }
}
