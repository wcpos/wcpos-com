'use client'

import { useId, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Bitcoin, CreditCard } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { TextLink } from '@/components/ui/text-link'
import { StripeProvider } from '../stripe-provider'
import { PayPalProvider } from '../paypal-provider'
import { CheckoutForm } from '../checkout-form'
import { PayPalButton } from '../paypal-button'
import { BTCPayButton } from '../btcpay-button'
import { ExpressCheckoutRow } from './express-checkout'
import type { CheckoutFailure } from '../checkout-safety'
import type { PayPalCheckoutConfig } from '@/lib/checkout-payment-config'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import type { PlanId } from '@/lib/plans'
import type { CheckoutPaymentProvider } from '@/lib/analytics/checkout-payment-events'
import {
  beginCheckoutPaymentAttempt,
  captureCheckoutPaymentFailure,
} from '@/lib/analytics/checkout-payment-lifecycle'
import type { BillingAddress } from './billing-step'

export type PaymentMethod = 'stripe' | 'paypal' | 'btcpay'

/**
 * Payment step: wallet buttons on top (when a wallet is available), then a
 * radio accordion where Card is the default and PayPal / Bitcoin are
 * equally visible rows. Each row expands into the existing provider
 * component — all confirmation, completion, and failure semantics live in
 * those components and in checkout-safety, unchanged.
 */
