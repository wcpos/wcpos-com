import { NextRequest, NextResponse } from 'next/server'
import {
  createPaymentSessions,
  setPaymentSession,
} from '@/services/core/external/medusa-client'

/**
 * POST /api/store/cart/payment-sessions - Initialize payment sessions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cartId, provider_id } = body

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    // If provider_id is specified, set the payment session
    if (provider_id) {
      const cart = await setPaymentSession(cartId, provider_id)

      if (!cart) {
        return NextResponse.json(
          { error: 'Failed to set payment session' },
          { status: 500 }
        )
      }

      return NextResponse.json({ cart })
    }

    // Otherwise, create payment sessions
    const cart = await createPaymentSessions(cartId)

    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to create payment sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ cart })
  } catch (error) {
    console.error('[API] Error with payment sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
