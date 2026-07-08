'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarClock, Loader2 } from 'lucide-react'
import { useRouter, Link } from '@/i18n/navigation'
import { StripeProvider } from '@/components/pro/stripe-provider'
import { CheckoutForm } from '@/components/pro/checkout-form'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  isProtectiveCheckoutFailureKind,
  recordCheckoutFailure,
  restoreCheckoutSafetyState,
  shouldBlockCheckout,
  type CheckoutFailure,
} from '@/components/pro/checkout-safety'
import { clientLogger } from '@/lib/client-logger'
import type { BillingAddress } from '@/components/pro/checkout/billing-step'

/**
 * Attended one-click renewal (Phase 3b), approach A: a headless replay of the
 * normal checkout — create cart → add the yearly offer → prefilled billing →
 * payment session (with the CustomerSession that surfaces the saved card) —
 * then the SAME CheckoutForm the storefront checkout uses. Stripe confirms in
 * the browser (so 3DS works, customer present) and CheckoutForm completes the
 * cart, producing a real order; the order-completed subscriber then renews the
 * Keygen licence, emails the key, records the order, and alerts the owner —
 * exactly like any purchase.
 *
 * No new backend: this reuses the store cart/line-item/payment-session/complete
 * routes. The server page resolves region, billing, and the yearly offer.
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
  stripePublishableKey: string | null
}

type Phase = 'preparing' | 'ready' | 'error'
type PreparedCart = {
  id: string
  total?: number
  currency_code?: string
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
  stripePublishableKey,
}: RenewClientProps) {
  const t = useTranslations('account.renew')
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('preparing')
  const [cart, setCart] = useState<PreparedCart | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    useState<string | null>(null)
  const [failure, setFailure] = useState<CheckoutFailure | null>(
    () => restoreCheckoutSafetyState()?.failure ?? null
  )
  const blocksCheckout = failure ? shouldBlockCheckout(failure) : false
  const startedRef = useRef(false)

  useEffect(() => {
    if (blocksCheckout) return
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
            metadata: { renewal: true },
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

        const sessionRes = await fetch('/api/store/cart/payment-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId: cart.id }),
        })
        if (!sessionRes.ok) throw new Error('session')
        const session = await sessionRes.json()
        if (!session.clientSecret) throw new Error('session:client-secret')

        if (cancelled) return
        setCart(session.cart ?? billedCart ?? cart)
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
  }, [regionId, offerHandle, billingAddress, taxNumber, blocksCheckout])

  function handleSuccess() {
    // The order-completed subscriber renews the licence server-side; the
    // licenses page shows a confirmation and the new expiry once it lands.
    router.push('/account/licenses?renewed=1')
  }

  function handleFailure(nextFailure: CheckoutFailure | null) {
    setFailure(nextFailure)
    if (
      nextFailure &&
      cart?.id &&
      isProtectiveCheckoutFailureKind(nextFailure.kind)
    ) {
      recordCheckoutFailure(cart.id, nextFailure)
    }
  }

  if (phase === 'error') {
    return (
      <Alert tone="critical" className="mb-4">
        <p className="mb-3">{t('errorBody')}</p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/pro/checkout?product=${offerHandle}`} prefetch={false}>
            {t('goToCheckout')}
          </Link>
        </Button>
      </Alert>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div
        className="rounded-md border bg-card p-5"
        data-testid="renew-summary"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" aria-hidden />
          {t('summaryLabel')}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-medium">{productTitle}</span>
          <span className="font-bold">
            {priceFormatted}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              {currency.toUpperCase()}
            </span>
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t('extendsNote')}</p>
      </div>

      {failure && (
        <Alert tone="critical" data-testid="renew-failure">
          {failure.message}
        </Alert>
      )}

      {blocksCheckout ? null : phase === 'preparing' || !clientSecret || !cart ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t('preparing')}
        </div>
      ) : (
        <StripeProvider
          clientSecret={clientSecret}
          customerSessionClientSecret={customerSessionClientSecret}
          publishableKey={stripePublishableKey}
          notConfiguredMessage={t('paymentNotConfigured')}
        >
          <CheckoutForm
            cartId={cart.id}
            amount={cart.total ?? amount}
            currency={cart.currency_code ?? currency}
            experiment="license_renewal"
            experimentVariant="control"
            onSuccess={handleSuccess}
            onFailure={handleFailure}
          />
        </StripeProvider>
      )}

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
