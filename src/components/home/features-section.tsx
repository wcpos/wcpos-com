const features = [
  {
    title: 'Fast product search',
    description:
      'Find products instantly with search, filters, and category browsing. Barcode scanner support.',
    pro: false,
  },
  {
    title: 'Smooth checkout flow',
    description:
      'Add items, apply discounts, choose payment method. Supports Stripe Terminal, SumUp, cash, and custom gateways.',
    pro: true,
  },
  {
    title: 'Customer profiles',
    description:
      'Add and edit customer info directly in the POS. Track regulars, offer better service.',
    pro: true,
  },
  {
    title: 'Order history & management',
    description:
      'View past orders, process returns, check order status without switching to WP Admin.',
    pro: true,
  },
  {
    title: 'Edit stock & prices on the fly',
    description:
      'Fix a wrong price while serving a customer. Adjust stock without leaving the POS.',
    pro: true,
  },
  {
    title: 'End-of-day reports',
    description:
      'Generate sales reports for each shift or day. Cash up quickly, track performance.',
    pro: true,
  },
]

export function FeaturesSection() {
  return (
    <section className="bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-semibold text-center text-slate-800 dark:text-slate-100 mb-12">
          Built for the demands of physical retail
        </h2>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
            >
              {/* Screenshot placeholder */}
              <div className="w-full aspect-[16/10] bg-slate-100 dark:bg-slate-700 flex items-center justify-center relative">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Screenshot
                </span>
                {feature.pro && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    Pro
                  </span>
                )}
              </div>

              <div className="p-5">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
