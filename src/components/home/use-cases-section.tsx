import { Store, Tent, Laptop } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

interface UseCase {
  type: string
  icon: LucideIcon
  iconClasses: string
  bandClasses: string
  quote: string
  attribution: string
  sourceUrl: string
  note?: string
}

// Real customer quotes from public wordpress.org reviews of the
// woocommerce-pos plugin — each attribution links to its source review.
const useCases: UseCase[] = [
  {
    type: 'Retail Store',
    icon: Store,
    iconClasses: 'text-wcpos-red',
    bandClasses: 'bg-rose-50 dark:bg-rose-950/30',
    quote:
      'I did a lot of research when looking for a POS for my existing WC site, and nearly overlooked this one because it was free. But I’m glad I tried it. It does everything you want without asking for subscriptions or a percentage of your sales.',
    attribution: 'nckllnpssy',
    sourceUrl:
      'https://wordpress.org/support/topic/the-best-woo-pos-plugin-available-and-its-free/',
  },
  {
    type: 'Market Vendor',
    icon: Tent,
    iconClasses: 'text-amber-600 dark:text-amber-400',
    bandClasses: 'bg-amber-50 dark:bg-amber-950/30',
    quote:
      'I’m a ceramicist in Annecy and I sell through my WooCommerce shop and at markets. I’ve been using WCPOS for over a year and bought the lifetime Pro license a few months ago — worth it, I think. Paul is responsive on Discord, even on weekends.',
    attribution: 'adeline',
    sourceUrl:
      'https://wordpress.org/support/topic/plus-dun-an-dutilisation-je-recommande/',
    note: 'translated from French',
  },
  {
    type: 'Desktop & Offline',
    icon: Laptop,
    iconClasses: 'text-sky-600 dark:text-sky-400',
    bandClasses: 'bg-sky-50 dark:bg-sky-950/30',
    quote:
      'Great POS for your WooCommerce store, it has the desktop version which makes it better for places with weak internet connectivity. I believe there are more great features coming up.',
    attribution: 'rodriguekgl',
    sourceUrl:
      'https://wordpress.org/support/topic/great-pos-for-your-woocommerce-store/',
  },
]

export function UseCasesSection() {
  return (
    <Section tone="muted" spacing="default">
      <SectionHeading className="mb-12" title="Works for stores of all kinds" />

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
                <blockquote className="mb-3 leading-relaxed text-slate-800 dark:text-slate-200">
                  &ldquo;{uc.quote}&rdquo;
                </blockquote>
                <figcaption className="text-xs text-slate-500 dark:text-slate-400">
                  —{' '}
                  <a
                    href={uc.sourceUrl}
                    className="underline underline-offset-4 hover:text-slate-700 dark:hover:text-slate-300"
                    rel="noopener"
                  >
                    {uc.attribution}, wordpress.org review
                  </a>
                  {uc.note ? ` (${uc.note})` : null}
                </figcaption>
              </figure>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
