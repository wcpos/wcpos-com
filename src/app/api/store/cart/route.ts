import { NextRequest, NextResponse } from 'next/server'
import {
  createCart,
  getCart,
  updateCart,
} from '@/services/core/external/medusa-client'
import { getCustomer } from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import type { CreateCartInput } from '@/types/medusa'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

    return NextResponse.json({ cart })
  } catch (error) {
    storeLogger.error`Error updating cart: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