function MethodRow({
  selected,
  disabled,
  onSelect,
  icon,
  title,
  hint,
  testId,
  children,
}: {
  selected: boolean
  disabled: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: React.ReactNode
  hint: string
  testId: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-md border transition-colors ${
        selected ? 'border-primary bg-primary/[0.03]' : 'border-border'
      }`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={onSelect}
        data-testid={testId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-60"
      >
        <span
          aria-hidden
          className={`h-4 w-4 shrink-0 rounded-full border-2 ${
            selected
              ? 'border-primary bg-primary [box-shadow:inset_0_0_0_2.5px_var(--card)]'
              : 'border-muted-foreground/40'
          }`}
        />
        <span className="flex items-center gap-2 font-medium">
          {icon}
          {title}
        </span>
        <span className="ml-auto text-right text-xs text-muted-foreground">
          {hint}
        </span>
      </button>
      {selected && children && <div className="border-t px-4 py-4">{children}</div>}
    </div>
  )
}

interface PaymentStepProps {
  cartId: string
  clientSecret: string | null
  /** Stripe CustomerSession secret → enables the optional save-card checkbox. */
  customerSessionClientSecret: string | null
  paypalOrderId: string | null
  btcpayCheckoutLink: string | null
  method: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  isProcessing: boolean
  /**
   * True while a provider confirmation may be charging the customer —
   * locks method switching WITHOUT unmounting the confirming form.
   */
  lockMethods?: boolean
  enabled: { stripe: boolean; paypal: boolean; btcpay: boolean }
  /** Host-resolved public identifiers for the provider SDKs. */
  stripePublishableKey: string | null
  paypal: PayPalCheckoutConfig
  plan?: PlanId
  locale: string
  experiment: string
  experimentVariant: ProCheckoutVariant
  billingAddress: BillingAddress
  customerEmail?: string | null
  amount: number
  currency: string
  onSuccess: (orderId: string) => void
  onFailure: (failure: CheckoutFailure | null) => void
  /** Bubbles provider confirm-in-flight up (locks billing Edit etc.). */
  onProcessingChange?: (processing: boolean) => void
}

/**
 * Immediate-supply consent — the statutory gate, not a nicety.
 *
 * WCPOS Pro is digital content delivered the moment the order completes, so
 * the 14-day right of withdrawal (Consumer Rights Directive art. 16(1)(m),
 * as amended by (EU) 2019/2161) only falls away when the buyer has given
 * prior express consent to that immediate supply AND acknowledged losing the
 * right. Unticked by default and separate from any other agreement: a
 * pre-ticked or bundled box does not count as express consent.
 *
 * No payment control is rendered until it is ticked — the consent has to
 * precede supply, and not rendering is the only version of that we can't
 * accidentally regress past.
 */
function ConsentGate({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}) {
  const t = useTranslations('pro.checkout.payment.consent')
  const id = useId()

  return (
    <div className="rounded-md border border-border bg-muted/30 p-4">
      <div className="flex gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          data-testid="checkout-supply-consent"
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
        />
        <label htmlFor={id} className="text-sm leading-6 text-muted-foreground">
          {t.rich('label', {
            policy: (chunks: ReactNode) => (
              <TextLink asChild>
                <Link href="/refunds" target="_blank">
                  {chunks}
                </Link>
              </TextLink>
            ),
          })}
        </label>
      </div>
    </div>
  )
}

/** Stands in for a provider's pay controls until consent is given. */
function ConsentPending() {
  const t = useTranslations('pro.checkout.payment.consent')
  return (
    <p className="text-sm text-muted-foreground" data-testid="consent-pending">
      {t('gate')}
    </p>
  )
}

/** Placeholder shown while a session mutation is in flight — the previous
 * session's pay buttons/links must not be clickable against stale data. */
function PreparingMethod() {
  const t = useTranslations('pro.checkout.payment')
  return (
    <div className="space-y-3 rounded-md border border-dashed p-4">
      <div className="h-5 w-44 animate-pulse rounded bg-muted" />
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
      <p className="text-sm text-muted-foreground">{t('preparing')}</p>
    </div>
  )
}

export function PaymentStep({
  cartId,
  clientSecret,
  customerSessionClientSecret,
  paypalOrderId,
  btcpayCheckoutLink,
  method,
  onMethodChange,
  isProcessing,
  lockMethods = false,
  enabled,
  stripePublishableKey,
  paypal,
  plan,
  locale,
  experiment,
  experimentVariant,
  billingAddress,
  customerEmail,
  amount,
  currency,
  onSuccess,
  onFailure,
  onProcessingChange,
}: PaymentStepProps) {
  const t = useTranslations('pro.checkout.payment')
  const [hasConsented, setHasConsented] = useState(false)
  const enabledCount = [enabled.stripe, enabled.paypal, enabled.btcpay].filter(
    Boolean
  ).length

  const eventContext = {
    cartId,
    plan,
    experiment,
    variant: experimentVariant,
    locale,
  }

  const onProviderAttempt = (paymentProvider: CheckoutPaymentProvider) =>
    () => beginCheckoutPaymentAttempt({ paymentProvider, ...eventContext })

  const onProviderFailure = (paymentProvider: CheckoutPaymentProvider) =>
    (failure: CheckoutFailure | null) => {
      onFailure(failure)
      if (!failure) return

      captureCheckoutPaymentFailure(
        { paymentProvider, ...eventContext },
        failure.kind
      )
    }

  if (enabledCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('noneConfigured')}
      </p>
    )
  }

  const selector = (
    <div className="space-y-2" role="radiogroup" aria-label={t('ariaLabel')}>
      {enabled.stripe && (
        <MethodRow
          selected={method === 'stripe'}
          disabled={isProcessing || lockMethods}
          onSelect={() => onMethodChange('stripe')}
          icon={<CreditCard className="h-4 w-4" aria-hidden />}
          title={t('methods.card.title')}
          hint={t('methods.card.hint')}
          testId="payment-method-stripe"
        >
          {!hasConsented ? (
            <ConsentPending />
          ) : isProcessing || !clientSecret ? (
            <PreparingMethod />
          ) : (
            <CheckoutForm
              cartId={cartId}
              amount={amount}
              currency={currency}
              experiment={experiment}
              experimentVariant={experimentVariant}
              billingAddress={billingAddress}
              customerEmail={customerEmail}
              onAttempt={onProviderAttempt('stripe')}
              onSuccess={onSuccess}
              onFailure={onProviderFailure('stripe')}
              onProcessingChange={onProcessingChange}
            />
          )}
        </MethodRow>
      )}

      {enabled.paypal && (
        <MethodRow
          selected={method === 'paypal'}
          disabled={isProcessing || lockMethods}
          onSelect={() => onMethodChange('paypal')}
          icon={
            <span className="font-bold italic text-[#1a3d8f] dark:text-[#7ba3f0]">
              PayPal
            </span>
          }
          title=""
          hint={t('methods.paypal.hint')}
          testId="payment-method-paypal"
        >
          {!hasConsented ? (
            <ConsentPending />
          ) : isProcessing ? (
            <PreparingMethod />
          ) : (
            <PayPalProvider config={paypal}>
              <PayPalButton
                cartId={cartId}
                experiment={experiment}
                experimentVariant={experimentVariant}
                paypalOrderId={paypalOrderId}
                onAttempt={onProviderAttempt('paypal')}
                onSuccess={onSuccess}
                onFailure={onProviderFailure('paypal')}
                onProcessingChange={onProcessingChange}
              />
            </PayPalProvider>
          )}
        </MethodRow>
      )}

      {enabled.btcpay && (
        <MethodRow
          selected={method === 'btcpay'}
          disabled={isProcessing || lockMethods}
          onSelect={() => onMethodChange('btcpay')}
          icon={<Bitcoin className="h-4 w-4 text-amber-500" aria-hidden />}
          title={t('methods.bitcoin.title')}
          hint={t('methods.bitcoin.hint')}
          testId="payment-method-btcpay"
        >
          {!hasConsented ? (
            <ConsentPending />
          ) : isProcessing ? (
            <PreparingMethod />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('methods.bitcoin.description')}
              </p>
              <BTCPayButton
                cartId={cartId}
                checkoutLink={btcpayCheckoutLink}
                onAttempt={onProviderAttempt('btcpay')}
                onFailure={onProviderFailure('btcpay')}
              />
            </div>
          )}
        </MethodRow>
      )}
    </div>
  )

  const consentGate = (
    <ConsentGate
      checked={hasConsented}
      disabled={lockMethods}
      onChange={setHasConsented}
    />
  )

  // Wallets + card share one Stripe Elements instance (same client secret).
  // The wallet row is a one-tap charge, so it stays unmounted until consent
  // is given rather than merely disabled.
  if (enabled.stripe && clientSecret) {
    return (
      <StripeProvider
        clientSecret={clientSecret}
        customerSessionClientSecret={customerSessionClientSecret}
        publishableKey={stripePublishableKey}
        notConfiguredMessage={t('noneConfigured')}
      >
        <div className="space-y-4">
          {consentGate}
          {hasConsented && (
            <ExpressCheckoutRow
              cartId={cartId}
              experiment={experiment}
              experimentVariant={experimentVariant}
              billingAddress={billingAddress}
              customerEmail={customerEmail}
              onAttempt={onProviderAttempt('stripe')}
              onSuccess={onSuccess}
              onFailure={onProviderFailure('stripe')}
              onProcessingChange={onProcessingChange}
            />
          )}
          {selector}
        </div>
      </StripeProvider>
    )
  }

  return (
    <div className="space-y-4">
      {consentGate}
      {selector}
    </div>
  )
}
