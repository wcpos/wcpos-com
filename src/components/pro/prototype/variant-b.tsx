/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Variant B — "Comparison panel".
 * Both plans have identical features — the only real differences are the
 * term, the billing model, and how long updates last. So instead of two
 * cards repeating the same feature list, this variant lists features once
 * and puts the term differences side by side in a single panel.
 */
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'
import { PROTOTYPE_PLANS, SHARED_FEATURES } from './plans'
import { PriceSlot } from './price-slot'

const TERM_ROWS: Array<{
  label: string
  yearly: string
  lifetime: string
}> = [
  { label: 'Software updates', yearly: '1 year', lifetime: 'Forever' },
  {
    label: 'Billing',
    yearly: 'Manual renewal — no automatic billing',
    lifetime: 'One-time payment',
  },
  { label: 'Sites', yearly: 'Unlimited', lifetime: 'Unlimited' },
]

export function VariantB({ delayMs }: { delayMs: number }) {
  const { yearly, lifetime } = PROTOTYPE_PLANS

  return (
    <div className="max-w-4xl mx-auto rounded-xl border bg-card overflow-hidden">
      <div className="grid md:grid-cols-[1.2fr_1fr_1fr]">
        {/* Header row */}
        <div className="hidden md:flex flex-col justify-end p-6">
          <h3 className="text-lg font-semibold">Everything in Pro</h3>
          <p className="text-sm text-muted-foreground">
            Same features on both plans — pick how long you want updates.
          </p>
        </div>
        <div className="p-6 text-center border-t md:border-t-0 md:border-l bg-primary/5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="font-semibold">{yearly.title}</span>
            <Badge>Most Popular</Badge>
          </div>
          <div className="text-3xl font-bold">
            <PriceSlot planId="yearly" delayMs={delayMs} fallbackClassName="w-16" />
            <span className="text-base font-normal text-muted-foreground">
              /year
            </span>
          </div>
        </div>
        <div className="p-6 text-center border-t md:border-t-0 md:border-l">
          <div className="mb-1 font-semibold">{lifetime.title}</div>
          <div className="text-3xl font-bold">
            <PriceSlot planId="lifetime" delayMs={delayMs} fallbackClassName="w-16" />
            <span className="text-base font-normal text-muted-foreground">
              {' '}
              once
            </span>
          </div>
        </div>

        {/* Term difference rows */}
        {TERM_ROWS.map((row) => (
          <div key={row.label} className="contents">
            <div className="px-6 py-3 border-t text-sm font-medium">
              {row.label}
            </div>
            <div className="px-6 py-3 border-t md:border-l text-sm text-center bg-primary/5">
              {row.yearly}
            </div>
            <div className="px-6 py-3 border-t md:border-l text-sm text-center">
              {row.lifetime}
            </div>
          </div>
        ))}

        {/* CTA row */}
        <div className="hidden md:block border-t" />
        <div className="p-6 border-t md:border-l bg-primary/5">
          <Button asChild className="w-full" size="lg">
            <Link href={yearly.checkoutHref}>Get Yearly</Link>
          </Button>
        </div>
        <div className="p-6 border-t md:border-l">
          <Button asChild className="w-full" size="lg" variant="outline">
            <Link href={lifetime.checkoutHref}>Get Lifetime</Link>
          </Button>
        </div>
      </div>

      {/* Shared feature list */}
      <div className="border-t bg-muted/40 p-6">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
          {SHARED_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-1" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
