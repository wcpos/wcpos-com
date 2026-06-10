import { Store, Tent, Code2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface UseCase {
  type: string
  icon: LucideIcon
  iconClasses: string
  bandClasses: string
  quote: string
  attribution: string
  useCase: string
}

const useCases: UseCase[] = [
  {
    type: 'Retail Store',
    icon: Store,
    iconClasses: 'text-wcpos-red',
    bandClasses: 'bg-rose-50 dark:bg-rose-950/30',
    quote:
      "We had 400 products already in WooCommerce. WCPOS meant we didn't have to enter them again. It just worked.",
    attribution: 'Hat shop owner, Spain',
    useCase: 'Daily in-store sales with iPad and Stripe Terminal',
  },
  {
    type: 'Market Vendor',
    icon: Tent,
    iconClasses: 'text-amber-600 dark:text-amber-400',
    bandClasses: 'bg-amber-50 dark:bg-amber-950/30',
    quote:
      "Internet at markets is terrible. WCPOS works offline and syncs when I'm home. Perfect for weekend events.",
    attribution: 'Cat toy vendor, UK',
    useCase: 'Weekend markets and events, offline mode essential',
  },
  {
    type: 'Agency Setup',
    icon: Code2,
    iconClasses: 'text-sky-600 dark:text-sky-400',
    bandClasses: 'bg-sky-50 dark:bg-sky-950/30',
    quote:
      'I set up WCPOS for three clients. Native WooCommerce integration means it just works with their existing plugins. No maintenance headaches.',
    attribution: 'WordPress developer, Australia',
    useCase: 'Multi-client deployments with custom extensions',
  },
]

export function UseCasesSection() {
  return (
    <section className="bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="mb-12 text-center text-2xl font-semibold text-slate-800 dark:text-slate-100 md:text-3xl">
          Works for stores of all kinds
        </h2>

        <ul className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {useCases.map((uc) => (
            <li
              key={uc.type}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              <div
                aria-hidden="true"
                className={`flex h-28 items-center justify-center ${uc.bandClasses}`}
              >
                <uc.icon className={`h-10 w-10 ${uc.iconClasses}`} />
              </div>

              <div className="p-6">
                <h3 className="mb-4">
                  <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {uc.type}
                  </span>
                </h3>
                <figure>
                  <blockquote className="mb-3 italic leading-relaxed text-slate-800 dark:text-slate-200">
                    &ldquo;{uc.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                    — {uc.attribution}
                  </figcaption>
                </figure>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {uc.useCase}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
