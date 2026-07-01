/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Plan: three variants of the /pro pricing section, switchable via
 * ?variant= on the existing /pro route (plus 'current' as baseline),
 * dev-only. ?delay=<ms> tunes the simulated Medusa latency (default 1500).
 *
 * Awaiting searchParams happens here, inside the page's Suspense boundary,
 * so the surrounding page shell stays prerenderable under cacheComponents.
 */
import type { ReactNode } from 'react'
import { VariantA } from './variant-a'
import { VariantB } from './variant-b'
import { VariantC } from './variant-c'
import { VariantD } from './variant-d'
import { VariantE } from './variant-e'
import { VariantF } from './variant-f'
import { VariantG } from './variant-g'
import { VariantH } from './variant-h'
import { PrototypeSwitcher } from './switcher'

const DEFAULT_DELAY_MS = 1500

// Rounds 1 (a/b/c) and 2 (d/e/f) rejected — still URL-reachable, but the
// switcher cycles round 3 (g/h): feature list appears ONCE, the yearly vs
// lifetime choice is price + term facts only.
const PRICING_VARIANTS = [
  { key: 'current', label: 'Current production design' },
  { key: 'g', label: 'One panel, two prices' },
  { key: 'h', label: 'The buy box' },
] as const

export async function PricingPrototypeGate({
  searchParams,
  production,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
  /** The real production pricing section, shown as the 'current' baseline. */
  production: ReactNode
}) {
  if (process.env.NODE_ENV === 'production') {
    return production
  }

  const params = await searchParams
  const variant =
    typeof params.variant === 'string' ? params.variant : 'current'
  const parsedDelay = Number(
    typeof params.delay === 'string' ? params.delay : NaN
  )
  const delayMs = Number.isFinite(parsedDelay) ? parsedDelay : DEFAULT_DELAY_MS

  return (
    <>
      {variant === 'a' ? (
        <VariantA delayMs={delayMs} />
      ) : variant === 'b' ? (
        <VariantB delayMs={delayMs} />
      ) : variant === 'c' ? (
        <VariantC delayMs={delayMs} />
      ) : variant === 'd' ? (
        <VariantD delayMs={delayMs} />
      ) : variant === 'e' ? (
        <VariantE delayMs={delayMs} />
      ) : variant === 'f' ? (
        <VariantF delayMs={delayMs} />
      ) : variant === 'g' ? (
        <VariantG delayMs={delayMs} />
      ) : variant === 'h' ? (
        <VariantH delayMs={delayMs} />
      ) : (
        production
      )}
      <PrototypeSwitcher variants={PRICING_VARIANTS} current={variant} />
    </>
  )
}
