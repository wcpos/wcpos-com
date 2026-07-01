/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Radio-accordion payment selector for checkout Variant B: card is the
 * default and arrives expanded, while PayPal and Bitcoin are equally
 * visible rows that expand when chosen. The main pay button's label follows
 * the selection (redirect methods say "Continue to …" instead of "Pay").
 */
'use client'

import { Bitcoin, CreditCard } from 'lucide-react'
import { FakeCardFields } from './stubs'

export type StubPaymentMethod = 'card' | 'paypal' | 'btcpay'

export function payButtonLabel(method: StubPaymentMethod): string {
  switch (method) {
    case 'card':
      return 'Pay $129 now'
    case 'paypal':
      return 'Continue to PayPal'
    case 'btcpay':
      return 'Continue to Bitcoin payment'
  }
}

function MethodRow({
  selected,
  onSelect,
  icon,
  title,
  hint,
  children,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  hint: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-lg border transition-colors ${
        selected ? 'border-primary ring-1 ring-primary' : 'border-border'
      }`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
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
        <span className="ml-auto text-xs text-muted-foreground">{hint}</span>
      </button>
      {selected && children && (
        <div className="border-t px-4 py-4">{children}</div>
      )}
    </div>
  )
}

export function PaymentMethodSelector({
  method,
  onChange,
}: {
  method: StubPaymentMethod
  onChange: (method: StubPaymentMethod) => void
}) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Payment method">
      <MethodRow
        selected={method === 'card'}
        onSelect={() => onChange('card')}
        icon={<CreditCard className="h-4 w-4" />}
        title="Card"
        hint="Visa · Mastercard · Amex"
      >
        <FakeCardFields />
      </MethodRow>

      <MethodRow
        selected={method === 'paypal'}
        onSelect={() => onChange('paypal')}
        icon={
          <span className="font-bold italic text-[#1a3d8f] dark:text-[#7ba3f0]">
            PayPal
          </span>
        }
        title=""
        hint="Pay with your PayPal balance or linked card"
      >
        <p className="text-sm text-muted-foreground">
          You&apos;ll be sent to PayPal to approve the payment, then returned
          here for your license.
        </p>
      </MethodRow>

      <MethodRow
        selected={method === 'btcpay'}
        onSelect={() => onChange('btcpay')}
        icon={<Bitcoin className="h-4 w-4 text-amber-500" />}
        title="Bitcoin"
        hint="On-chain or Lightning"
      >
        <p className="text-sm text-muted-foreground">
          A BTCPay invoice opens with a QR code — pay on-chain or over
          Lightning, no account needed.
        </p>
      </MethodRow>
    </div>
  )
}
