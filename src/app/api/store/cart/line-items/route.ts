import { NextRequest, NextResponse } from 'next/server'
import { addLineItem } from '@/services/core/external/medusa-client'

/**
 * POST /api/store/cart/line-items - Add item to cart
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cartId, variant_id, quantity } = body

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    if (!variant_id) {
      return NextResponse.json(
        { error: 'Variant ID is required' },
        { status: 400 }
      )
    }

    const cart = await addLineItem(cartId, {
      variant_id,
      quantity: quantity || 1,
    })

    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to add item to cart' },
        { status: 500 }
      )
    }

    return NextResponse.json({ cart })
  } catch (error) {
    console.error('[API] Error adding line item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
