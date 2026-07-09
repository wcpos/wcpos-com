import { NextRequest, NextResponse } from 'next/server'
import { storeCartErrorResponse } from '@/lib/store-cart-errors'
import {
  createCart,
  getCart,
  updateCart,
} from '@/services/core/external/medusa-client'
import {
  getAuthToken,
  getCustomer,
  updateCustomer,
  upsertDefaultBillingAddress,
  type MedusaCustomer,
} from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import {
  billingPatchFromCheckout,
  type BillingAddressPatch,
} from '@/lib/billing-profile'
import { deliver } from '@/lib/sinks/deliver'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'
import type { CreateCartInput } from '@/types/medusa'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

async function backfillMissingCustomerNames(
  customer: MedusaCustomer,
  billingPatch: BillingAddressPatch
): Promise<void> {
  const profilePatch: { first_name?: string; last_name?: string } = {}

  if (!nonEmptyString(customer.first_name) && billingPatch.first_name) {
    profilePatch.first_name = billingPatch.first_name
  }
  if (!nonEmptyString(customer.last_name) && billingPatch.last_name) {
    profilePatch.last_name = billingPatch.last_name
  }
  if (Object.keys(profilePatch).length === 0) return

  try {
    const updated = await updateCustomer(profilePatch)
    if (!updated) {
      storeLogger.error`Customer name backfill skipped: no session token for customer ${customer.id}`
    }
  } catch (error) {
    storeLogger.error`Failed to backfill customer names from checkout billing: ${error}`
  }
}

/**
 * Mirror confirmed billing details onto the customer's default billing
 * address — the single source of truth receipts and the profile page read,
 * and the next checkout prefills from. Best-effort: the sync must never fail
 * or delay the purchase, so callers hand the returned promise to deliver()
 * and errors are logged and swallowed.
 */
async function syncBillingToCustomerAddress(
  customer: MedusaCustomer,
  billingPatch: BillingAddressPatch
): Promise<void> {
  try {
    const updated = await upsertDefaultBillingAddress(
      customer,
      billingPatch
    )
    if (!updated) {
      // Null is a failed write (no session token), not a no-op — without
      // this the mirror could stop working with zero signal.
      storeLogger.error`Billing address sync skipped: no session token for customer ${customer.id}`
    }
  } catch (error) {
    storeLogger.error`Failed to sync billing address to customer profile: ${error}`
  }
}

/**
 * POST /api/store/cart - Create a new cart
 */
export async function POST(request: NextRequest) {
  try {
    await assertViewOnly()
  } catch (error) {
    if (error instanceof ViewOnlyError) {
      return storeCartErrorResponse('read_only_inspection', 403)
    }
    throw error
  }

  try {
    const customer = await getCustomer()
    if (!customer) {
      return storeCartErrorResponse('authentication_required', 401)
    }

    // getCustomer() above already validated this token against
    // /store/customers/me (which rejects a JWT with an empty actor_id), so a
    // non-null customer guarantees a real session token. Forwarding it is what
    // makes Medusa set cart.customer_id from the auth context instead of
    // leaving the cart an email-bound guest (#284).
    const authToken = await getAuthToken()

    const body = await request.json().catch(() => ({}))
    const createCartInput: CreateCartInput = {
      email: customer.email,
    }
    if (isRecord(body)) {
      if (typeof body.region_id === 'string') {
        createCartInput.region_id = body.region_id
      }
      if (isRecord(body.metadata)) {
        createCartInput.metadata = body.metadata
      }
    }

    const cart = await createCart(createCartInput, authToken)

    if (!cart) {
      return storeCartErrorResponse('failed_create_cart', 500)
    }

    return NextResponse.json({ cart })
  } catch (error) {
    storeLogger.error`Error creating cart: ${error}`
    return storeCartErrorResponse('internal', 500)
  }
}

/**
 * GET /api/store/cart?id=xxx - Get a cart by ID (caller's carts only)
 */
