import { NextRequest, NextResponse } from 'next/server'
import {
  initializePayment,
} from '@/services/core/external/medusa-client'

/**
 * POST /api/store/cart/payment-sessions - Initialize payment for a cart
 * 
 * This uses the Medusa v2 payment flow:
 * 1. Creates a payment collection for the cart
 * 2. Initializes a payment session with Stripe
 * 3. Returns the client_secret for Stripe.js
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

    // Initialize payment and get client secret
    const providerId = provider_id || 'pp_stripe_stripe'
    const result = await initializePayment(cartId, providerId)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to initialize payment' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Error with payment sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
