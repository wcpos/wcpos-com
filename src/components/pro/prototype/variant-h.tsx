/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Variant H — "The buy box".
 * Product-page pattern instead of pricing-page pattern: the feature list
 * appears once on the left (icons + real descriptions), and the purchase
 * decision lives in a sticky buy box on the right — radio price rows whose
 * only content is price + term facts, one CTA that follows the selection,
 * guarantee and accepted payment methods underneath.
 */
import {
  BarChart3,
  Bitcoin,
  ClipboardList,
  CreditCard,
  PencilRuler,
  Plug,
  Shield,
  Users,
} from 'lucide-react'
import { IconTile } from '@/components/ui/icon-tile'
import { PriceSlot } from './price-slot'
import { TermChooser } from './term-chooser'

const FEATURES = [
  {
    icon: CreditCard,
    title: 'Payment terminals',
    description:
      'Connect card readers and payment terminals for fast, accurate in-person payments.',
  },
  {
    icon: PencilRuler,
    title: 'Stock & price editing',
    description:
      'Update stock levels, prices, and product details right from the POS — no trip to the WordPress admin.',
  },
  {
    icon: ClipboardList,
    title: 'Order management',
    description:
      'Browse order history, open past orders, and manage them without leaving the register.',
  },
  {
    icon: Users,
    title: 'Customer management',
    description:
      'Add and edit customer details at the point of sale, kept in sync with WooCommerce.',
  },
  {
    icon: BarChart3,
    title: 'End-of-day reports',
    description:
      'Close the register with end-of-day summaries of sales, payments, and takings.',
  },
  {
    icon: Plug,
    title: 'Custom payment gateways',
    description:
      'Take payments with any WooCommerce-compatible gateway, not just the built-in options.',
  },
]

export function VariantH({ delayMs }: { delayMs: number }) {
  return (
    <div className="max-w-5xl mx-auto grid gap-10 lg:grid-cols-[1.5fr_1fr] items-start">
      {/* Features — once, with substance */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-wcpos-red-accent mb-6">
          Everything in Free, plus
        </p>
        <div className="space-y-7">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex gap-4">
              <IconTile tone="brand" size="lg">
                <feature.icon />
              </IconTile>
              <div>
                <p className="font-semibold">{feature.title}</p>
                <p className="mt-1 text-sm text-muted-foreground max-w-md">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buy box — sticky, price + term facts only */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm lg:sticky lg:top-24">
        <p className="font-semibold text-lg mb-1">Get Pro</p>
        <p className="text-sm text-muted-foreground mb-5">
          One license, all features. Just pick how long you want updates.
        </p>

        <TermChooser
          options={[
            {
              planId: 'yearly',
              title: 'Yearly',
              subtitle: 'Updates & support for 1 year',
              badgeLabel: 'Most Popular',
              priceNode: (
                <PriceSlot
                  planId="yearly"
                  delayMs={delayMs}
                  fallbackClassName="w-12"
                />
              ),
              priceSuffix: '/yr',
              checkoutHref: '/pro/checkout?product=wcpos-pro-yearly',
              ctaNote: 'One-time payment — never auto-renews.',
            },
            {
              planId: 'lifetime',
              title: 'Lifetime',
              subtitle: 'Updates forever',
              badgeLabel: null,
              priceNode: (
                <PriceSlot
                  planId="lifetime"
                  delayMs={delayMs}
                  fallbackClassName="w-12"
                />
              ),
              priceSuffix: ' once',
              checkoutHref: '/pro/checkout?product=wcpos-pro-lifetime',
              ctaNote: 'About 3 years of Yearly — then $0 forever.',
            },
          ]}
        />

        <div className="mt-5 space-y-2 border-t pt-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Shield className="h-4 w-4 shrink-0" />
            14-day money-back guarantee, no reason required
          </p>
          <p className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 shrink-0" />
            Card, PayPal or <Bitcoin className="h-4 w-4 -mx-1 shrink-0" />
            Bitcoin
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          5,000+ active stores · Yearly credits toward Lifetime
        </p>
      </div>
    </div>
  )
}
