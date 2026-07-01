'use client'

import { useRef, useState } from 'react'
import { Bitcoin, CreditCard, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import type { PlanId } from '@/lib/plans'

/**
 * ProBuyBox — the purchase decision on /pro, product-page style.
 *
 * The feature list lives outside this box and appears exactly once; the
 * yearly/lifetime choice is deliberately reduced to price + term facts
 * (see docs/adr — pricing must never repeat the feature checklist per
 * plan). Selection is client state; prices arrive resolved as strings so
 * the box streams in as one unit behind Suspense.
 */
export interface ProBuyBoxOption {
  planId: PlanId
  handle: string
  title: string
  subtitle: string
  badgeLabel: string | null
  priceText: string
  priceSuffix: string
  ctaNote: string
  checkoutHref: string
}

interface ProBuyBoxProps {
  options: ProBuyBoxOption[]
  ctaLabel: string
  experimentVariant: ProCheckoutVariant
}

export function ProBuyBox({
  options,
  ctaLabel,
  experimentVariant,
}: ProBuyBoxProps) {
  const [selected, setSelected] = useState<PlanId>(options[0].planId)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const current = options.find((option) => option.planId === selected)!

  return (
    <div
      data-testid="pro-buy-box"
      className="rounded-2xl border bg-card p-6 shadow-sm"
    >
      <p className="text-lg font-semibold mb-1">Get Pro</p>
      <p className="text-sm text-muted-foreground mb-5">
        One license, all features. Just pick how long you want updates.
      </p>

      <div className="space-y-3" role="radiogroup" aria-label="License term">
        {options.map((option, index) => {
          const isSelected = option.planId === selected
          const moveSelection = (direction: 1 | -1) => {
            const nextIndex =
              (index + direction + options.length) % options.length
            const nextOption = options[nextIndex]
            setSelected(nextOption.planId)
            optionRefs.current[nextIndex]?.focus()
          }

          return (
            <button
              key={option.planId}
              ref={(element) => {
                optionRefs.current[index] = element
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelected(option.planId)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveSelection(1)
                }

                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveSelection(-1)
                }
              }}
              className={`w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? 'border-primary ring-1 ring-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <span
                aria-hidden
                className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                  isSelected
                    ? 'border-primary bg-primary [box-shadow:inset_0_0_0_2.5px_var(--card)]'
                    : 'border-muted-foreground/40'
                }`}
              />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{option.title}</span>
                  {option.badgeLabel && <Badge>{option.badgeLabel}</Badge>}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {option.subtitle}
                </span>
              </span>
              <span className="text-right shrink-0">
                <span className="text-xl font-bold">{option.priceText}</span>
                <span className="text-sm text-muted-foreground">
                  {option.priceSuffix}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <Button asChild size="lg" className="mt-5 w-full">
        <TrackedLocaleLink
          href={current.checkoutHref}
          eventName="click_start_checkout"
          eventProperties={{
            experiment: 'pro_checkout_v1',
            variant: experimentVariant,
            product: current.handle,
            plan: current.planId,
          }}
        >
          {ctaLabel}
        </TrackedLocaleLink>
      </Button>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        {current.ctaNote}
      </p>

      <div className="mt-5 space-y-2 border-t pt-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Shield className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <Link href="/refunds" className="underline underline-offset-4">
              14-day money-back guarantee
            </Link>
            , no reason required
          </span>
        </p>
        <p className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex items-center gap-1">
            Card, PayPal or <Bitcoin className="h-4 w-4" aria-hidden />
            Bitcoin
          </span>
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        5,000+ active stores · Yearly credits toward Lifetime
      </p>
    </div>
  )
}
