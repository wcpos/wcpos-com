const useCases = [
  {
    type: 'Retail Store',
    quote:
      'We had 400 products already in WooCommerce. WCPOS meant we didn\'t have to enter them again. It just worked.',
    attribution: '— Hat shop owner, Spain',
    useCase: 'Daily in-store sales with iPad and Stripe Terminal',
  },
  {
    type: 'Market Vendor',
    quote:
      'Internet at markets is terrible. WCPOS works offline and syncs when I\'m home. Perfect for weekend events.',
    attribution: '— Cat toy vendor, UK',
    useCase: 'Weekend markets and events, offline mode essential',
  },
  {
    type: 'Agency Setup',
    quote:
      'I set up WCPOS for three clients. Native WooCommerce integration means it just works with their existing plugins. No maintenance headaches.',
    attribution: '— WordPress developer, Australia',
    useCase: 'Multi-client deployments with custom extensions',
  },
]

export function UseCasesSection() {
  return (
    <section className="bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-semibold text-center text-slate-800 dark:text-slate-100 mb-12">
          Works for stores of all kinds
        </h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {useCases.map((uc) => (
            <div
              key={uc.type}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all"
            >
              {/* Image placeholder */}
              <div className="w-full h-40 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Store photo
                </span>
              </div>

              <div className="p-6">
                <span className="inline-block text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-slate-700 dark:text-amber-300 px-3 py-1 rounded-full mb-4">
                  {uc.type}
                </span>
                <blockquote className="text-slate-800 dark:text-slate-200 italic leading-relaxed mb-3">
                  &ldquo;{uc.quote}&rdquo;
                </blockquote>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  {uc.attribution}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {uc.useCase}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
