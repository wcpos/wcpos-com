'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarClock, Loader2 } from 'lucide-react'
import { useRouter, Link } from '@/i18n/navigation'
import { StripeProvider } from '@/components/pro/stripe-provider'
import { CheckoutForm } from '@/components/pro/checkout-form'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { CheckoutFailure } from '@/components/pro/checkout-safety'
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
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('preparing')
  const [cartId, setCartId] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    useState<string | null>(null)
  const [failure, setFailure] = useState<CheckoutFailure | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

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

        const sessionRes = await fetch('/api/store/cart/payment-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId: cart.id }),
        })
        if (!sessionRes.ok) throw new Error('session')
        const session = await sessionRes.json()

        setCartId(cart.id)
        setClientSecret(session.clientSecret ?? null)
        setCustomerSessionClientSecret(
          session.customerSessionClientSecret ?? null
        )
        setPhase('ready')
      } catch {
        setPhase('error')
      }
    }

    void prepare()
  }, [regionId, offerHandle, billingAddress, taxNumber])

  function handleSuccess() {
    // The order-completed subscriber renews the licence server-side; the
    // licenses page shows a confirmation and the new expiry once it lands.
    router.push('/account/licenses?renewed=1')
  }

  if (phase === 'error') {
    return (
      <Alert tone="critical" className="mb-4">
        <p className="mb-3">
          We couldn&apos;t start your renewal just now. You can renew from the
          full checkout instead.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/pro/checkout?product=${offerHandle}`} prefetch={false}>
            Go to checkout
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
          Renewing your licence
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
        <p className="mt-2 text-sm text-muted-foreground">
          Extends your current licence by one year — no days are lost if you
          renew early.
        </p>
      </div>

      {failure && (
        <Alert tone="critical" data-testid="renew-failure">
          {failure.message}
        </Alert>
      )}

      {phase === 'preparing' || !clientSecret || !cartId ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Preparing your renewal…
        </div>
      ) : (
        <StripeProvider
          clientSecret={clientSecret}
          customerSessionClientSecret={customerSessionClientSecret}
          publishableKey={stripePublishableKey}
        >
          <CheckoutForm
            cartId={cartId}
            amount={amount}
            currency={currency}
            experiment="license_renewal"
            experimentVariant="control"
            onSuccess={handleSuccess}
            onFailure={setFailure}
          />
        </StripeProvider>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/account/licenses"
          prefetch={false}
          className="underline underline-offset-2 hover:no-underline"
        >
          Cancel
        </Link>
      </p>
    </div>
  )
}
