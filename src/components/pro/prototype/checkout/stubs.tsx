/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Shared fake building blocks for the checkout variants. Nothing here talks
 * to Medusa or Stripe — the question is "what should checkout look like",
 * not "does the backend work". Pay buttons fake a short processing state and
 * then show a success screen.
 */
'use client'

import { useState } from 'react'
import { CheckCircle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link } from '@/i18n/navigation'

export const STUB_SIGNED_IN_EMAIL = 'you@yourstore.com'

export function useFakePay() {
  const [state, setState] = useState<'idle' | 'processing' | 'done'>('idle')

  function pay() {
    if (state !== 'idle') return
    setState('processing')
    setTimeout(() => setState('done'), 1200)
  }

  return { state, pay }
}

/** Apple Pay / Google Pay express row — the genuinely fastest path. */
export function ExpressPayRow({
  onPay,
  dividerLabel = 'or pay with card',
}: {
  onPay: () => void
  dividerLabel?: string
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onPay}
          className="flex h-11 items-center justify-center rounded-lg bg-black text-white text-sm font-semibold hover:bg-zinc-800"
        >
           Pay
        </button>
        <button
          type="button"
          onClick={onPay}
          className="flex h-11 items-center justify-center rounded-lg bg-black text-white text-sm font-semibold hover:bg-zinc-800"
        >
          G Pay
        </button>
      </div>
      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        {dividerLabel}
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}

/** Inert card fields standing in for the Stripe PaymentElement. */
export function FakeCardFields() {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="proto-card">Card number</Label>
        <Input id="proto-card" placeholder="1234 1234 1234 1234" inputMode="numeric" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="proto-exp">Expiry</Label>
          <Input id="proto-exp" placeholder="MM / YY" inputMode="numeric" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proto-cvc">CVC</Label>
          <Input id="proto-cvc" placeholder="CVC" inputMode="numeric" />
        </div>
      </div>
    </div>
  )
}

/**
 * Compact billing address — the minimum that satisfies "must collect a
 * billing address" without a wall of fields.
 */
export function CompactAddressFields() {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="proto-name">Full name</Label>
        <Input id="proto-name" placeholder="Ada Lovelace" autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="proto-country">Country</Label>
        <select
          id="proto-country"
          className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
          defaultValue="AU"
        >
          <option value="AU">Australia</option>
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
          <option value="DE">Germany</option>
          <option value="OTHER">Somewhere else…</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="proto-address">Address</Label>
        <Input id="proto-address" placeholder="Street address" autoComplete="street-address" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="proto-city">City</Label>
          <Input id="proto-city" placeholder="City" autoComplete="address-level2" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proto-postal">Postal code</Label>
          <Input id="proto-postal" placeholder="Postal code" autoComplete="postal-code" />
        </div>
      </div>
    </div>
  )
}

/**
 * Account block: signed-in users see a one-line confirmation; new users just
 * give an email — the account is created as part of the purchase instead of
 * bouncing through /register first.
 */
export function AccountBlock({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <span>
          Signed in as <span className="font-medium">{STUB_SIGNED_IN_EMAIL}</span>
        </span>
        <span className="text-muted-foreground">Change</span>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="proto-email">Email</Label>
      <Input
        id="proto-email"
        type="email"
        placeholder="you@yourstore.com"
        autoComplete="email"
      />
      <p className="text-xs text-muted-foreground">
        We&apos;ll create your account with this email — your license and
        sign-in link arrive right after purchase.
      </p>
    </div>
  )
}

export function PayButton({
  label,
  state,
  onClick,
  className = '',
}: {
  label: string
  state: 'idle' | 'processing' | 'done'
  onClick: () => void
  className?: string
}) {
  return (
    <Button
      size="lg"
      className={`w-full ${className}`}
      disabled={state !== 'idle'}
      onClick={onClick}
    >
      <Lock className="h-4 w-4 mr-1" />
      {state === 'processing' ? 'Processing…' : label}
    </Button>
  )
}

export function AltPaymentLinks() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      Prefer <span className="underline cursor-pointer">PayPal</span> or{' '}
      <span className="underline cursor-pointer">Bitcoin</span>?
    </p>
  )
}

export function SuccessScreen() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">You&apos;re all set!</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Your license key and download link are on their way to your email.
        (Prototype — no payment was made.)
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild>
          <Link href="/account/licenses">Go to Licenses</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/pro/checkout?variant=a">Back to prototype</Link>
        </Button>
      </div>
    </div>
  )
}
