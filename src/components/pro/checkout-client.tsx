'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPaymentSession } from './complete-cart'
import { CheckoutErrorNotice, OrderPendingNotice } from './checkout-recovery'
import {
  clearCheckoutSafetyState,
  createPaymentFailure,
  isProtectiveCheckoutFailureKind,
  METHOD_SWITCH_FAILED_MESSAGE,
  recordCheckoutFailure,
  restoreCheckoutSafetyState,
  shouldBlockCheckout,
  type CheckoutFailure,
} from './checkout-safety'
import { AccountStep } from './checkout/account-step'
import {
  BillingStep,
  billingAddressSummary,
  type BillingAddress,
} from './checkout/billing-step'
import { PaymentStep, type PaymentMethod } from './checkout/payment-step'
import { StepShell } from './checkout/step-shell'
import { Button } from '@/components/ui/button'
import { toneText } from '@/components/ui/status-tone'
import { ArrowLeft, Check, CheckCircle } from 'lucide-react'
import { Link } from '@/i18n/navigation'
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

/**
 * Which payment methods this checkout offers — resolved server-side from the
 * request host (wcpos.com => live keys, beta => test keys, localhost => dev;
 * see store-environment.ts) and passed in as a prop. All values are public
 * identifiers.
 */
export interface CheckoutPaymentConfig {
  stripePublishableKey: string | null
  paypalClientId: string | null
  btcpayEnabled: boolean
}

function derivePaymentSetup(payments: CheckoutPaymentConfig) {
  const stripeEnabled = Boolean(payments.stripePublishableKey)
  const paypalEnabled = Boolean(payments.paypalClientId)
  const btcpayEnabled = payments.btcpayEnabled
  const anyEnabled = stripeEnabled || paypalEnabled || btcpayEnabled
  const defaultMethod: PaymentMethod = stripeEnabled
    ? 'stripe'
    : paypalEnabled
      ? 'paypal'
      : 'btcpay'
  return { stripeEnabled, paypalEnabled, btcpayEnabled, anyEnabled, defaultMethod }
}

type StepId = 'account' | 'billing' | 'payment'

interface CheckoutClientProps {
  /** Absent when the visitor is not signed in — the account step handles it. */
  customerEmail?: string
  selectedOfferHandle?: string
  /** Static summary shown before the cart exists. */
  offerSummary?: { title: string; priceFormatted: string }
  /** Current checkout path (with query) for OAuth redirect-back. */
  checkoutPath: string
  experimentVariant: ProCheckoutVariant
  /** Host-resolved public payment identifiers (see store-environment.ts). */
  payments: CheckoutPaymentConfig
}

