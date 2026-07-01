/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Variant E — "The zero column".
 * A dark full-width value pitch that anchors against how the POS industry
 * bills (per register, per month, plus fees) instead of against our own
 * plans. Left: the industry's meter. Right: one flat price behind a
 * yearly/lifetime toggle. The memorable element is the column of $0s.
 */
import { PriceSlot } from './price-slot'
import { TermToggle } from './term-toggle'

const ZERO_ROWS = [
  { label: 'Per register, per month', industry: 'usually metered' },
  { label: 'Per transaction', industry: 'usually a percentage' },
  { label: 'Per staff account', industry: 'usually per seat' },
  { label: 'Per site', industry: 'usually per location' },
]

export function VariantE({ delayMs }: { delayMs: number }) {
  return (
    <div className="max-w-5xl mx-auto overflow-hidden rounded-3xl bg-slate-950 text-slate-50 ring-1 ring-slate-800">
      <div className="grid lg:grid-cols-2">
        {/* Left — how the industry bills */}
        <div className="relative p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-slate-800">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(600px_circle_at_20%_10%,rgba(211,47,47,0.15),transparent_60%)]"
          />
          <p className="text-sm uppercase tracking-widest text-slate-500 mb-3">
            What Pro costs
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold leading-snug mb-8">
            Cloud POS systems bill you per register, per month, per sale.
            <span className="text-slate-400"> WCPOS doesn&apos;t.</span>
          </h3>
          <dl className="space-y-4">
            {ZERO_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 border-b border-slate-800/80 pb-3"
              >
                <dt className="text-sm text-slate-300">
                  {row.label}
                  <span className="block text-xs text-slate-500">
                    {row.industry}
                  </span>
                </dt>
                <dd className="font-mono text-2xl font-bold text-green-400">
                  $0
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Right — one flat price */}
        <div className="p-8 sm:p-12">
          <TermToggle
            panels={[
              {
                key: 'yearly',
                toggleLabel: 'Yearly',
                priceNode: (
                  <PriceSlot
                    planId="yearly"
                    delayMs={delayMs}
                    fallbackClassName="w-28"
                  />
                ),
                priceSuffix: '/year',
                subLine:
                  'One payment. Updates & priority support for a year. Never auto-renews.',
                checkoutHref: '/pro/checkout?product=wcpos-pro-yearly',
                ctaLabel: 'Get Pro Yearly',
              },
              {
                key: 'lifetime',
                toggleLabel: 'Lifetime',
                priceNode: (
                  <PriceSlot
                    planId="lifetime"
                    delayMs={delayMs}
                    fallbackClassName="w-28"
                  />
                ),
                priceSuffix: ' once',
                subLine:
                  'About three years of Yearly — then updates are free forever.',
                checkoutHref: '/pro/checkout?product=wcpos-pro-lifetime',
                ctaLabel: 'Get Pro Lifetime',
              },
            ]}
          />

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <span>5,000+ active stores</span>
            <span>Free & open source core since 2014</span>
            <span>Yearly credits toward Lifetime</span>
          </div>
        </div>
      </div>
    </div>
  )
}
