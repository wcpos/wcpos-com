/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Variant C — "One product, pick a term".
 * Reframes the page: Pro is a single product with one feature list; the
 * yearly/lifetime choice is a term selector inside one decision panel with
 * a single CTA. Prices suspend individually inside the selector rows.
 */
import { Check } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PROTOTYPE_PLANS, SHARED_FEATURES } from './plans'
import { PriceSlot } from './price-slot'
import { TermChooser } from './term-chooser'

export function VariantC({ delayMs }: { delayMs: number }) {
  const { yearly, lifetime } = PROTOTYPE_PLANS

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">WooCommerce POS Pro</CardTitle>
        <CardDescription>
          Every Pro feature is included on both plans — just choose how
          you&apos;d like to pay.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mb-8">
          {SHARED_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-1" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <TermChooser
          options={[
            {
              planId: 'yearly',
              title: yearly.title,
              subtitle: 'Updates and support for one year',
              badgeLabel: yearly.badgeLabel,
              priceNode: (
                <PriceSlot
                  planId="yearly"
                  delayMs={delayMs}
                  fallbackClassName="w-12"
                />
              ),
              priceSuffix: '/yr',
              checkoutHref: yearly.checkoutHref,
              ctaNote: 'Manual renewal — no automatic billing.',
            },
            {
              planId: 'lifetime',
              title: lifetime.title,
              subtitle: 'Pay once, updates forever',
              badgeLabel: 'Best Value',
              priceNode: (
                <PriceSlot
                  planId="lifetime"
                  delayMs={delayMs}
                  fallbackClassName="w-12"
                />
              ),
              priceSuffix: ' once',
              checkoutHref: lifetime.checkoutHref,
              ctaNote: 'One-time payment — never pay again.',
            },
          ]}
        />
      </CardContent>
    </Card>
  )
}
