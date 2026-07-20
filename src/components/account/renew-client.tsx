'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarClock, Loader2, ShieldCheck } from 'lucide-react'
import { useRouter, Link } from '@/i18n/navigation'
import { PaymentStep, type PaymentMethod } from '@/components/pro/checkout/payment-step'
import { createPaymentSession } from '@/components/pro/complete-cart'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toneText } from '@/components/ui/status-tone'
import {
  clearCheckoutSafetyStateForCart,
  createPaymentFailure,
  isProtectiveCheckoutFailureKind,
  recordCheckoutFailure,
  restoreCheckoutSafetyState,
  shouldBlockCheckout,
  type CheckoutFailure,
} from '@/components/pro/checkout-safety'
import { clientLogger } from '@/lib/client-logger'
import type { BillingAddress } from '@/components/pro/checkout/billing-step'
import type { CheckoutPaymentConfig } from '@/lib/checkout-payment-config'
import { PAYMENT_METHOD_PROVIDER_IDS } from '@/lib/checkout-payments'
import { getPlanByHandle } from '@/lib/plans'

const RENEWAL_CHECKOUT_CONTEXT = 'license_renewal'

/**
 * Attended one-click renewal (Phase 3b), approach A: a headless replay of the
 * normal checkout — create cart → add the yearly offer → prefilled billing →
 * payment session — then hand off to the SAME PaymentStep the storefront
 * checkout uses. That surface offers Card (Stripe, incl. express wallets),
 * PayPal and Bitcoin (BTCPay) whenever the deployment and backend both offer
 * them; each provider confirms in the browser and completes the cart into a
 * real order. The order-completed subscriber then renews the Keygen licence,
 * emails the key, records the order, and alerts the owner — exactly like any
 * purchase.
 *
 * No new backend: this reuses the store cart/line-item/payment-session/complete
 * routes. The server page resolves region, billing, the yearly offer, and the
 * host-keyed payment config (filtered to what the backend actually registers).
 */

interface RenewClientProps {
  regionId?: string
  /** Stable Pro offer handle to renew (yearly). */
  offerHandle: string
  billingAddress: BillingAddress
  taxNumber?: string
  amount: number
  currency: string
  priceFormatted: string
  productTitle: string
  /** Host-resolved public payment identifiers, already filtered to the
   *  providers the backend registers (see checkout-payments.ts). */
  payments: CheckoutPaymentConfig
}

type Phase = 'preparing' | 'ready' | 'error'

interface PaymentSession {
  provider_id: string
  data?: {
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

interface PreparedCart {
  id: string
  email?: string
  total?: number
  currency_code?: string
  payment_session?: PaymentSession
  payment_sessions?: PaymentSession[]
  payment_collection?: PaymentCollection
}

interface PaymentSessionResult {
  cart?: PreparedCart
  paymentCollectionId?: string | null
  clientSecret?: string | null
  customerSessionClientSecret?: string | null
}

/** The provider-id → session lookup mirrors the storefront checkout, so a
 *  method switch surfaces the PayPal order id / BTCPay link the same way. */
function resolvePaymentSession(
  cart: PreparedCart,
  providerId: string
): PaymentSession | undefined {
  return (
    cart.payment_collection?.payment_sessions?.find(
      (session) => session.provider_id === providerId
    ) ??
    cart.payment_sessions?.find(
      (session) => session.provider_id === providerId
    ) ??
    (cart.payment_session?.provider_id === providerId
      ? cart.payment_session
      : undefined)
  )
}

function derivePaymentSetup(payments: CheckoutPaymentConfig) {
  const stripeEnabled = Boolean(payments.stripePublishableKey)
  const paypalEnabled = Boolean(payments.paypal)
  const btcpayEnabled = payments.btcpayEnabled
  const anyEnabled = stripeEnabled || paypalEnabled || btcpayEnabled
  const defaultMethod: PaymentMethod = stripeEnabled
    ? 'stripe'
    : paypalEnabled
      ? 'paypal'
      : 'btcpay'
  return { stripeEnabled, paypalEnabled, btcpayEnabled, anyEnabled, defaultMethod }
}

export function RenewClient({
  regionId,
  offerHandle,
  billingAddress,
  taxNumber,
  amount,
  currency,
  priceFormatted,
  productTitle,
  payments,
}: RenewClientProps) {
  const t = useTranslations('account.renew')
  const locale = useLocale()
  const router = useRouter()

  const {
    stripeEnabled,
    paypalEnabled,
    btcpayEnabled,
    anyEnabled,
    defaultMethod,
  } = derivePaymentSetup(payments)

  const [phase, setPhase] = useState<Phase>('preparing')
  const [cart, setCart] = useState<PreparedCart | null>(null)
  const [paymentCollectionId, setPaymentCollectionId] = useState<string | null>(
    null
  )
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(defaultMethod)
  const [isProcessing, setIsProcessing] = useState(false)
  // True while a provider confirmation may be charging — locks method
  // switching WITHOUT unmounting the confirming form.
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  const [failure, setFailure] = useState<CheckoutFailure | null>(
    () => restoreCheckoutSafetyState()?.failure ?? null
  )
  const blocksCheckout = failure ? shouldBlockCheckout(failure) : false
  const startedRef = useRef(false)
  // Synchronous mutex for method switching: `isProcessing` is React state and
  // only gates the NEXT render, so two fast clicks can both pass its check and
  // start concurrent session mutations — whichever resolves last would clobber
  // `cart`/`clientSecret` for a method that's no longer selected.
  const switchingRef = useRef(false)

  const plan = getPlanByHandle(offerHandle)?.id

  useEffect(() => {
    if (blocksCheckout) return
    if (!anyEnabled) return
    if (startedRef.current) return
    startedRef.current = true
    let cancelled = false

    async function prepare() {
      try {
        const cartRes = await fetch('/api/store/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            region_id: regionId,
            metadata: {
              locale,
              experiment: RENEWAL_CHECKOUT_CONTEXT,
              variant: 'control',
            },
          }),
        })
        if (!cartRes.ok) throw new Error('cart')
        const { cart } = await cartRes.json()

        const itemRes = await fetch('/api/store/cart/line-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: cart.id,
            product: offerHandle,
            quantity: 1,
          }),
        })
        if (!itemRes.ok) throw new Error('line-item')

