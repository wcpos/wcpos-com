import { Check } from 'lucide-react'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

const freeFeatures = [
  'WooCommerce sync',
  'Product search & grid',
  'Basic checkout',
  'Offline mode',
  'Receipt printing',
  'Multi-currency',
  'Unlimited products',
]

const proFeatures = [
  'Payment terminal integration',
  'Stock & price editing in POS',
  'Order history & management',
  'Customer management',
  'End-of-day reports',
  'Custom payment gateways',
  'Priority support',
]

export function PricingTeaserSection() {
  return (
    <Section tone="muted" spacing="default">
      <SectionHeading
        className="mb-10"
        title="Start free. Upgrade when you need more."
      />

      {/* Comparison */}
      <div className="mx-auto mb-8 grid max-w-3xl overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 md:grid-cols-2">
        {/* Free Column */}
        <div className="bg-slate-50 p-6 dark:bg-slate-800/50">
          <h3 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
            Free
          </h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Free forever. No transaction fees. No limits.
          </p>
          <ul className="space-y-3">
            {freeFeatures.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-wcpos-red"
                />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro Column */}
        <div className="border-t border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 md:border-l md:border-t-0">
          <h3 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
            Pro
          </h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            $129/year or $399 lifetime. No per-register fees.
          </p>
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Everything in Free, plus:
          </p>
          <ul className="space-y-3">
            {proFeatures.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-wcpos-red"
                />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Button asChild variant="brand" size="xl">
          <TrackedLocaleLink
            href="/pro"
            eventName="click_pro_cta"
            eventProperties={{ location: 'home_pricing_teaser' }}
          >
            See Full Pricing &amp; Features
          </TrackedLocaleLink>
        </Button>
      </div>
    </Section>
  )
}
