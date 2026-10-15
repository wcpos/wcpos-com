'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  NetworkField,
  DotWave,
  WireGlobe,
  CircuitPulse,
} from './backdrops'

const OPTIONS = [
  {
    key: 'network',
    label: 'A · Network field',
    blurb:
      'A drifting constellation — your store, your devices, your data as one graph. Move the mouse: the cursor joins the network.',
    Component: NetworkField,
  },
  {
    key: 'dotwave',
    label: 'B · Dot wave',
    blurb:
      'A precise lattice with waves travelling through it — fields of data. Move the mouse: a ripple follows you.',
    Component: DotWave,
  },
  {
    key: 'globe',
    label: 'C · Wire globe',
    blurb:
      'The GitHub/Stripe school: a rotating dot sphere with payment arcs pulsing between points. Mouse steers the spin and tilt.',
    Component: WireGlobe,
  },
  {
    key: 'circuit',
    label: 'D · Circuit pulses',
    blurb:
      'Signals travelling a faint grid, PCB-style, occasionally bending toward your cursor. The quietest of the four.',
    Component: CircuitPulse,
  },
] as const

export function BackdropLabClient() {
  const [active, setActive] = React.useState<(typeof OPTIONS)[number]['key']>(
    OPTIONS[0].key
  )
  const option = OPTIONS.find((o) => o.key === active) ?? OPTIONS[0]
  const Backdrop = option.Component

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <Backdrop key={option.key} />

      {/* sample hero copy so each option is judged against real content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        <div className="flex flex-wrap items-center gap-2 pt-6">
          {OPTIONS.map((candidate) => (
            <button
              key={candidate.key}
              type="button"
              onClick={() => setActive(candidate.key)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                candidate.key === active
                  ? 'border-wcpos-red bg-wcpos-red text-white'
                  : 'border-slate-300 bg-white/80 text-slate-600 hover:border-slate-400'
              )}
            >
              {candidate.label}
            </button>
          ))}
        </div>
        <p className="mt-3 max-w-xl text-sm text-slate-500">{option.blurb}</p>

        <div className="flex max-w-xl flex-1 flex-col justify-center pb-24">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-wcpos-red">
            Point of Sale for WooCommerce
          </p>
          <h1 className="mb-4 text-5xl font-bold leading-[1.05] tracking-tight text-slate-900">
            Your counter. Your customers. Your WooCommerce.
          </h1>
          <p className="mb-7 text-lg text-slate-600">
            Sample hero copy so text legibility over each backdrop is part of
            the decision.
          </p>
          <div className="flex gap-3">
            <Button variant="brand-on-dark" size="xl">
              Try Live Demo
            </Button>
            <Button variant="outline" size="xl">
              Download Free
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
