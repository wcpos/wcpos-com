'use client'

import { useEffect, useState, useCallback } from 'react'
import { StripeProvider } from './stripe-provider'
import { PayPalProvider } from './paypal-provider'
import { CheckoutForm } from './checkout-form'
import { PayPalButton } from './paypal-button'
import { createPaymentSession } from './complete-cart'
import { BTCPayButton } from './btcpay-button'
import { CheckoutErrorNotice, OrderPendingNotice } from './checkout-recovery'
import {
  createPaymentFailure,
  METHOD_SWITCH_FAILED_MESSAGE,
  type CheckoutFailure,
} from './checkout-errors'
import {
  clearPendingFailures,
  isPersistedPendingKind,
  persistPendingFailure,
  readPendingFailure,
} from './checkout-pending-storage'
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

interface PaymentSessionResult {
  cart: Cart
  paymentCollectionId: string | null
  clientSecret?: string | null
}

type PaymentMethod = 'stripe' | 'paypal' | 'btcpay'
const PRO_CHECKOUT_EXPERIMENT = 'pro_checkout_v1'

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
  // Blocking initialization errors (cart could not be created at all).
  const [error, setError] = useState<string | null>(null)
  // Payment-stage failures — recoverable, rendered without unmounting the cart.
  const [failure, setFailure] = useState<CheckoutFailure | null>(null)
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [paymentCollectionId, setPaymentCollectionId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    isStripeEnabled ? 'stripe' : 'paypal'
  )

  // Derived from props during render (instead of setState in an effect) so the
  // initialization effect never calls setState synchronously.
  const prerequisiteError = !customerEmail
    ? 'Please sign in to continue checkout.'
    : !selectedVariantId
      ? 'No product selected'
      : null

  useEffect(() => {
    if (prerequisiteError) return

    async function initializeCheckout() {
      try {
        // A protective failure (payment may have been taken without an order)
        // survives reloads via sessionStorage. Restore it before initializing
        // so a refresh cannot silently hand the customer a fresh, payable
        // checkout.
        const restored = await Promise.resolve(readPendingFailure())
        if (restored) {
          setFailure(restored.failure)
          if (restored.failure.kind === 'order_pending') {
            // Money moved but no order exists — do not create a new cart or
            // payment session at all; render only the do-not-pay-again notice.
            return
          }
          // payment_uncertain: keep the warning visible but let the checkout
          // mount — the inline notice already withholds retry/switch guidance.
        }

        // Create cart
        const cartResponse = await fetch('/api/store/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              experiment: PRO_CHECKOUT_EXPERIMENT,
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
        const paymentResult = await createPaymentSession<PaymentSessionResult>({
          cartId: cartWithItem.id,
          providerId: 'pp_stripe_stripe',
          errorMessage: 'Failed to initialize payment',
        })

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
    }

    initializeCheckout()
  }, [customerEmail, selectedVariantId, experimentVariant, prerequisiteError])

  // Select payment provider when method changes
  const selectPaymentMethod = useCallback(
    async (method: PaymentMethod) => {
      if (!cart || !paymentCollectionId) return

      setIsProcessing(true)
      setFailure(null)
      setClientSecret(null)

      try {
        console.log('[CHECKOUT] Switching payment method:', {
          from: paymentMethod,
          to: method,
          cartId: cart.id,
          providerId: getProviderId(method),
        })

        const paymentResult = await createPaymentSession<PaymentSessionResult>({
          cartId: cart.id,
          providerId: getProviderId(method),
          paymentCollectionId,
          errorMessage: `Failed to select ${method} payment`,
        })

        setCart(paymentResult.cart)

        if (method === 'stripe' && paymentResult.clientSecret) {
          console.log('[CHECKOUT] Stripe client secret received')
          setClientSecret(paymentResult.clientSecret)
        }
      } catch (err) {
        setFailure(
          createPaymentFailure(METHOD_SWITCH_FAILED_MESSAGE, {
            source: 'payment_method_switch',
            details: {
              cartId: cart.id,
              method,
              error: err instanceof Error ? err.message : err,
            },
          })
        )
      } finally {
        setIsProcessing(false)
      }
    },
    [cart, paymentCollectionId, paymentMethod]
  )

  // Note: We initialize payment during cart creation, so no need to auto-select here
  // The clientSecret is already set from initializeCheckout

  const handlePaymentMethodChange = (value: string) => {
    const method = value as PaymentMethod
    setPaymentMethod(method)
    selectPaymentMethod(method)
  }

  const activeCartId = cart?.id ?? null

  const handleSuccess = (newOrderId: string) => {
    // An order definitively exists — the do-not-pay-again guard can go.
    clearPendingFailures()
    setFailure(null)
    setOrderId(newOrderId)
    setOrderComplete(true)
  }

  // Children report payment failures here (null clears a previous failure on
  // retry). Messages are already customer-safe; raw details are in the logs.
  // Protective kinds (order_pending / payment_uncertain) are also persisted so
  // a page reload cannot restore a payable checkout while a charge may have
  // succeeded; only a successful order clears them.
  const handleFailure = useCallback(
    (nextFailure: CheckoutFailure | null) => {
      setFailure(nextFailure)
      if (nextFailure && activeCartId && isPersistedPendingKind(nextFailure.kind)) {
        persistPendingFailure(activeCartId, nextFailure)
      }
    },
    [activeCartId]
  )

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

  const blockingError = prerequisiteError ?? (!cart ? error : null)

  if (blockingError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-destructive mb-4">{blockingError}</p>
        <Button asChild variant="outline">
          <Link href="/pro">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to pricing
          </Link>
        </Button>
      </div>
    )
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

  // Payment captured but order creation failed — the worst customer state.
  // Replaces the whole checkout so the customer cannot pay a second time.
  if (failure?.kind === 'order_pending') {
    return <OrderPendingNotice failure={failure} />
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

  const enabledMethodCount = [isStripeEnabled, isPayPalEnabled, isBTCPayEnabled].filter(
    Boolean
  ).length

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

          {failure && (
            <CheckoutErrorNotice
              failure={failure}
              canSwitchMethod={enabledMethodCount > 1}
            />
          )}

          {/* Payment method tabs */}
          <Tabs value={paymentMethod} onValueChange={handlePaymentMethodChange}>
            <TabsList className={`grid w-full ${
              enabledMethodCount === 3
                ? 'grid-cols-3'
                : enabledMethodCount === 2
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
                      experiment={PRO_CHECKOUT_EXPERIMENT}
                      experimentVariant={experimentVariant}
                      onSuccess={handleSuccess}
                      onFailure={handleFailure}
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
                    experiment={PRO_CHECKOUT_EXPERIMENT}
                    experimentVariant={experimentVariant}
                    paypalOrderId={paypalOrderId}
                    onSuccess={handleSuccess}
                    onFailure={handleFailure}
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
                    onFailure={handleFailure}
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
