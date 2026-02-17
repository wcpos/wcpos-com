'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { ArrowLeft, CheckCircle, CreditCard, Bitcoin } from 'lucide-react'
import Link from 'next/link'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'

interface CartItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  total?: number
}

interface PaymentSession {
  provider_id: string
  data: {
    client_secret?: string
    id?: string
    checkoutLink?: string
    [key: string]: unknown
  }
}

interface PaymentCollection {
  id?: string
  payment_sessions?: PaymentSession[]
}

interface Cart {
  id: string
  email?: string
  items: CartItem[]
  total: number
  currency_code: string
  payment_session?: PaymentSession
  payment_sessions?: PaymentSession[]
  payment_collection?: PaymentCollection
}

type PaymentMethod = 'stripe' | 'paypal' | 'btcpay'

// Map frontend payment method names to Medusa provider IDs
function getProviderId(method: PaymentMethod): string {
  switch (method) {
    case 'stripe':
      return 'pp_stripe_stripe'
    case 'paypal':
      return 'pp_paypal_paypal'
    case 'btcpay':
      return 'pp_btcpay_btcpay'
    default:
      return 'pp_stripe_stripe'
  }
}

// Check which payment methods are configured
const isStripeEnabled = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
const isPayPalEnabled = Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID)
const isBTCPayEnabled = Boolean(process.env.NEXT_PUBLIC_BTCPAY_ENABLED)

interface CheckoutClientProps {
  customerEmail?: string
  selectedVariantId?: string
  experimentVariant: ProCheckoutVariant
}

function resolvePaymentSession(cart: Cart, providerId: string): PaymentSession | undefined {
  const collectionSession = cart.payment_collection?.payment_sessions?.find(
    (session) => session.provider_id === providerId
  )
  if (collectionSession) {
    return collectionSession
  }

  if (cart.payment_sessions?.length) {
    return cart.payment_sessions.find((session) => session.provider_id === providerId)
  }

  if (cart.payment_session?.provider_id === providerId) {
    return cart.payment_session
  }

  return undefined
}

function resolveLineItemTotal(item: CartItem): number {
  if (typeof item.total === 'number' && Number.isFinite(item.total)) {
    return item.total
  }

  const unitPrice = Number.isFinite(item.unit_price) ? item.unit_price : 0
  const quantity = Number.isFinite(item.quantity) ? item.quantity : 0

  return unitPrice * quantity
}

export function CheckoutClient({
  customerEmail,
  selectedVariantId,
  experimentVariant,
}: CheckoutClientProps) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [email, setEmail] = useState(customerEmail || '')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [paymentCollectionId, setPaymentCollectionId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    isStripeEnabled ? 'stripe' : 'paypal'
  )

  const initializeCheckout = useCallback(async () => {
    if (!customerEmail) {
      setError('Please sign in to continue checkout.')
      setIsLoading(false)
      return
    }

    if (!selectedVariantId) {
      setError('No product selected')
      setIsLoading(false)
      return
    }

    try {
      // Create cart
      const cartResponse = await fetch('/api/store/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            experiment: 'pro_checkout_v1',
            variant: experimentVariant,
          },
        }),
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
          variant_id: selectedVariantId,
          quantity: 1,
        }),
      })

      if (!itemResponse.ok) {
        throw new Error('Failed to add item to cart')
      }

      const { cart: cartWithItem } = await itemResponse.json()

      // Initialize payment with Stripe (Medusa v2 flow)
      const sessionsResponse = await fetch('/api/store/cart/payment-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cartId: cartWithItem.id,
          provider_id: 'pp_stripe_stripe',
        }),
      })

      if (!sessionsResponse.ok) {
        throw new Error('Failed to initialize payment')
      }

      const paymentResult = await sessionsResponse.json()
      setCart(paymentResult.cart)
      setPaymentCollectionId(paymentResult.paymentCollectionId)

      // Set the client secret for Stripe
      if (paymentResult.clientSecret) {
        setClientSecret(paymentResult.clientSecret)
      }

      if (paymentResult.cart) {
        await fetch('/api/store/cart', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId: paymentResult.cart.id, email: customerEmail }),
        })
      }
    } catch (err) {
      console.error('[CHECKOUT] Initialization failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize checkout')
    } finally {
      setIsLoading(false)
    }
  }, [customerEmail, selectedVariantId, experimentVariant])

  // Select payment provider when method changes
  const selectPaymentMethod = useCallback(
    async (method: PaymentMethod) => {
      if (!cart || !paymentCollectionId) return

      setIsProcessing(true)
      setError(null)
      setClientSecret(null)

      try {
        console.log('[CHECKOUT] Switching payment method:', {
          from: paymentMethod,
          to: method,
          cartId: cart.id,
          providerId: getProviderId(method),
        })

        const response = await fetch('/api/store/cart/payment-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: cart.id,
            provider_id: getProviderId(method),
            paymentCollectionId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('[CHECKOUT] Payment method selection failed:', {
            method,
            status: response.status,
            error: errorData,
          })
          throw new Error(`Failed to select ${method} payment`)
        }

        const paymentResult = await response.json()
        setCart(paymentResult.cart)

        if (method === 'stripe' && paymentResult.clientSecret) {
          console.log('[CHECKOUT] Stripe client secret received')
          setClientSecret(paymentResult.clientSecret)
        }
      } catch (err) {
        console.error('[CHECKOUT] Payment method selection error:', err)
        setError(err instanceof Error ? err.message : 'Failed to select payment method')
      } finally {
        setIsProcessing(false)
      }
    },
    [cart, paymentCollectionId, paymentMethod]
  )

  useEffect(() => {
    initializeCheckout()
  }, [initializeCheckout])

  // Note: We initialize payment during cart creation, so no need to auto-select here
  // The clientSecret is already set from initializeCheckout

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
        <div className="w-full max-w-xl space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-28 w-full animate-pulse rounded bg-muted" />
          <div className="h-28 w-full animate-pulse rounded bg-muted" />
        </div>
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
          Your license key and download link have been sent to your email.
        </p>
        {orderId && (
          <p className="text-sm text-muted-foreground mb-6">Order ID: {orderId}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild>
            <Link href="/account/licenses">Go to Licenses</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
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

  const paypalSession = resolvePaymentSession(cart, getProviderId('paypal'))
  const btcpaySession = resolvePaymentSession(cart, getProviderId('btcpay'))

  const paypalOrderId =
    typeof paypalSession?.data?.id === 'string' ? paypalSession.data.id : null
  const btcpayCheckoutLink =
    typeof btcpaySession?.data?.checkoutLink === 'string'
      ? btcpaySession.data.checkoutLink
      : null

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
              <p className="font-medium">{formatCurrency(resolveLineItemTotal(item))}</p>
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
              readOnly
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Using your account email
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
                      experiment="pro_checkout_v1"
                      experimentVariant={experimentVariant}
                      onSuccess={handleSuccess}
                    />
                  </StripeProvider>
                ) : (
                  <div className="space-y-3 rounded-md border border-dashed p-4">
                    <div className="h-5 w-44 animate-pulse rounded bg-muted" />
                    <div className="h-10 w-full animate-pulse rounded bg-muted" />
                    <p className="text-sm text-muted-foreground">
                      Preparing secure card form...
                    </p>
                  </div>
                )}
              </TabsContent>
            )}

            {isPayPalEnabled && (
              <TabsContent value="paypal" className="mt-4">
                <PayPalProvider>
                  <PayPalButton
                    cartId={cart.id}
                    paypalOrderId={paypalOrderId}
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
                    checkoutLink={btcpayCheckoutLink}
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
