/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Client half of Variant C: radio-style term selection with a single CTA.
 * Price nodes are rendered on the server (they suspend individually) and
 * passed in as ReactNode slots, so selection state never blocks on Medusa.
 */
'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'
import type { PrototypePlanId } from './plans'

interface TermOption {
  planId: PrototypePlanId
  title: string
  subtitle: string
  badgeLabel: string | null
  priceNode: ReactNode
  priceSuffix: string
  checkoutHref: string
  ctaNote: string
}

export function TermChooser({ options }: { options: TermOption[] }) {
  const [selected, setSelected] = useState<PrototypePlanId>(options[0].planId)
  const current = options.find((option) => option.planId === selected)!

  return (
    <div>
      <div className="space-y-3" role="radiogroup" aria-label="License term">
        {options.map((option) => {
          const isSelected = option.planId === selected
          return (
            <button
              key={option.planId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(option.planId)}
              className={`w-full flex items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? 'border-primary ring-1 ring-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <span
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
                <span className="text-xl font-bold">{option.priceNode}</span>
                <span className="text-sm text-muted-foreground">
                  {option.priceSuffix}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <Button asChild className="w-full mt-6" size="lg">
        <Link href={current.checkoutHref}>Continue with {current.title}</Link>
      </Button>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        {current.ctaNote}
      </p>
    </div>
  )
}