export async function GET(request: NextRequest) {
  try {
    const customer = await getCustomer()
    if (!customer) {
      return storeCartErrorResponse('authentication_required', 401)
    }

    const cartId = request.nextUrl.searchParams.get('id')

    if (!cartId) {
      return storeCartErrorResponse('cart_id_required', 400)
    }

    const cart = await getCart(cartId)

    if (!cart || cart.email !== customer.email) {
      return storeCartErrorResponse('cart_not_found', 404)
    }

    return NextResponse.json({ cart })
  } catch (error) {
    storeLogger.error`Error getting cart: ${error}`
    return storeCartErrorResponse('internal', 500)
  }
}

/**
 * PATCH /api/store/cart - Update a cart
 *
 * Whitelisted fields only: the checkout owns metadata/experiment
 * attribution and region server-side, so the browser may set only the
 * billing address plus metadata.taxNumber (email is always forced to the
 * session customer).
 */
export async function PATCH(request: NextRequest) {
  try {
    await assertViewOnly()
  } catch (error) {
    if (error instanceof ViewOnlyError) {
      return storeCartErrorResponse('read_only_inspection', 403)
    }
    throw error
  }

  try {
    const customer = await getCustomer()
    if (!customer) {
      return storeCartErrorResponse('authentication_required', 401)
    }

    // See POST: a non-null customer guarantees a real session token; forward it
    // so the cart keeps its customer_id link (#284).
    const authToken = await getAuthToken()

    const body = await request.json().catch(() => null)
    if (!isRecord(body)) {
      return storeCartErrorResponse('invalid_request_body', 400)
    }

    const cartId = typeof body.cartId === 'string' ? body.cartId.trim() : ''
    if (!cartId) {
      return storeCartErrorResponse('cart_id_required', 400)
    }

    // Bind the cart to the caller: carts are created with the session
    // customer's email, so a mismatch means someone else's cart id.
    const existingCart = await getCart(cartId)
    if (!existingCart || existingCart.email !== customer.email) {
      return storeCartErrorResponse('cart_not_found', 404)
    }

    const updateData: Record<string, unknown> = {}
    if (isRecord(body.billing_address)) {
      updateData.billing_address = body.billing_address
    }
    // The one metadata key the browser may set: the billing step's optional
    // tax registration (ABN/VAT/EIN). Medusa merges metadata keys, so this
    // cannot clobber the server-owned experiment attribution. An empty
    // submitted value clears the key (null deletes on merge) — omitting the
    // field entirely preserves whatever is stored.
    const taxNumberSubmitted =
      isRecord(body.metadata) && typeof body.metadata.taxNumber === 'string'
    const taxNumber = taxNumberSubmitted
      ? (body.metadata as Record<string, string>).taxNumber.trim().slice(0, 64)
      : undefined
    if (taxNumberSubmitted) {
      updateData.metadata = { taxNumber: taxNumber || null }
    }

    const cart = await updateCart(
      cartId,
      {
        ...updateData,
        email: customer.email,
      },
      authToken
    )

    if (!cart) {
      return storeCartErrorResponse('failed_update_cart', 500)
    }

    if (isRecord(body.billing_address)) {
      const billingPatch = billingPatchFromCheckout(
        body.billing_address,
        taxNumber
      )
      // The Medusa customer row is the profile name source of truth. Checkout
      // collects the name later than account creation, so missing customer
      // names must be written before this billing save is reported successful;
      // otherwise a customer can land on Account > Profile and still see blank
      // fields even though their order/billing address has names.
      await backfillMissingCustomerNames(customer, billingPatch)

      // The default billing address remains the source for receipt/address
      // details and checkout prefill. Keep it off the critical payment path:
      // failure here must not block checkout after the cart itself was saved.
      deliver(syncBillingToCustomerAddress(customer, billingPatch))
    }

    return NextResponse.json({ cart })
  } catch (error) {
    storeLogger.error`Error updating cart: ${error}`
    return storeCartErrorResponse('internal', 500)
  }
}
