/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Client half of Variant E: segmented yearly/lifetime toggle driving one
 * giant price display and CTA. Price nodes are server-rendered (they
 * suspend individually) and passed in as slots.
 */
'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

interface TermPanel {
  key: 'yearly' | 'lifetime'
  toggleLabel: string
  priceNode: ReactNode
  priceSuffix: string
  subLine: string
  checkoutHref: string
  ctaLabel: string
}

export function TermToggle({ panels }: { panels: TermPanel[] }) {
  const [active, setActive] = useState<'yearly' | 'lifetime'>('yearly')
  const panel = panels.find((candidate) => candidate.key === active)!

  return (
    <div>
      <div
        className="inline-flex rounded-full border border-slate-700 bg-slate-900 p-1 text-sm"
        role="tablist"
        aria-label="License term"
      >
        {panels.map((candidate) => (
          <button
            key={candidate.key}
            type="button"
            role="tab"
            aria-selected={candidate.key === active}
            onClick={() => setActive(candidate.key)}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              candidate.key === active
                ? 'bg-slate-50 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {candidate.toggleLabel}
          </button>
        ))}
      </div>

      <p className="mt-6 text-6xl font-bold tracking-tight">
        {panel.priceNode}
        <span className="text-xl font-normal text-slate-400">
          {panel.priceSuffix}
        </span>
      </p>
      <p className="mt-2 text-slate-400">{panel.subLine}</p>

      <Button asChild size="lg" className="mt-8 w-full sm:w-auto sm:px-10">
        <Link href={panel.checkoutHref}>{panel.ctaLabel}</Link>
      </Button>
      <p className="mt-3 text-sm text-slate-400">
        14-day money-back guarantee — no reason required.
      </p>
    </div>
  )
}
