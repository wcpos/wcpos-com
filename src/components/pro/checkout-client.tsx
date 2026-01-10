'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StripeProvider } from './stripe-provider'
import { CheckoutForm } from './checkout-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface CartItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  total: number
}

interface Cart {
  id: string
  items: CartItem[]
  total: number
  currency_code: string
  payment_session?: {
    provider_id: string
    data: {
      client_secret?: string
    }
  }
}

export function CheckoutClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const variantId = searchParams.get('variant')
  const productHandle = searchParams.get('product')

  const [cart, setCart] = useState<Cart | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const initializeCheckout = useCallback(async () => {
    if (!variantId) {
      setError('No product selected')
      setIsLoading(false)
      return
    }

    try {
      // Create cart
      const cartResponse = await fetch('/api/store/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!cartResponse.ok) {
        throw new Error('Failed to create cart')
      }

      const { cart: newCart } = await cartResponse.json()

      // Add item to cart
      const itemResponse = await fetch('/api/store/cart/line-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: newCart.id,
          variant_id: variantId,
          quantity: 1,
        }),
      })

      if (!itemResponse.ok) {
        throw new Error('Failed to add item to cart')
      }

      const { cart: cartWithItem } = await itemResponse.json()

      // Initialize payment sessions
      const sessionsResponse = await fetch('/api/store/cart/payment-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: cartWithItem.id }),
      })

      if (!sessionsResponse.ok) {
        throw new Error('Failed to initialize payment')
      }

      // Select Stripe as payment provider
      const selectResponse = await fetch('/api/store/cart/payment-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: cartWithItem.id,
          provider_id: 'stripe',
        }),
      })

      if (!selectResponse.ok) {
        throw new Error('Failed to select payment method')
      }

      const { cart: finalCart } = await selectResponse.json()

      setCart(finalCart)

      // Get client secret from payment session
      if (finalCart.payment_session?.data?.client_secret) {
        setClientSecret(finalCart.payment_session.data.client_secret)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize checkout')
    } finally {
      setIsLoading(false)
    }
  }, [variantId])

  useEffect(() => {
    initializeCheckout()
  }, [initializeCheckout])

  const handleSuccess = (newOrderId: string) => {
    setOrderId(newOrderId)
    setOrderComplete(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Preparing checkout...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-destructive mb-4">{error}</p>
        <Button asChild variant="outline">
          <Link href="/pro">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to pricing
          </Link>
        </Button>
      </div>
    )
  }

  if (orderComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Thank you for your purchase!</h2>
        <p className="text-muted-foreground mb-4">
          Your license key has been sent to your email.
        </p>
        {orderId && (
          <p className="text-sm text-muted-foreground mb-6">
            Order ID: {orderId}
          </p>
        )}
        <Button asChild>
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    )
  }

  if (!cart || !clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground mb-4">
          Unable to initialize payment. Please try again.
        </p>
        <Button asChild variant="outline">
          <Link href="/pro">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to pricing
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {cart.items.map((item) => (
            <div key={item.id} className="flex justify-between py-2">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  Qty: {item.quantity}
                </p>
              </div>
              <p className="font-medium">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: cart.currency_code.toUpperCase(),
                }).format(item.total)}
              </p>
            </div>
          ))}
          <div className="border-t mt-4 pt-4 flex justify-between font-bold">
            <span>Total</span>
            <span>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: cart.currency_code.toUpperCase(),
              }).format(cart.total)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <StripeProvider clientSecret={clientSecret}>
            <CheckoutForm
              cartId={cart.id}
              amount={cart.total}
              currency={cart.currency_code}
              onSuccess={handleSuccess}
            />
          </StripeProvider>
        </CardContent>
      </Card>
    </div>
  )
}
