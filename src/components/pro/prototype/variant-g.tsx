/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Variant G — "One panel, two prices".
 * The owner's rule: the feature list appears ONCE. Pro is one product; the
 * feature grid (with real descriptions, not bare checkmarks) sells it, and
 * the yearly/lifetime decision collapses to two compact price tiles whose
 * only difference is the term facts. Proof + guarantee close the panel.
 */
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  PencilRuler,
  Plug,
  Shield,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconTile } from '@/components/ui/icon-tile'
import { Link } from '@/i18n/navigation'
import { PriceSlot } from './price-slot'

const FEATURES = [
  {
    icon: CreditCard,
    title: 'Payment terminals',
    description:
      'Connect card readers and terminals for fast, accurate in-person payments.',
  },
  {
    icon: PencilRuler,
    title: 'Stock & price editing',
    description:
      'Update stock, prices, and product details right from the POS — no trip to wp-admin.',
  },
  {
    icon: ClipboardList,
    title: 'Order management',
    description:
      'Browse order history and manage past orders without leaving the register.',
  },
  {
    icon: Users,
    title: 'Customer management',
    description:
      'Add and edit customer details at the point of sale, synced with WooCommerce.',
  },
  {
    icon: BarChart3,
    title: 'End-of-day reports',
    description:
      'Close the register with daily summaries of sales, payments, and takings.',
  },
  {
    icon: Plug,
    title: 'Custom payment gateways',
    description:
      'Take payments with any WooCommerce-compatible gateway, not just the built-ins.',
  },
]

export function VariantG({ delayMs }: { delayMs: number }) {
  return (
    <div className="max-w-5xl mx-auto rounded-3xl border bg-card overflow-hidden">
      {/* Features — once */}
      <div className="p-8 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-wcpos-red-accent mb-2">
          Everything in Free, plus
        </p>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex gap-3">
              <IconTile tone="brand">
                <feature.icon />
              </IconTile>
              <div>
                <p className="font-semibold leading-snug">{feature.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The decision — price + term facts only, no checklists */}
      <div className="border-t bg-muted/30 p-8 sm:p-12">
        <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
          <div className="relative rounded-2xl border-2 border-primary bg-card p-6 text-center shadow-sm">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
              Most Popular
            </Badge>
            <p className="font-semibold">Yearly</p>
            <p className="my-3 text-4xl font-bold">
              <PriceSlot planId="yearly" delayMs={delayMs} fallbackClassName="w-16" />
              <span className="text-base font-normal text-muted-foreground">
                /year
              </span>
            </p>
            <p className="text-sm text-muted-foreground min-h-10">
              Updates & priority support for one year. Never auto-renews.
            </p>
            <Button asChild size="lg" className="mt-4 w-full">
              <Link href="/pro/checkout?product=wcpos-pro-yearly">
                Get Yearly
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border bg-card p-6 text-center">
            <p className="font-semibold">Lifetime</p>
            <p className="my-3 text-4xl font-bold">
              <PriceSlot planId="lifetime" delayMs={delayMs} fallbackClassName="w-16" />
              <span className="text-base font-normal text-muted-foreground">
                {' '}
                once
              </span>
            </p>
            <p className="text-sm text-muted-foreground min-h-10">
              Updates forever. About three years of Yearly, then $0.
            </p>
            <Button asChild size="lg" variant="outline" className="mt-4 w-full">
              <Link href="/pro/checkout?product=wcpos-pro-lifetime">
                Get Lifetime
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            14-day money-back guarantee — no reason required
          </span>
          <span>5,000+ active stores</span>
          <span>Yearly credits toward Lifetime</span>
        </div>
      </div>
    </div>
  )
}
