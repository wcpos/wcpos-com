/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Variant D — "Free anchors Pro".
 * Research-backed layout: the free plugin joins the grid as the first
 * column. It anchors the price, proves the product is real, and lets the
 * Pro columns list only the delta. Social proof + 14-day guarantee sit
 * directly under the cards (the highest-anxiety moment), and each CTA gets
 * one line of risk-reversal microcopy.
 */
import { Check, Shield, Star, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'
import { PriceSlot } from './price-slot'

const FREE_FEATURES = [
  'Full point of sale — no feature timer',
  'Unlimited products, orders & customers',
  'Native apps for iOS, Android & desktop',
  'No transaction fees, ever',
]

const PRO_DELTA = [
  'Payment terminal integration',
  'Stock & price editing at the register',
  'Order & customer management',
  'End-of-day reports',
  'Custom payment gateways',
  'Priority email support',
]

function ProFeatureList() {
  return (
    <ul className="space-y-2.5">
      <li className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Everything in Free, plus
      </li>
      {PRO_DELTA.map((feature) => (
        <li key={feature} className="flex items-start gap-2">
          <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
          <span className="text-sm">{feature}</span>
        </li>
      ))}
    </ul>
  )
}

export function VariantD({ delayMs }: { delayMs: number }) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {/* Free — the anchor */}
        <div className="flex flex-col rounded-2xl border border-dashed bg-muted/30 p-6">
          <p className="font-semibold">Free</p>
          <p className="text-sm text-muted-foreground mb-4">
            What you&apos;re running today
          </p>
          <p className="text-4xl font-bold mb-6">
            $0
            <span className="text-base font-normal text-muted-foreground">
              {' '}
              forever
            </span>
          </p>
          <ul className="space-y-2.5 flex-1">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="ghost" className="mt-6 w-full">
            <Link href="/downloads">Keep using Free</Link>
          </Button>
          <p className="mt-2 text-center text-xs text-transparent select-none">
            {/* spacer to align with pro cards */}.
          </p>
        </div>

        {/* Pro Yearly — featured */}
        <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-6 shadow-lg">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
            Most Popular
          </Badge>
          <p className="font-semibold">Pro Yearly</p>
          <p className="text-sm text-muted-foreground mb-4">
            Updates & support for one year
          </p>
          <p className="text-4xl font-bold mb-6">
            <PriceSlot planId="yearly" delayMs={delayMs} fallbackClassName="w-16" />
            <span className="text-base font-normal text-muted-foreground">
              /year
            </span>
          </p>
          <div className="flex-1">
            <ProFeatureList />
          </div>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href="/pro/checkout?product=wcpos-pro-yearly">
              Upgrade to Pro
            </Link>
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            One-time payment — never auto-renews
          </p>
        </div>

        {/* Pro Lifetime */}
        <div className="flex flex-col rounded-2xl border bg-card p-6">
          <p className="font-semibold">Pro Lifetime</p>
          <p className="text-sm text-muted-foreground mb-4">
            Updates forever, one payment
          </p>
          <p className="text-4xl font-bold mb-6">
            <PriceSlot planId="lifetime" delayMs={delayMs} fallbackClassName="w-16" />
            <span className="text-base font-normal text-muted-foreground">
              {' '}
              once
            </span>
          </p>
          <div className="flex-1">
            <ProFeatureList />
          </div>
          <Button asChild size="lg" variant="outline" className="mt-6 w-full">
            <Link href="/pro/checkout?product=wcpos-pro-lifetime">
              Get Lifetime
            </Link>
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            About 3 years of Yearly — then $0 forever
          </p>
        </div>
      </div>

      {/* Proof strip — directly under the cards */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          5,000+ active stores
        </span>
        <span className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          Free & open source since 2014
        </span>
        <span className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          14-day money-back guarantee — no reason required
        </span>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Not sure? Start Yearly — we credit your remaining time if you upgrade
        to Lifetime.
      </p>
    </div>
  )
}
