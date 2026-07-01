/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * The one piece of the pricing UI that actually needs Medusa: the price
 * text. Everything around it renders immediately; this slot suspends on its
 * own with a number-sized inline skeleton.
 */
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchStubPrice, type PrototypePlanId } from './plans'

async function PriceText({
  planId,
  delayMs,
  compact,
}: {
  planId: PrototypePlanId
  delayMs: number
  compact: boolean
}) {
  const price = await fetchStubPrice(planId, delayMs)
  return <>{compact ? price.compact : price.formatted}</>
}

export function PriceSlot({
  planId,
  delayMs,
  compact = true,
  fallbackClassName = 'w-16',
}: {
  planId: PrototypePlanId
  delayMs: number
  compact?: boolean
  fallbackClassName?: string
}) {
  return (
    <Suspense
      fallback={
        <Skeleton
          className={`inline-block h-[0.85em] align-baseline ${fallbackClassName}`}
        />
      }
    >
      <PriceText planId={planId} delayMs={delayMs} compact={compact} />
    </Suspense>
  )
}
