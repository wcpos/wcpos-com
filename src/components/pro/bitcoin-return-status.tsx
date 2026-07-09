'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Bitcoin, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link, useRouter } from '@/i18n/navigation'
import { toneText } from '@/components/ui/status-tone'

/** Matches the wire states of /api/store/cart/payment-status. */
type PaymentState =
  | 'checking'
  | 'completed'
  | 'confirming'
  | 'awaiting_payment'
  | 'expired'
  | 'payment_issue'
  | 'no_payment'
  | 'unknown'
  | 'unauthenticated'
  | 'error'

const POLL_INTERVAL_MS = 5000

// States that end the poll loop. Every payment-derived state keeps watching:
// they come from non-authoritative invoice data and can race the webhook that
// completes the cart — only completion itself (or a lost session) is final.
const TERMINAL_STATES: ReadonlySet<PaymentState> = new Set([
  'completed',
  'unauthenticated',
])

interface BitcoinReturnStatusProps {
  cartId: string
}

/**
 * Landing state for customers returning from the BTCPay invoice page
 * (BTCPay redirects to /processing?cart=...). The order itself is created
 * server-side by the BTCPay webhook — this page only reports progress and
 * forwards to the success page once the cart has become an order.
 */
export function BitcoinReturnStatus({ cartId }: BitcoinReturnStatusProps) {
  const t = useTranslations('pro.checkout.processingPage')
  const router = useRouter()
  const [state, setState] = useState<PaymentState>('checking')
  const [checkoutLink, setCheckoutLink] = useState<string | null>(null)
  const [variantId, setVariantId] = useState<string | null>(null)

  // Resolves to the next state, or null on a transient failure (bad payload,
  // network hiccup, 5xx) that shouldn't disturb what the customer sees.
  const poll = useCallback(async (): Promise<PaymentState | null> => {
    try {
      const response = await fetch(
        `/api/store/cart/payment-status?cartId=${encodeURIComponent(cartId)}`
      )
      if (response.status === 401) {
        return 'unauthenticated'
      }
      if (!response.ok) {
        return null
      }
      const body = (await response.json()) as {
        state?: string
        checkoutLink?: string | null
        variantId?: string | null
      }
      setCheckoutLink(body.checkoutLink ?? null)
      setVariantId(body.variantId ?? null)
      switch (body.state) {
        case 'completed':
        case 'confirming':
        case 'awaiting_payment':
        case 'expired':
        case 'payment_issue':
        case 'no_payment':
        case 'unknown':
          return body.state
        default:
          return null
      }
    } catch {
      return null
    }
  }, [cartId])

  useEffect(() => {
    if (state === 'completed') {
      router.replace('/pro/checkout/success')
    }
  }, [state, router])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      const next = await poll()
      if (cancelled) {
        return
      }
      if (next === 'unknown') {
        // Inconclusive invoice data: keep whatever the customer currently
        // sees (the neutral checking state on first load) and keep watching.
      } else if (next) {
        setState(next)
      } else {
        // Transient failures shouldn't scare a paying customer: only surface
        // an error state when even the initial check couldn't complete.
        setState((prev) => (prev === 'checking' ? 'error' : prev))
      }
      if (!next || !TERMINAL_STATES.has(next)) {
        timer = setTimeout(tick, POLL_INTERVAL_MS)
      }
    }
    void tick()

    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [poll])

  if (state === 'checking' || state === 'completed') {
    return (
      <StatusShell
        icon={<Bitcoin className="h-20 w-20 mx-auto mb-6 text-muted-foreground animate-pulse" />}
        title={t('checking.title')}
        description={t('checking.description')}
      />
    )
  }

  if (state === 'confirming') {
    return (
      <StatusShell
        icon={<Clock className={`h-20 w-20 mx-auto mb-6 ${toneText.positive}`} />}
        title={t('confirming.title')}
        description={t('confirming.description')}
      >
        <p className="text-sm text-muted-foreground">{t('confirming.hint')}</p>
      </StatusShell>
    )
  }

  if (state === 'awaiting_payment') {
    return (
      <StatusShell
        icon={<Bitcoin className="h-20 w-20 mx-auto mb-6 text-muted-foreground" />}
        title={t('awaiting.title')}
        description={t('awaiting.description')}
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {checkoutLink ? (
            <Button asChild>
              {/* BTCPay-hosted invoice page — plain anchor, not locale-aware */}
              <a href={checkoutLink}>{t('awaiting.reopenInvoice')}</a>
            </Button>
          ) : null}
          <ResumeCheckoutButton variantId={variantId} buttonVariant="outline" />
        </div>
      </StatusShell>
    )
  }

  if (state === 'payment_issue') {
    return (
      <StatusShell
        icon={<AlertTriangle className={`h-20 w-20 mx-auto mb-6 ${toneText.caution}`} />}
        title={t('paymentIssue.title')}
        description={t('paymentIssue.description')}
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/account/orders">{t('error.viewOrders')}</Link>
          </Button>
          {/* The copy says "contact us" — give that an affordance: no order
              exists yet in this state, so support is what resolves it. */}
          <Button asChild variant="outline">
            <Link href="/support">{t('paymentIssue.contactSupport')}</Link>
          </Button>
        </div>
      </StatusShell>
    )
  }

  if (state === 'expired' || state === 'no_payment') {
    return (
      <StatusShell
        icon={<XCircle className={`h-20 w-20 mx-auto mb-6 ${toneText.critical}`} />}
        title={t('expired.title')}
        description={t('expired.description')}
      >
        <ResumeCheckoutButton variantId={variantId} />
      </StatusShell>
    )
  }

  if (state === 'unauthenticated') {
    return (
      <StatusShell
        icon={<CheckCircle className="h-20 w-20 mx-auto mb-6 text-muted-foreground" />}
        title={t('signIn.title')}
        description={t('signIn.description')}
      >
        <Button asChild>
          <Link
            href={{
              pathname: '/login',
              query: { redirect: `/processing?cart=${cartId}` },
            }}
          >
            {t('signIn.action')}
          </Link>
        </Button>
      </StatusShell>
    )
  }

  return (
    <StatusShell
      icon={<XCircle className={`h-20 w-20 mx-auto mb-6 ${toneText.critical}`} />}
      title={t('error.title')}
      description={t('error.description')}
    >
      <Button asChild variant="outline">
        <Link href="/account/orders">{t('error.viewOrders')}</Link>
      </Button>
    </StatusShell>
  )
}

/**
 * Sends the customer back to a checkout that still knows what they were
 * buying. A bare /pro/checkout has no product or variant param and renders
 * "no product selected", so without the cart's variant the only honest
 * destination is the pricing page.
 */
function ResumeCheckoutButton({
  variantId,
  buttonVariant = 'default',
}: {
  variantId: string | null
  buttonVariant?: 'default' | 'outline'
}) {
  const t = useTranslations('pro.checkout.processingPage')

  return (
    <Button asChild variant={buttonVariant}>
      {variantId ? (
        <Link href={{ pathname: '/pro/checkout', query: { variant: variantId } }}>
          {t('backToCheckout')}
        </Link>
      ) : (
        <Link href="/pro">{t('backToPricing')}</Link>
      )}
    </Button>
  )
}

function StatusShell({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        {icon}
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
        <p className="text-lg text-muted-foreground mb-8">{description}</p>
        {children}
      </div>
    </main>
  )
}
