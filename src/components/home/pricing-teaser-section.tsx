import { Check } from 'lucide-react'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'

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
    <section className="bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="mb-10 text-center text-2xl font-semibold text-slate-800 dark:text-slate-100 md:text-3xl">
          Start free. Upgrade when you need more.
        </h2>

        {/* Comparison */}
        <div className="mx-auto mb-8 grid max-w-3xl overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 md:grid-cols-2">
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
              $129/year or $249 lifetime. No per-register fees.
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
          <TrackedLocaleLink
            href="/pro"
            eventName="click_pro_cta"
            eventProperties={{ location: 'home_pricing_teaser' }}
            className="inline-flex items-center justify-center rounded-lg bg-wcpos-red px-8 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wcpos-red focus-visible:ring-offset-2"
          >
            See Full Pricing &amp; Features
          </TrackedLocaleLink>
        </div>
      </div>
    </section>
  )
}
