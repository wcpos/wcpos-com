/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Plan: three checkout mockups on the existing /pro/checkout route,
 * switchable via ?variant= (plus 'current' baseline), dev-only, fully
 * stubbed (no Medusa/Stripe/auth). ?signedin=1 previews the signed-in
 * state of each variant.
 */
import type { ReactNode } from 'react'
import { CheckoutVariantA } from './variant-a'
import { CheckoutVariantB } from './variant-b'
import { CheckoutVariantC } from './variant-c'
import { PrototypeSwitcher } from '../switcher'
import { SignedInToggle } from './signed-in-toggle'

const CHECKOUT_VARIANTS = [
  { key: 'current', label: 'Current production checkout' },
  { key: 'a', label: 'One column, express-first' },
  { key: 'b', label: 'Three steps that collapse' },
  { key: 'c', label: 'Split-screen paywall' },
] as const

export async function CheckoutPrototypeGate({
  searchParams,
  production,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
  /** The real production checkout, shown as the 'current' baseline. */
  production: ReactNode
}) {
  if (process.env.NODE_ENV === 'production') {
    return production
  }

  const params = await searchParams
  const variant =
    typeof params.variant === 'string' ? params.variant : 'current'
  const signedIn = params.signedin === '1'

  return (
    <>
      {variant === 'a' ? (
        <CheckoutVariantA signedIn={signedIn} />
      ) : variant === 'b' ? (
        <CheckoutVariantB signedIn={signedIn} />
      ) : variant === 'c' ? (
        <CheckoutVariantC signedIn={signedIn} />
      ) : (
        production
      )}
      <PrototypeSwitcher variants={CHECKOUT_VARIANTS} current={variant}>
        <SignedInToggle signedIn={signedIn} />
      </PrototypeSwitcher>
    </>
  )
}
