'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { StripeProvider } from './stripe-provider'
import { PayPalProvider } from './paypal-provider'
import { CheckoutForm } from './checkout-form'
import { PayPalButton } from './paypal-button'
import { BTCPayButton } from './btcpay-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Loader2, CheckCircle, CreditCard, Bitcoin } from 'lucide-react'
import Link from 'next/link'

interface CartItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  total: number
}

interface PaymentSession {
  provider_id: string
  data: {
    client_secret?: string
    id?: string
  }
}

interface Cart {
  id: string
  email?: string
  items: CartItem[]
  total: number
  currency_code: string
  payment_session?: PaymentSession
  payment_sessions?: PaymentSession[]
}

type PaymentMethod = 'stripe' | 'paypal' | 'btcpay'

// Check which payment methods are configured
const isStripeEnabled = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
const isPayPalEnabled = Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID)
const isBTCPayEnabled = Boolean(process.env.NEXT_PUBLIC_BTCPAY_ENABLED)

export function CheckoutClient() {
  const searchParams = useSearchParams()
  const variantId = searchParams.get('variant')

  const [cart, setCart] = useState<Cart | null>(null)
  const [email, setEmail] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    isStripeEnabled ? 'stripe' : 'paypal'
  )

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

      // Initialize payment sessions (this creates sessions for all available providers)
      const sessionsResponse = await fetch('/api/store/cart/payment-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: cartWithItem.id }),
      })

      if (!sessionsResponse.ok) {
        throw new Error('Failed to initialize payment')
      }

      const { cart: cartWithSessions } = await sessionsResponse.json()
      setCart(cartWithSessions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize checkout')
    } finally {
      setIsLoading(false)
    }
  }, [variantId])

  // Select payment provider when method changes
  const selectPaymentMethod = useCallback(
    async (method: PaymentMethod) => {
      if (!cart) return

      setIsProcessing(true)
      setError(null)

      try {
        const response = await fetch('/api/store/cart/payment-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: cart.id,
            provider_id: method,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to select ${method} payment`)
        }

        const { cart: updatedCart } = await response.json()
        setCart(updatedCart)

        // For Stripe, get the client secret
        if (method === 'stripe' && updatedCart.payment_session?.data?.client_secret) {
          setClientSecret(updatedCart.payment_session.data.client_secret)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to select payment method')
      } finally {
        setIsProcessing(false)
      }
    },
    [cart]
  )

  useEffect(() => {
    initializeCheckout()
  }, [initializeCheckout])

  // Select default payment method after cart is loaded
  useEffect(() => {
    if (cart && !cart.payment_session && isStripeEnabled) {
      selectPaymentMethod('stripe')
    }
  }, [cart, selectPaymentMethod])

  const handlePaymentMethodChange = (value: string) => {
    const method = value as PaymentMethod
    setPaymentMethod(method)
    selectPaymentMethod(method)
  }

  const handleSuccess = (newOrderId: string) => {
    setOrderId(newOrderId)
    setOrderComplete(true)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const updateEmail = async () => {
    if (!cart || !email) return

    try {
      await fetch('/api/store/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: cart.id, email }),
      })
    } catch {
      // Email update failed, but we can continue
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Preparing checkout...</p>
      </div>
    )
  }

  if (error && !cart) {
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
          <p className="text-sm text-muted-foreground mb-6">Order ID: {orderId}</p>
        )}
        <Button asChild>
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    )
  }

  if (!cart) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground mb-4">
          Unable to initialize checkout. Please try again.
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cart.currency_code.toUpperCase(),
    }).format(amount)

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
                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <p className="font-medium">{formatCurrency(item.total)}</p>
            </div>
          ))}
          <div className="border-t mt-4 pt-4 flex justify-between font-bold">
            <span>Total</span>
            <span>{formatCurrency(cart.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={updateEmail}
              required
            />
            <p className="text-sm text-muted-foreground">
              Your license key will be sent to this email
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Payment method tabs */}
          <Tabs value={paymentMethod} onValueChange={handlePaymentMethodChange}>
            <TabsList className={`grid w-full ${
              [isStripeEnabled, isPayPalEnabled, isBTCPayEnabled].filter(Boolean).length === 3
                ? 'grid-cols-3'
                : [isStripeEnabled, isPayPalEnabled, isBTCPayEnabled].filter(Boolean).length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-1'
            }`}>
              {isStripeEnabled && (
                <TabsTrigger value="stripe" disabled={isProcessing}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Card
                </TabsTrigger>
              )}
              {isPayPalEnabled && (
                <TabsTrigger value="paypal" disabled={isProcessing}>
                  PayPal
                </TabsTrigger>
              )}
              {isBTCPayEnabled && (
                <TabsTrigger value="btcpay" disabled={isProcessing}>
                  <Bitcoin className="h-4 w-4 mr-2" />
                  Bitcoin
                </TabsTrigger>
              )}
            </TabsList>

            {isStripeEnabled && (
              <TabsContent value="stripe" className="mt-4">
                {clientSecret ? (
                  <StripeProvider clientSecret={clientSecret}>
                    <CheckoutForm
                      cartId={cart.id}
                      amount={cart.total}
                      currency={cart.currency_code}
                      onSuccess={handleSuccess}
                    />
                  </StripeProvider>
                ) : (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </TabsContent>
            )}

            {isPayPalEnabled && (
              <TabsContent value="paypal" className="mt-4">
                <PayPalProvider>
                  <PayPalButton
                    cartId={cart.id}
                    amount={cart.total}
                    currency={cart.currency_code}
                    onSuccess={handleSuccess}
                    onError={handleError}
                  />
                </PayPalProvider>
              </TabsContent>
            )}

            {isBTCPayEnabled && (
              <TabsContent value="btcpay" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Pay with Bitcoin, Lightning Network, or other cryptocurrencies
                  </p>
                  <BTCPayButton
                    cartId={cart.id}
                    onSuccess={handleSuccess}
                    onError={handleError}
                  />
                </div>
              </TabsContent>
            )}
          </Tabs>

          <p className="text-xs text-center text-muted-foreground">
            Secure payment processing
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