function resolvePaymentSession(
  cart: Cart,
  providerId: string
): PaymentSession | undefined {
  const collectionSession = cart.payment_collection?.payment_sessions?.find(
    (session) => session.provider_id === providerId
  )
  if (collectionSession) {
    return collectionSession
  }

  if (cart.payment_sessions?.length) {
    const legacySession = cart.payment_sessions.find(
      (session) => session.provider_id === providerId
    )
    if (legacySession) {
      return legacySession
    }
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
  selectedOfferHandle,
  offerSummary,
  checkoutPath,
  experimentVariant,
  payments,
}: CheckoutClientProps) {
  const {
    stripeEnabled: isStripeEnabled,
    paypalEnabled: isPayPalEnabled,
    btcpayEnabled: isBTCPayEnabled,
    anyEnabled: anyPaymentMethodEnabled,
    defaultMethod: defaultPaymentMethod,
  } = derivePaymentSetup(payments)
  const [email, setEmail] = useState<string | null>(customerEmail ?? null)
  const [step, setStep] = useState<StepId>(
    customerEmail ? 'billing' : 'account'
  )
  const [billingAddress, setBillingAddress] = useState<BillingAddress | null>(
    null
  )
  const [cart, setCart] = useState<Cart | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  // True while a provider confirmation may be charging the customer —
  // billing Edit and method switching are locked for its duration.
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  // Blocking initialization errors (cart could not be created at all).
  const [error, setError] = useState<string | null>(null)
  // Payment-stage failures — recoverable, rendered without unmounting the cart.
  const [failure, setFailure] = useState<CheckoutFailure | null>(null)
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [paymentCollectionId, setPaymentCollectionId] = useState<
    string | null
  >(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    defaultPaymentMethod
  )

  // Billing can finish before the background cart init does — the submit
  // handler awaits this instead of racing state. It resolves with the FULL
  // init result (cart + payment collection id), because React state set by
  // the init effect may not have rendered into this closure yet; relying on
  // state alone once minted a second payment collection for the same cart.
  interface CheckoutInitResult {
    cart: Cart
    paymentCollectionId: string | null
  }
  const cartReadyRef = useRef<{
    promise: Promise<CheckoutInitResult>
    resolve: (result: CheckoutInitResult) => void
    reject: (error: unknown) => void
  } | null>(null)
  if (cartReadyRef.current === null) {
    let resolve!: (result: CheckoutInitResult) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<CheckoutInitResult>((res, rej) => {
      resolve = res
      reject = rej
    })
    // Swallow "nobody awaited yet" rejections; billing submit attaches later.
    promise.catch(() => {})
    cartReadyRef.current = { promise, resolve, reject }
  }

  const initStartedRef = useRef(false)

  const prerequisiteError = !selectedOfferHandle ? 'No product selected' : null

  // A protective failure (payment may have been taken without an order)
  // survives reloads via sessionStorage. Restore it before initializing so
  // a refresh cannot silently hand the customer a fresh, payable checkout.
  const [safetyRestored, setSafetyRestored] = useState(false)
  useEffect(() => {
    let cancelled = false
    // Deferred a microtask so the effect never sets state synchronously
    // (react-hooks/set-state-in-effect); sessionStorage is browser-only.
    Promise.resolve().then(() => {
      if (cancelled) return
      const restored = restoreCheckoutSafetyState()
      if (restored) {
        setFailure(restored.failure)
      }
      setSafetyRestored(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const blockedByProtectiveFailure = failure
    ? shouldBlockCheckout(failure)
    : false

  // Cart initialization: starts as soon as we know who is buying (page load
  // for signed-in customers; after the account step otherwise). The customer
  // keeps filling in billing while this runs in the background.
  useEffect(() => {
    if (!safetyRestored) return
    if (prerequisiteError || blockedByProtectiveFailure) return
    if (!email) return
    if (initStartedRef.current) return
    initStartedRef.current = true

    async function initializeCheckout() {
      try {
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
            product: selectedOfferHandle,
            quantity: 1,
          }),
        })

        if (!itemResponse.ok) {
          throw new Error('Failed to add item to cart')
        }

        const { cart: cartWithItem } = await itemResponse.json()

        // No provider configured: keep the cart usable and let PaymentStep
        // surface its explicit "no payment methods" state instead of failing
        // init with a misleading payment error.
        if (!anyPaymentMethodEnabled) {
          setCart(cartWithItem)
          cartReadyRef.current?.resolve({
            cart: cartWithItem,
            paymentCollectionId: null,
          })
          return
        }

        // Initialize payment (Medusa v2 flow) with the default provider.
        const paymentResult = await createPaymentSession<PaymentSessionResult>({
          cartId: cartWithItem.id,
          providerId: getProviderId(defaultPaymentMethod),
          errorMessage: 'Failed to initialize payment',
        })

        setCart(paymentResult.cart)
        setPaymentCollectionId(paymentResult.paymentCollectionId)

        if (paymentResult.clientSecret) {
          setClientSecret(paymentResult.clientSecret)
        }

        cartReadyRef.current?.resolve({
          cart: paymentResult.cart,
          paymentCollectionId: paymentResult.paymentCollectionId,
        })
      } catch (err) {
        console.error('[CHECKOUT] Initialization failed:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to initialize checkout'
        )
        cartReadyRef.current?.reject(err)
      }
    }

    initializeCheckout()
  }, [
    safetyRestored,
    prerequisiteError,
    blockedByProtectiveFailure,
    email,
    selectedOfferHandle,
    experimentVariant,
  ])

  // Select payment provider when method changes
  const selectPaymentMethod = useCallback(
    async (method: PaymentMethod) => {
      if (!cart || !paymentCollectionId) return
      // One session mutation at a time (see handleBillingSubmit).
      if (isProcessing) return

      setIsProcessing(true)
      setFailure(null)
      setClientSecret(null)

      try {
        const paymentResult = await createPaymentSession<PaymentSessionResult>({
          cartId: cart.id,
          providerId: getProviderId(method),
          paymentCollectionId,
          errorMessage: `Failed to select ${method} payment`,
        })

        setCart(paymentResult.cart)

        if (method === 'stripe' && paymentResult.clientSecret) {
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
    [cart, paymentCollectionId, isProcessing]
  )

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    if (method === paymentMethod) return
    setPaymentMethod(method)
    selectPaymentMethod(method)
  }

  const activeCartId = cart?.id ?? null

  const handleSuccess = (newOrderId: string) => {
    // An order definitively exists — the do-not-pay-again guard can go.
    clearCheckoutSafetyState()
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
      if (
        nextFailure &&
        activeCartId &&
        isProtectiveCheckoutFailureKind(nextFailure.kind)
      ) {
        recordCheckoutFailure(activeCartId, nextFailure)
      }
    },
    [activeCartId]
  )

  async function handleBillingSubmit(address: BillingAddress) {
    // Serialize against method switches and other refreshes — two session
    // mutations racing can leave the mounted Stripe element and the Medusa
    // collection pointing at different intents.
    if (isProcessing) {
      throw new Error('Checkout is busy. Please try again.')
    }

    // Always await the init result: the ref carries the collection id even
    // when React state hasn't rendered into this closure yet (fast typers
    // beat the background init). Relying on state alone once minted a second
    // payment collection for the same cart.
    const init = cart
      ? { cart, paymentCollectionId }
      : await cartReadyRef.current!.promise

    setIsProcessing(true)
    try {
      const response = await fetch('/api/store/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: init.cart.id,
          billing_address: address,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to save billing address')
      }
      const { cart: updatedCart } = (await response.json()) as { cart?: Cart }
      const cartAfterBilling = updatedCart ?? init.cart

      // No provider configured — nothing to refresh; PaymentStep shows its
      // explicit no-methods state.
      if (!anyPaymentMethodEnabled) {
        setCart(cartAfterBilling)
        setBillingAddress(address)
        setStep('payment')
        return
      }

      let paymentResult: PaymentSessionResult
      try {
        paymentResult = await createPaymentSession<PaymentSessionResult>({
          cartId: cartAfterBilling.id,
          providerId: getProviderId(paymentMethod),
          paymentCollectionId:
            paymentCollectionId ??
            init.paymentCollectionId ??
            cartAfterBilling.payment_collection?.id ??
            null,
          errorMessage: 'Failed to refresh payment',
        })
      } catch {
        throw Object.assign(
          new Error(
            "Billing address was saved, but we couldn't prepare payment. Please try again."
          ),
          { name: 'PaymentRefreshError' }
        )
      }

      setCart(paymentResult.cart)
      setPaymentCollectionId(paymentResult.paymentCollectionId)
      setClientSecret(
        paymentMethod === 'stripe' && paymentResult.clientSecret
          ? paymentResult.clientSecret
          : null
      )
      setBillingAddress(address)
      setStep('payment')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAuthenticated = (authedEmail: string) => {
    setEmail(authedEmail)
    setStep('billing')
  }

  if (prerequisiteError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <p className="mb-4 text-destructive">{prerequisiteError}</p>
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
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <CheckCircle className={`mb-4 h-16 w-16 ${toneText.positive}`} />
        <h2 className="mb-2 text-2xl font-bold">
          Thank you for your purchase!
        </h2>
        <p className="mb-4 text-muted-foreground">
          Your license key and download link have been sent to your email.
        </p>
        {orderId && (
          <p className="mb-6 text-sm text-muted-foreground">
            Order ID: {orderId}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (cart?.currency_code ?? 'usd').toUpperCase(),
    }).format(amount)

  const paypalSession = cart
    ? resolvePaymentSession(cart, getProviderId('paypal'))
    : undefined
  const btcpaySession = cart
    ? resolvePaymentSession(cart, getProviderId('btcpay'))
    : undefined

  const enabledMethodCount = [
    isStripeEnabled,
    isPayPalEnabled,
    isBTCPayEnabled,
  ].filter(Boolean).length

  const paypalOrderId =
    typeof paypalSession?.data?.id === 'string' ? paypalSession.data.id : null
  const btcpayCheckoutLink =
    typeof btcpaySession?.data?.checkoutLink === 'string'
      ? btcpaySession.data.checkoutLink
      : null

  const stepIndex: Record<StepId, number> = {
    account: 1,
    billing: 2,
    payment: 3,
  }
  const stepState = (target: StepId): 'done' | 'active' | 'todo' => {
    if (step === target) return 'active'
    return stepIndex[target] < stepIndex[step] ? 'done' : 'todo'
  }

  const initErrorNotice = (
    <div className="space-y-4">
      <p className="text-sm text-destructive">
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

  return (
    <div className="mx-auto grid max-w-4xl items-start gap-8 md:grid-cols-[1.6fr_1fr]">
      {/* Steps */}
      <div className="space-y-3" data-testid="checkout-steps">
        {/* Above the steps, not inside step 3: a restored protective warning
            (e.g. payment_uncertain from a previous session) must be visible
            from the first render, not only once the customer reaches payment. */}
        {failure && (
          <CheckoutErrorNotice
            failure={failure}
            canSwitchMethod={enabledMethodCount > 1}
          />
        )}
        <StepShell
          index={1}
          title="Account"
          summary={email ?? undefined}
          state={stepState('account')}
          editLabel="Edit"
        >
          <AccountStep
            checkoutPath={checkoutPath}
            onAuthenticated={handleAuthenticated}
          />
        </StepShell>

        <StepShell
          index={2}
          title="Billing address"
          summary={
            billingAddress ? billingAddressSummary(billingAddress) : undefined
          }
          state={stepState('billing')}
          onEdit={
            // No billing edits while a session mutation or a provider
            // confirmation is in flight — resubmitting billing re-creates
            // the payment session mid-charge.
            isProcessing || isConfirmingPayment
              ? undefined
              : () => setStep('billing')
          }
          editLabel="Edit"
        >
          {error ? (
            initErrorNotice
          ) : (
            <BillingStep
              initialAddress={billingAddress}
              onSubmit={handleBillingSubmit}
            />
          )}
        </StepShell>

        <StepShell
          index={3}
          title="Payment"
          state={stepState('payment')}
          editLabel="Edit"
        >
          <div className="space-y-4">
            {cart ? (
              <PaymentStep
                cartId={cart.id}
                clientSecret={clientSecret}
                paypalOrderId={paypalOrderId}
                btcpayCheckoutLink={btcpayCheckoutLink}
                method={paymentMethod}
                onMethodChange={handlePaymentMethodChange}
                isProcessing={isProcessing}
                lockMethods={isConfirmingPayment}
                onProcessingChange={setIsConfirmingPayment}
                enabled={{
                  stripe: isStripeEnabled,
                  paypal: isPayPalEnabled,
                  btcpay: isBTCPayEnabled,
                }}
                stripePublishableKey={payments.stripePublishableKey}
                paypalClientId={payments.paypalClientId}
                experiment={PRO_CHECKOUT_EXPERIMENT}
                experimentVariant={experimentVariant}
                amount={cart.total}
                currency={cart.currency_code}
                onSuccess={handleSuccess}
                onFailure={handleFailure}
              />
            ) : error ? (
              initErrorNotice
            ) : (
              <div className="space-y-3">
                <div className="h-6 w-40 animate-pulse rounded bg-muted" />
                <div className="h-24 w-full animate-pulse rounded bg-muted" />
                <p className="text-sm text-muted-foreground">
                  Preparing checkout...
                </p>
              </div>
            )}
          </div>
        </StepShell>
      </div>

      {/* Sticky order summary */}
      <div
        className="rounded-md border bg-card p-5 md:sticky md:top-24"
        data-testid="checkout-order-summary"
      >
        {cart && cart.items.length > 0 ? (
          <>
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between py-1">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity}
                  </p>
                </div>
                <p className="font-medium">
                  {formatCurrency(resolveLineItemTotal(item))}
                </p>
              </div>
            ))}
            <div className="mt-3 flex justify-between border-t pt-3 font-bold">
              <span>Total</span>
              <span>{formatCurrency(cart.total)}</span>
            </div>
          </>
        ) : offerSummary ? (
          <>
            <p className="font-medium">{offerSummary.title}</p>
            <div className="mt-3 flex justify-between border-t pt-3 font-bold">
              <span>Total</span>
              <span>{offerSummary.priceFormatted}</span>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </div>
        )}
        <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${toneText.positive}`} />
            Instant license delivery
          </li>
          <li className="flex gap-2">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${toneText.positive}`} />
            One-time payment — never auto-renews
          </li>
          <li className="flex gap-2">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${toneText.positive}`} />
            Secure payment processing
          </li>
        </ul>
      </div>
    </div>
  )
}
