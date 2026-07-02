import { NextRequest, NextResponse } from 'next/server'
import {
  createCart,
  getCart,
  updateCart,
} from '@/services/core/external/medusa-client'
import {
  getCustomer,
  updateCustomer,
  type MedusaCustomer,
} from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import { mergeAccountProfileMetadataPatch } from '@/lib/customer-profile-metadata'
import type { CreateCartInput } from '@/types/medusa'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Mirror confirmed billing details into the customer profile
 * (metadata.account_profile) — receipts read the profile, and the next
 * checkout prefills from it. Best-effort: profile sync must never fail the
 * purchase, so errors are logged and swallowed.
 */
async function syncBillingToProfile(
  customer: MedusaCustomer,
  billingAddress: Record<string, unknown>,
  taxNumber: string
): Promise<void> {
  const countryCode = asTrimmedString(billingAddress.country_code)
  const metadata = mergeAccountProfileMetadataPatch(customer.metadata, {
    countryCode: countryCode ? countryCode.toUpperCase() : undefined,
    addressLine1: asTrimmedString(billingAddress.address_1) || undefined,
    city: asTrimmedString(billingAddress.city) || undefined,
    postalCode: asTrimmedString(billingAddress.postal_code) || undefined,
    taxNumber: taxNumber || undefined,
  })
  if (!metadata) return

  try {
    await updateCustomer({ metadata })
  } catch (error) {
    storeLogger.error`Failed to sync billing address to customer profile: ${error}`
  }
}

/**
 * POST /api/store/cart - Create a new cart
 */
export async function POST(request: NextRequest) {
  try {
    const customer = await getCustomer()
    if (!customer) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

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

    const cart = await createCart(createCartInput)

    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to create cart' },
        { status: 500 }
      )
    }

    return NextResponse.json({ cart })
  } catch (error) {
    storeLogger.error`Error creating cart: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/store/cart?id=xxx - Get a cart by ID (caller's carts only)
 */
export async function GET(request: NextRequest) {
  try {
    const customer = await getCustomer()
    if (!customer) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const cartId = request.nextUrl.searchParams.get('id')

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    const cart = await getCart(cartId)

    if (!cart || cart.email !== customer.email) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ cart })
  } catch (error) {
    storeLogger.error`Error getting cart: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/store/cart - Update a cart
 *
 * Whitelisted fields only: the checkout owns metadata/experiment
 * attribution and region server-side, so the browser may set nothing but
 * the billing address (email is always forced to the session customer).
 */
export async function PATCH(request: NextRequest) {
  try {
    const customer = await getCustomer()
    if (!customer) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!isRecord(body)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const cartId = typeof body.cartId === 'string' ? body.cartId.trim() : ''
    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    // Bind the cart to the caller: carts are created with the session
    // customer's email, so a mismatch means someone else's cart id.
    const existingCart = await getCart(cartId)
    if (!existingCart || existingCart.email !== customer.email) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (isRecord(body.billing_address)) {
      updateData.billing_address = body.billing_address
    }
    // The one metadata key the browser may set: the billing step's optional
    // tax registration (ABN/VAT/EIN). Medusa merges metadata keys, so this
    // cannot clobber the server-owned experiment attribution.
    const taxNumber =
      isRecord(body.metadata) && typeof body.metadata.taxNumber === 'string'
        ? body.metadata.taxNumber.trim().slice(0, 64)
        : ''
    if (taxNumber) {
      updateData.metadata = { taxNumber }
    }

    const cart = await updateCart(cartId, {
      ...updateData,
      email: customer.email,
    })

    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to update cart' },
        { status: 500 }
      )
    }

    if (isRecord(body.billing_address)) {
      await syncBillingToProfile(customer, body.billing_address, taxNumber)
    }

    return NextResponse.json({ cart })
  } catch (error) {
    storeLogger.error`Error updating cart: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
