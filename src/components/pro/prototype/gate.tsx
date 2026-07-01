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
import { PrototypeSwitcher } from './switcher'

const DEFAULT_DELAY_MS = 1500

const PRICING_VARIANTS = [
  { key: 'current', label: 'Current production design' },
  { key: 'a', label: 'Static-first cards' },
  { key: 'b', label: 'Comparison panel' },
  { key: 'c', label: 'One product, pick a term' },
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
      ) : (
        production
      )}
      <PrototypeSwitcher variants={PRICING_VARIANTS} current={variant} />
    </>
  )
}
