import { useTranslations } from 'next-intl'
import { Store, Tent, Laptop } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

type UseCaseId = 'retail' | 'market' | 'desktop'

interface UseCase {
  id: UseCaseId
  icon: LucideIcon
  iconClasses: string
  bandClasses: string
  sourceUrl: string
}

// Real customer quotes from public wordpress.org reviews of the
// woocommerce-pos plugin — each attribution links to its source review.
const useCases: UseCase[] = [
  {
    id: 'retail',
    icon: Store,
    iconClasses: 'text-wcpos-red',
    bandClasses: 'bg-rose-50 dark:bg-rose-950/30',
    sourceUrl:
      'https://wordpress.org/support/topic/the-best-woo-pos-plugin-available-and-its-free/',
  },
  {
    id: 'market',
    icon: Tent,
    iconClasses: 'text-amber-600 dark:text-amber-400',
    bandClasses: 'bg-amber-50 dark:bg-amber-950/30',
    sourceUrl:
      'https://wordpress.org/support/topic/plus-dun-an-dutilisation-je-recommande/',
  },
  {
    id: 'desktop',
    icon: Laptop,
    iconClasses: 'text-sky-600 dark:text-sky-400',
    bandClasses: 'bg-sky-50 dark:bg-sky-950/30',
    sourceUrl:
      'https://wordpress.org/support/topic/great-pos-for-your-woocommerce-store/',
  },
]

export function UseCasesSection() {
  const t = useTranslations('home.useCases')

  return (
    <Section tone="muted" spacing="default">
      <SectionHeading className="mb-12" title={t('title')} />

      <ul className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        {useCases.map((uc) => {
          const cardKey = `cards.${uc.id}` as const

          return (
            <li
              key={uc.id}
              className="overflow-hidden rounded-md border border-slate-200 bg-white transition-colors hover:border-foreground/20 dark:border-slate-700 dark:bg-slate-800"
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
                    {t(`${cardKey}.type`)}
                  </span>
                </h3>
                <figure>
                  <blockquote className="mb-3 leading-relaxed text-slate-800 dark:text-slate-200">
                    &ldquo;{t(`${cardKey}.quote`)}&rdquo;
                  </blockquote>
                  <figcaption className="text-xs text-slate-500 dark:text-slate-400">
                    —{' '}
                    <a
                      href={uc.sourceUrl}
                      className="underline underline-offset-4 hover:text-slate-700 dark:hover:text-slate-300"
                      rel="noopener"
                    >
                      {t(`${cardKey}.attribution`)}, {t('reviewSuffix')}
                    </a>
                    {uc.id === 'market' ? ` (${t('cards.market.note')})` : null}
                  </figcaption>
                </figure>
              </div>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
