import { Check } from 'lucide-react'

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
  'Everything in Free, plus:',
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
        <h2 className="text-2xl md:text-3xl font-semibold text-center text-slate-800 dark:text-slate-100 mb-10">
          Start free. Upgrade when you need more.
        </h2>

        {/* Comparison Table */}
        <div className="grid md:grid-cols-2 gap-0 max-w-3xl mx-auto border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-8">
          {/* Free Column */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Free
            </h3>
            <ul className="space-y-3">
              {freeFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <Check className="w-4 h-4 text-wcpos-red shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Column */}
          <div className="bg-white dark:bg-slate-800 p-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Pro
            </h3>
            <ul className="space-y-3">
              {proFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <Check className="w-4 h-4 text-wcpos-red shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pricing Callout */}
        <div className="flex flex-col sm:flex-row justify-center gap-8 text-center mb-8">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">
              Free
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Free forever. No transaction fees. No limits.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">
              Pro
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              $129/year or $399 lifetime. No per-register fees.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="/pro"
            className="inline-flex items-center justify-center rounded-lg bg-wcpos-red px-8 py-3 text-sm font-semibold text-white hover:brightness-110 transition-all"
          >
            See Full Pricing &amp; Features
          </a>
        </div>
      </div>
    </section>
  )
}
