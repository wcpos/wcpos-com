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
 * GET /api/store/cart?id=xxx - Get a cart by ID
 */
export async function GET(request: NextRequest) {
  try {
    const cartId = request.nextUrl.searchParams.get('id')

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    const cart = await getCart(cartId)

    if (!cart) {
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

    const body = await request.json()
    const { cartId, ...updateData } = body

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
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
