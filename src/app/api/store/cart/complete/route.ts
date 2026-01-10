import { NextRequest, NextResponse } from 'next/server'
import { completeCart } from '@/services/core/external/medusa-client'

/**
 * POST /api/store/cart/complete - Complete cart and create order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cartId } = body

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    const result = await completeCart(cartId)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to complete cart' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Error completing cart:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
