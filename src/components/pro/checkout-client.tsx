'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { createPaymentSession } from './complete-cart'
import { CheckoutErrorNotice, OrderPendingNotice } from './checkout-recovery'
import {
  clearCheckoutSafetyStateForCart,
  clearCheckoutSafetyState,
  createPaymentFailure,
  isProtectiveCheckoutFailureKind,
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
import { PAYMENT_METHOD_PROVIDER_IDS } from '@/lib/checkout-payments'
import { StepShell } from './checkout/step-shell'
import { Button } from '@/components/ui/button'
import { toneText } from '@/components/ui/status-tone'
import { ArrowLeft, Check, CheckCircle } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { CheckoutPaymentConfig } from '@/lib/checkout-payment-config'
import { localizeKnownProductTitle } from '@/lib/product-title-display'
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
  /** Stripe CustomerSession secret → optional save-card checkbox (yearly+card). */
  customerSessionClientSecret?: string | null
}

interface OfferSummary {
  title: string
  priceFormatted: string
  currencyCode?: string
}

const PRO_CHECKOUT_EXPERIMENT = 'pro_checkout_v1'
const CHECKOUT_SAFETY_RESET_PARAM = 'reset_checkout'
const CHECKOUT_SAFETY_RESET_VALUE = 'order_pending'
const CHECKOUT_SAFETY_RESET_REFERENCE_PARAM = 'checkout_ref'

