'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import type { PlanId } from '@/lib/plans'
import type { ProBuyBoxOption } from './pro-buy-box-options'

/**
 * ProBuyBox — the purchase decision on /pro, product-page style.
 *
 * The feature list lives outside this box and appears exactly once; the
 * yearly/lifetime choice is deliberately reduced to price + term facts
 * (pricing must never repeat the feature checklist per plan). Selection is
 * client state; copy and analytics payloads arrive resolved from the
 * server, and the static footer is server-rendered via the `footer` slot
 * so only the term choice hydrates.
 */
interface ProBuyBoxProps {
  options: ProBuyBoxOption[]
  ctaLabel: string
  heading: string
  subheading: string
  termAriaLabel: string
  /** Server-rendered static content (guarantee, payment methods, proof). */
  footer?: ReactNode
}

export function ProBuyBox({
  options,
  ctaLabel,
  heading,
  subheading,
  termAriaLabel,
  footer,
}: ProBuyBoxProps) {
  const [selected, setSelected] = useState<PlanId>(options[0].planId)
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([])
  // Fall back to the first option if a revalidated payload dropped the
  // selected plan — client state can outlive the server-provided options.
  const current =
    options.find((option) => option.planId === selected) ?? options[0]

  function onRadioKeyDown(event: React.KeyboardEvent) {
    const direction =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? -1
          : 0
    if (direction === 0) return
    event.preventDefault()
    const index = options.findIndex(
      (option) => option.planId === current.planId
    )
    const next = (index + direction + options.length) % options.length
    setSelected(options[next].planId)
    radioRefs.current[next]?.focus()
  }

  return (
    <Card elevated data-testid="pro-buy-box" className="p-6">
      <p className="text-lg font-semibold mb-1">{heading}</p>
      <p className="text-sm text-muted-foreground mb-5">{subheading}</p>

      <div
        className="space-y-3"
        role="radiogroup"
        aria-label={termAriaLabel}
        onKeyDown={onRadioKeyDown}
      >
        {options.map((option, index) => {
          const isSelected = option.planId === current.planId
          return (
            <button
              key={option.planId}
              ref={(element) => {
                radioRefs.current[index] = element
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => {
                setSelected(option.planId)
                radioRefs.current[index]?.focus()
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
          eventProperties={current.eventProperties}
        >
          {ctaLabel}
        </TrackedLocaleLink>
      </Button>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        {current.ctaNote}
      </p>

      {footer}
    </Card>
  )
}
