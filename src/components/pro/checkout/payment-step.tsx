'use client'

import { useTranslations } from 'next-intl'
import { Bitcoin, CreditCard } from 'lucide-react'
import { StripeProvider } from '../stripe-provider'
import { PayPalProvider } from '../paypal-provider'
import { CheckoutForm } from '../checkout-form'
import { PayPalButton } from '../paypal-button'
import { BTCPayButton } from '../btcpay-button'
import { ExpressCheckoutRow } from './express-checkout'
import type { CheckoutFailure } from '../checkout-safety'
import type { PayPalCheckoutConfig } from '@/lib/checkout-payment-config'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'

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
  experiment: string
  experimentVariant: ProCheckoutVariant
  amount: number
  currency: string
  onSuccess: (orderId: string) => void
  onFailure: (failure: CheckoutFailure | null) => void
  /** Bubbles provider confirm-in-flight up (locks billing Edit etc.). */
  onProcessingChange?: (processing: boolean) => void
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
  experiment,
  experimentVariant,
  amount,
  currency,
  onSuccess,
  onFailure,
  onProcessingChange,
}: PaymentStepProps) {
  const t = useTranslations('pro.checkout.payment')
  const enabledCount = [enabled.stripe, enabled.paypal, enabled.btcpay].filter(
    Boolean
  ).length

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
          {isProcessing || !clientSecret ? (
            <PreparingMethod />
          ) : (
            <CheckoutForm
              cartId={cartId}
              amount={amount}
              currency={currency}
              experiment={experiment}
              experimentVariant={experimentVariant}
              onSuccess={onSuccess}
              onFailure={onFailure}
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
          {isProcessing ? (
            <PreparingMethod />
          ) : (
            <PayPalProvider config={paypal}>
              <PayPalButton
                cartId={cartId}
                experiment={experiment}
                experimentVariant={experimentVariant}
                paypalOrderId={paypalOrderId}
                onSuccess={onSuccess}
                onFailure={onFailure}
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
          {isProcessing ? (
            <PreparingMethod />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('methods.bitcoin.description')}
              </p>
              <BTCPayButton
                cartId={cartId}
                checkoutLink={btcpayCheckoutLink}
                onFailure={onFailure}
              />
            </div>
          )}
        </MethodRow>
      )}
    </div>
  )

  // Wallets + card share one Stripe Elements instance (same client secret).
  if (enabled.stripe && clientSecret) {
    return (
      <StripeProvider
        clientSecret={clientSecret}
        customerSessionClientSecret={customerSessionClientSecret}
        publishableKey={stripePublishableKey}
        notConfiguredMessage={t('noneConfigured')}
      >
        <ExpressCheckoutRow
          cartId={cartId}
          experiment={experiment}
          experimentVariant={experimentVariant}
          onSuccess={onSuccess}
          onFailure={onFailure}
          onProcessingChange={onProcessingChange}
        />
        {selector}
      </StripeProvider>
    )
  }

  return selector
}