function consumeCheckoutSafetyResetParams(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(CHECKOUT_SAFETY_RESET_PARAM)
  url.searchParams.delete(CHECKOUT_SAFETY_RESET_REFERENCE_PARAM)
  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`
  )
}

// Map frontend payment method names to Medusa provider IDs. The Record is
// total over PaymentMethod, so adding a method without a provider id is a
// compile error — no runtime fallback.
function getProviderId(method: PaymentMethod): string {
  return PAYMENT_METHOD_PROVIDER_IDS[method]
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

type StepId = 'account' | 'billing' | 'payment'

interface CheckoutClientProps {
  /** Absent when the visitor is not signed in — the account step handles it. */
  customerEmail?: string
  /**
   * Saved profile address (customer.metadata.account_profile) to prefill the
   * billing form with. Prefill only — billingAddress state stays "what was
   * submitted", so the step summary never shows an unsaved address.
   */
  initialBillingAddress?: BillingAddress | null
  /** Saved profile tax registration (ABN/VAT/EIN…) to prefill. */
  initialTaxNumber?: string
  selectedOfferHandle?: string
  cartRegionId?: string
  /** Static summary shown before the cart exists. */
  offerSummary?: OfferSummary
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
  initialBillingAddress,
  initialTaxNumber,
  selectedOfferHandle,
  cartRegionId,
  offerSummary,
  checkoutPath,
  experimentVariant,
  payments,
}: CheckoutClientProps) {
  const locale = useLocale()
  const t = useTranslations('pro.checkout')
  const productTitleT = useTranslations('account.productTitles')
  const productTitleMessages = {
    yearly: productTitleT('yearly'),
    lifetime: productTitleT('lifetime'),
  }
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
  // Submitted tax number — StepShell unmounts BillingStep between visits, so
  // Edit must re-seed the field with what was last saved, not the page-load
  // profile prefill. null = never submitted.
  const [taxNumber, setTaxNumber] = useState<string | null>(null)
  const [cart, setCart] = useState<Cart | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  // True while a provider confirmation may be charging the customer —
  // billing Edit and method switching are locked for its duration.
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  // Blocking initialization errors (cart could not be created at all).
  const [error, setError] = useState<string | null>(null)
  // Payment-stage failures — recoverable, rendered without unmounting the cart.
  const [failure, setFailure] = useState<CheckoutFailure | null>(null)
  const [restoredOrderPendingGuardCartId, setRestoredOrderPendingGuardCartId] =
    useState<string | null>(null)
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

  const prerequisiteError = !selectedOfferHandle
    ? t('errors.noProductSelected')
    : null

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
      const searchParams = new URLSearchParams(window.location.search)
      const applyRestored = (
        restored: ReturnType<typeof restoreCheckoutSafetyState>
      ) => {
        if (!restored) {
          setFailure(null)
          setRestoredOrderPendingGuardCartId(null)
          return
        }

        setFailure(restored.failure)
        setRestoredOrderPendingGuardCartId(
          restored.failure.kind === 'order_pending' ? restored.cartId : null
        )
      }

      if (
        searchParams.get(CHECKOUT_SAFETY_RESET_PARAM) ===
        CHECKOUT_SAFETY_RESET_VALUE
      ) {
        const restored = restoreCheckoutSafetyState()
        const resetReference = searchParams.get(
          CHECKOUT_SAFETY_RESET_REFERENCE_PARAM
        )
        if (
          restored?.failure.kind === 'order_pending' &&
          resetReference === restored.failure.reference
        ) {
          clearCheckoutSafetyStateForCart(restored.cartId)
        }
        consumeCheckoutSafetyResetParams()
        applyRestored(restoreCheckoutSafetyState())
        setSafetyRestored(true)
        return
      }
      applyRestored(restoreCheckoutSafetyState())
      setSafetyRestored(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const resetOrderPendingGuard = useCallback(() => {
    if (restoredOrderPendingGuardCartId) {
      clearCheckoutSafetyStateForCart(restoredOrderPendingGuardCartId)
    }
    window.location.reload()
  }, [restoredOrderPendingGuardCartId])

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
            region_id: cartRegionId,
            metadata: {
              experiment: PRO_CHECKOUT_EXPERIMENT,
              variant: experimentVariant,
              locale,
            },
          }),
        })

        if (!cartResponse.ok) {
          throw new Error('CART_CREATE_FAILED')
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
          throw new Error('CART_ADD_ITEM_FAILED')
        }

        const { cart: cartWithItem } = await itemResponse.json()

        // Keep initialization limited to the cart. Creating a Medusa payment
        // session for Stripe immediately creates a Stripe PaymentIntent, so do
        // that only after billing is submitted and the payment step is about to
        // render.
        const initialPaymentCollectionId =
          cartWithItem.payment_collection?.id ?? null
        setCart(cartWithItem)
        setPaymentCollectionId(initialPaymentCollectionId)
        cartReadyRef.current?.resolve({
          cart: cartWithItem,
          paymentCollectionId: initialPaymentCollectionId,
        })
      } catch (err) {
        console.error('[CHECKOUT] Initialization failed:', err)
        setError(
          err instanceof Error ? err.message : 'CHECKOUT_INIT_FAILED'
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
    cartRegionId,
    experimentVariant,
    locale,
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
          errorMessage: 'PAYMENT_METHOD_SELECT_FAILED',
        })

        setCart(paymentResult.cart)

        if (method === 'stripe' && paymentResult.clientSecret) {
          setClientSecret(paymentResult.clientSecret)
        }
        if (method === 'stripe') {
          setCustomerSessionClientSecret(
            paymentResult.customerSessionClientSecret ?? null
          )
        }
      } catch (err) {
        setFailure(
          createPaymentFailure(t('errors.methodSwitchFailed'), {
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
    [cart, paymentCollectionId, isProcessing, t]
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
      setRestoredOrderPendingGuardCartId(null)
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

  async function handleBillingSubmit(
    address: BillingAddress,
    extras: { taxNumber: string }
  ) {
    // Serialize against method switches and other refreshes — two session
    // mutations racing can leave the mounted Stripe element and the Medusa
    // collection pointing at different intents.
    if (isProcessing) {
      throw new Error(t('errors.checkoutBusy'))
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
          // Not a Medusa address field — travels as cart metadata so it
          // lands on the order record. Always sent (even empty) so clearing
          // a previously entered number actually removes it.
          metadata: { taxNumber: extras.taxNumber },
        }),
      })
      if (!response.ok) {
        throw new Error('BILLING_SAVE_FAILED')
      }
      const { cart: updatedCart } = (await response.json()) as { cart?: Cart }
      const cartAfterBilling = updatedCart ?? init.cart

      // No provider configured — nothing to refresh; PaymentStep shows its
      // explicit no-methods state.
      if (!anyPaymentMethodEnabled) {
        setCart(cartAfterBilling)
        setBillingAddress(address)
        setTaxNumber(extras.taxNumber)
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
          errorMessage: 'PAYMENT_REFRESH_FAILED',
        })
      } catch {
        throw Object.assign(
          new Error(t('errors.paymentRefreshFailed')),
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
      setCustomerSessionClientSecret(
        paymentMethod === 'stripe'
          ? paymentResult.customerSessionClientSecret ?? null
          : null
      )
      setBillingAddress(address)
      setTaxNumber(extras.taxNumber)
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
            {t('backToPricing')}
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
          {t('complete.title')}
        </h2>
        <p className="mb-4 text-muted-foreground">
          {t('complete.description')}
        </p>
        {orderId && (
          <p className="mb-6 text-sm text-muted-foreground">
            {t('complete.orderId', { orderId })}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/account/licenses">{t('complete.licenses')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">{t('complete.home')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Payment captured but order creation failed — the worst customer state.
  // Replaces the whole checkout so the customer cannot pay a second time.
  if (failure?.kind === 'order_pending') {
    return (
      <OrderPendingNotice
        failure={failure}
        onReset={
          restoredOrderPendingGuardCartId ? resetOrderPendingGuard : undefined
        }
      />
    )
  }

  const currencyCode = (cart?.currency_code ?? 'usd').toUpperCase()
  const offerSummaryCurrencyCode = (
    offerSummary?.currencyCode ?? currencyCode
  ).toUpperCase()
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
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
        {t('errors.initializeFailed')}
      </p>
      <Button asChild variant="outline">
        <Link href="/pro">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToPricing')}
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
          title={t('steps.account')}
          summary={email ?? undefined}
          state={stepState('account')}
          editLabel={t('edit')}
        >
          <AccountStep
            checkoutPath={checkoutPath}
            onAuthenticated={handleAuthenticated}
          />
        </StepShell>

        <StepShell
          index={2}
          title={t('steps.billing')}
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
          editLabel={t('edit')}
        >
          {error ? (
            initErrorNotice
          ) : (
            <BillingStep
              initialAddress={billingAddress ?? initialBillingAddress ?? null}
              initialTaxNumber={taxNumber ?? initialTaxNumber}
              onSubmit={handleBillingSubmit}
            />
          )}
        </StepShell>

        <StepShell
          index={3}
          title={t('steps.payment')}
          state={stepState('payment')}
          editLabel={t('edit')}
        >
          <div className="space-y-4">
            {cart ? (
              <PaymentStep
                cartId={cart.id}
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
                  stripe: isStripeEnabled,
                  paypal: isPayPalEnabled,
                  btcpay: isBTCPayEnabled,
                }}
                stripePublishableKey={payments.stripePublishableKey}
                paypal={payments.paypal}
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
                  {t('preparing')}
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
                  <p className="font-medium">
                    {localizeKnownProductTitle(item.title, productTitleMessages)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('summary.quantity', { quantity: item.quantity })}
                  </p>
                </div>
                <p className="font-medium">
                  {formatCurrency(resolveLineItemTotal(item))}
                </p>
              </div>
            ))}
            <div className="mt-3 flex justify-between border-t pt-3 font-bold">
              <span>{t('summary.total')}</span>
              <span>
                {formatCurrency(cart.total)}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  {currencyCode}
                </span>
              </span>
            </div>
          </>
        ) : offerSummary ? (
          <>
            <p className="font-medium">{offerSummary.title}</p>
            <div className="mt-3 flex justify-between border-t pt-3 font-bold">
              <span>{t('summary.total')}</span>
              <span>
                {offerSummary.priceFormatted}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  {offerSummaryCurrencyCode}
                </span>
              </span>
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
            {t('summary.instantLicense')}
          </li>
          <li className="flex gap-2">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${toneText.positive}`} />
            {t('summary.oneTimePayment')}
          </li>
          <li className="flex gap-2">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${toneText.positive}`} />
            {t('summary.securePayment')}
          </li>
        </ul>
      </div>
    </div>
  )
}