        const billingRes = await fetch('/api/store/cart', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: cart.id,
            billing_address: billingAddress,
            metadata: { taxNumber: taxNumber ?? null },
          }),
        })
        if (!billingRes.ok) throw new Error('billing')
        const { cart: billedCart } = (await billingRes.json()) as {
          cart?: PreparedCart
        }

        // Prime the default method's payment session so the step renders ready
        // to pay (a Card intent, or the PayPal/Bitcoin session for card-less
        // deployments). Switching methods re-primes via createPaymentSession.
        const session = await createPaymentSession<PaymentSessionResult>({
          cartId: cart.id,
          providerId: PAYMENT_METHOD_PROVIDER_IDS[defaultMethod],
          errorMessage: 'session',
        })

        // Card is useless without a client secret — fall back to full checkout
        // rather than render an inert form.
        if (defaultMethod === 'stripe' && !session.clientSecret) {
          throw new Error('session:client-secret')
        }

        if (cancelled) return
        setCart(session.cart ?? billedCart ?? cart)
        setPaymentCollectionId(
          session.paymentCollectionId ??
            session.cart?.payment_collection?.id ??
            billedCart?.payment_collection?.id ??
            null
        )
        setClientSecret(session.clientSecret ?? null)
        setCustomerSessionClientSecret(
          session.customerSessionClientSecret ?? null
        )
        setPhase('ready')
      } catch (error) {
        if (cancelled) return
        clientLogger.error('Renewal preparation failed', { error })
        setPhase('error')
      }
    }

    void prepare()
    return () => {
      cancelled = true
    }
  }, [
    regionId,
    offerHandle,
    billingAddress,
    taxNumber,
    blocksCheckout,
    anyEnabled,
    defaultMethod,
    locale,
  ])

  // Switch payment provider — re-primes the session for the chosen method,
  // exactly like the storefront checkout.
  const selectPaymentMethod = useCallback(
    async (method: PaymentMethod) => {
      if (!cart || !paymentCollectionId) return
      // Synchronous guard — one session mutation at a time (switchingRef is set
      // before the first await, so a second click made in the same render tick
      // is dropped rather than racing this one).
      if (switchingRef.current) return
      switchingRef.current = true

      // Snapshot the working session. Clearing clientSecret up-front unmounts
      // the Stripe Elements surface — including the express wallet — so a stale
      // PaymentIntent can't be confirmed (Apple/Google Pay) while the cart is
      // being moved to another provider. `paymentMethod` is NOT changed yet, so
      // on failure we restore this snapshot and the previously prepared method
      // stays selected and payable.
      const previousClientSecret = clientSecret
      const previousCustomerSessionClientSecret = customerSessionClientSecret

      setIsProcessing(true)
      setFailure(null)
      setClientSecret(null)
      setCustomerSessionClientSecret(null)

      try {
        const result = await createPaymentSession<PaymentSessionResult>({
          cartId: cart.id,
          providerId: PAYMENT_METHOD_PROVIDER_IDS[method],
          paymentCollectionId,
          errorMessage: 'PAYMENT_METHOD_SELECT_FAILED',
        })

        // Card without a client secret is unpayable — surface it instead of
        // leaving PaymentStep stuck on its preparing spinner (mirrors the
        // initial-prime guard in prepare()).
        if (method === 'stripe' && !result.clientSecret) {
          throw new Error('session:client-secret')
        }

        // Commit the selection only now that its session exists. Card carries a
        // client secret; PayPal/Bitcoin intentionally leave it null.
        if (result.cart) setCart(result.cart)
        if (method === 'stripe') {
          setClientSecret(result.clientSecret ?? null)
          setCustomerSessionClientSecret(
            result.customerSessionClientSecret ?? null
          )
        }
        setPaymentMethod(method)
      } catch (err) {
        // Restore the previous method's session — it was never deselected, so
        // it stays selected and payable with the failure surfaced above it.
        setClientSecret(previousClientSecret)
        setCustomerSessionClientSecret(previousCustomerSessionClientSecret)
        setFailure(
          createPaymentFailure(t('paymentNotConfigured'), {
            source: 'payment_method_switch',
            details: {
              cartId: cart.id,
              method,
              error: err instanceof Error ? err.message : err,
            },
          })
        )
      } finally {
        switchingRef.current = false
        setIsProcessing(false)
      }
    },
    [cart, paymentCollectionId, clientSecret, customerSessionClientSecret, t]
  )

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    if (method === paymentMethod) return
    // No optimistic selection: selectPaymentMethod commits paymentMethod only
    // after the new session succeeds, so the visible method always has a
    // usable session (a failed/in-flight switch never strands the form).
    void selectPaymentMethod(method)
  }

  function handleSuccess() {
    // An order definitively exists — the do-not-pay-again guard for THIS cart
    // can go. Scope it to the renewal cart: a session-wide clear would wipe an
    // order_pending / payment_uncertain guard belonging to a concurrent
    // checkout tab, re-enabling a second payment there. The order-completed
    // subscriber renews the licence server-side; the licenses page shows the
    // confirmation and new expiry once it lands.
    if (cart?.id) clearCheckoutSafetyStateForCart(cart.id)
    router.push('/account/licenses?renewed=1')
  }

  const activeCartId = cart?.id ?? null
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

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-xl">
        <Alert tone="critical" className="mb-4">
          <p className="mb-3">{t('errorBody')}</p>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/pro/checkout?product=${offerHandle}`}
              prefetch={false}
            >
              {t('goToCheckout')}
            </Link>
          </Button>
        </Alert>
      </div>
    )
  }

  const paypalSession = cart
    ? resolvePaymentSession(cart, PAYMENT_METHOD_PROVIDER_IDS.paypal)
    : undefined
  const btcpaySession = cart
    ? resolvePaymentSession(cart, PAYMENT_METHOD_PROVIDER_IDS.btcpay)
    : undefined
  const paypalOrderId =
    typeof paypalSession?.data?.id === 'string' ? paypalSession.data.id : null
  const btcpayCheckoutLink =
    typeof btcpaySession?.data?.checkoutLink === 'string'
      ? btcpaySession.data.checkoutLink
      : null

  const paymentReady = !blocksCheckout && phase === 'ready' && cart != null

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Summary */}
      <div
        className="overflow-hidden rounded-xl border bg-card shadow-sm"
        data-testid="renew-summary"
      >
        <div className="flex items-center gap-2 border-b bg-muted/40 px-5 py-3 text-sm font-medium text-muted-foreground">
          <CalendarClock className="h-4 w-4" aria-hidden />
          {t('summaryLabel')}
        </div>
        <div className="p-5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-lg font-semibold">{productTitle}</span>
            <span className="whitespace-nowrap text-xl font-bold">
              {priceFormatted}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                {currency.toUpperCase()}
              </span>
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('extendsNote')}
          </p>
        </div>
      </div>

      {failure && (
        <Alert tone="critical" data-testid="renew-failure">
          {failure.message}
        </Alert>
      )}

      {/* Payment */}
      {blocksCheckout ? null : !anyEnabled ? (
        <Alert tone="critical">{t('paymentNotConfigured')}</Alert>
      ) : !paymentReady ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t('preparing')}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <PaymentStep
            cartId={cart!.id}
            clientSecret={clientSecret}
            customerSessionClientSecret={customerSessionClientSecret}
            paypalOrderId={paypalOrderId}
            btcpayCheckoutLink={btcpayCheckoutLink}
            method={paymentMethod}
            onMethodChange={handlePaymentMethodChange}
            isProcessing={isProcessing}
            lockMethods={isConfirmingPayment}
            onProcessingChange={setIsConfirmingPayment}
            enabled={{
              stripe: stripeEnabled,
              paypal: paypalEnabled,
              btcpay: btcpayEnabled,
            }}
            stripePublishableKey={payments.stripePublishableKey}
            paypal={payments.paypal}
            plan={plan}
            locale={locale}
            experiment={RENEWAL_CHECKOUT_CONTEXT}
            experimentVariant="control"
            billingAddress={billingAddress}
            customerEmail={cart!.email}
            amount={cart!.total ?? amount}
            currency={cart!.currency_code ?? currency}
            onSuccess={handleSuccess}
            onFailure={handleFailure}
          />
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
        <ShieldCheck className={`h-4 w-4 ${toneText.positive}`} aria-hidden />
        {t('secureNote')}
      </p>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/account/licenses"
          prefetch={false}
          className="underline underline-offset-2 hover:no-underline"
        >
          {t('cancel')}
        </Link>
      </p>
    </div>
  )
}
