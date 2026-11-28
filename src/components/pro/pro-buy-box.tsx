'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
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
 *
 * Yearly is the hero row; every later row (Lifetime) is drawn quieter and
 * is never highlighted unless the visitor selects it.
 */
interface ProBuyBoxProps {
  options: ProBuyBoxOption[]
  ctaLabel: string
  heading: string
  subheading: string
  termAriaLabel: string
  /**
   * Set while prices load: the figures become skeletons beside this visible
   * label, and the button is a plain link to the plan's checkout (checkout
   * confirms the price before payment).
   */
  loadingLabel?: string
  /** A notice above the plans (prices unconfirmed, already a Pro owner). */
  notice?: ReactNode
  /** A line directly above the button. */
  buyNote?: string
  /** Server-rendered static content (try-free note, payment methods, proof). */
  footer?: ReactNode
}

export function ProBuyBox({
  options,
  ctaLabel,
  heading,
  subheading,
  termAriaLabel,
  loadingLabel,
  notice,
  buyNote,
  footer,
}: ProBuyBoxProps) {
  const [selected, setSelected] = useState<PlanId>(
    options[0]?.planId ?? 'yearly'
  )
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([])
  // Fall back to the first option if a revalidated payload dropped the
  // selected plan — client state can outlive the server-provided options.
  const current =
    options.find((option) => option.planId === selected) ?? options[0]

  if (!current) return null

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

  const loading = loadingLabel !== undefined

  return (
    <Card
      elevated
      data-testid={loading ? 'pro-buy-box-skeleton' : 'pro-buy-box'}
      className="px-5 pt-4 pb-5 lg:p-6"
    >
      <h2 className="text-lg font-semibold mb-1">{heading}</h2>
      <p className="text-sm text-muted-foreground mb-3.5 lg:mb-5">
        {subheading}
      </p>

      {notice && <div className="-mt-1 mb-4">{notice}</div>}

      <div
        className="space-y-2.5 lg:space-y-3"
        role="radiogroup"
        aria-label={termAriaLabel}
        onKeyDown={onRadioKeyDown}
      >
        {options.map((option, index) => {
          const isSelected = option.planId === current.planId
          const compact = index > 0
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
              className={cn(
                'w-full flex items-center gap-3 rounded-lg border px-3.5 text-left transition-colors lg:px-4',
                compact ? 'py-2 lg:py-2.5' : 'py-3 lg:py-4',
                isSelected
                  ? 'border-primary ring-1 ring-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'h-4 w-4 shrink-0 rounded-full border-2',
                  isSelected
                    ? 'border-primary bg-primary [box-shadow:inset_0_0_0_2.5px_hsl(var(--card))]'
                    : 'border-muted-foreground/40 dark:border-muted-foreground'
                )}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block font-semibold',
                    compact && 'text-[15px] leading-[22px]'
                  )}
                >
                  {option.title}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {option.subtitle}
                </span>
              </span>
              <span className="shrink-0 whitespace-nowrap text-right">
                {loading ? (
                  <>
                    <Skeleton className="ml-auto h-6 w-21" />
                    {index === 0 ? (
                      <span
                        role="status"
                        className="mt-1 block text-xs text-muted-foreground"
                      >
                        {loadingLabel}
                      </span>
                    ) : (
                      <Skeleton className="ml-auto mt-1.5 h-3 w-14" />
                    )}
                  </>
                ) : (
                  <>
                    <span
                      className={cn(
                        'font-bold',
                        compact ? 'text-base' : 'text-lg lg:text-xl'
                      )}
                    >
                      {option.priceText}
                    </span>
                    {/* priceText uses the narrow symbol, so the ISO code is appended once; the guard stays as a safety net. */}
                    {!option.priceText.includes(option.currencyCode) && (
                      <span className="ml-1 text-sm font-medium text-muted-foreground">
                        {option.currencyCode}
                      </span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {option.priceSuffix}
                    </span>
                  </>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {buyNote && <p className="mt-4 text-sm font-medium">{buyNote}</p>}
      <Button
        asChild
        size="lg"
        className={cn('w-full', buyNote ? 'mt-3' : 'mt-3.5 lg:mt-5')}
      >
        {loading ? (
          <Link href={current.checkoutHref} prefetch={false}>
            {ctaLabel}
          </Link>
        ) : (
          <TrackedLocaleLink
            href={current.checkoutHref}
            prefetch={false}
            eventName="click_start_checkout"
            eventProperties={current.eventProperties}
          >
            {ctaLabel}
          </TrackedLocaleLink>
        )}
      </Button>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        {current.ctaNote}
      </p>

      {footer}
    </Card>
  )
}
