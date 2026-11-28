import { useFormatter, useTranslations } from 'next-intl'
import { Store, Tent, Laptop } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { IconTile } from '@/components/ui/icon-tile'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

const ACTIVE_INSTALLS = 5000 // wordpress.org active installs, shown as "5,000+"
const IN_DEVELOPMENT_SINCE = 2014
// Distinct languages (English included) across the 53 locale codes in
// wcpos/translations locales.json at tag 2026.11.24, which both plugins pin.
const LANGUAGES_SHIPPED = 38

type UseCaseId = 'retail' | 'market' | 'desktop'

interface UseCase {
  id: UseCaseId
  icon: LucideIcon
  sourceUrl: string
}

// Real customer quotes from public wordpress.org reviews of the
// woocommerce-pos plugin — each attribution links to its source review.
const useCases: UseCase[] = [
  {
    id: 'retail',
    icon: Store,
    sourceUrl:
      'https://wordpress.org/support/topic/the-best-woo-pos-plugin-available-and-its-free/',
  },
  {
    id: 'market',
    icon: Tent,
    sourceUrl:
      'https://wordpress.org/support/topic/plus-dun-an-dutilisation-je-recommande/',
  },
  {
    id: 'desktop',
    icon: Laptop,
    sourceUrl:
      'https://wordpress.org/support/topic/great-pos-for-your-woocommerce-store/',
  },
]

const strong = (chunks: React.ReactNode) => (
  <b className="font-semibold text-foreground">{chunks}</b>
)

/** The three real reviews as a flat band, with the trust facts under the heading. */
export function UseCasesSection() {
  const t = useTranslations('home.useCases')
  const format = useFormatter()

  return (
    <Section tone="default" spacing="compact">
      <div className="mb-10 text-center">
        <SectionHeading title={t('title')} />
        <p className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            {t.rich('stats.installs', {
              count: `${format.number(ACTIVE_INSTALLS)}+`,
              b: strong,
            })}
          </span>
          <span>
            {t.rich('stats.since', { year: String(IN_DEVELOPMENT_SINCE), b: strong })}
          </span>
          <a
            href="https://github.com/wcpos"
            className="underline-offset-4 hover:underline"
          >
            {t.rich('stats.license', { b: strong })}
          </a>
          <span>
            {t.rich('stats.languages', {
              count: format.number(LANGUAGES_SHIPPED),
              b: strong,
            })}
          </span>
        </p>
      </div>

      <ul className="grid md:grid-cols-3">
        {useCases.map((uc) => {
          const cardKey = `cards.${uc.id}` as const

          return (
            <li
              key={uc.id}
              className="border-t border-border py-6 first:border-t-0 first:pt-0 md:border-l md:border-t-0 md:px-8 md:py-0 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
            >
              <figure>
                <h3 className="mb-3.5 flex items-center gap-4 text-sm font-semibold text-foreground">
                  <IconTile tone="brand" size="lg">
                    <uc.icon />
                  </IconTile>
                  {t(`${cardKey}.type`)}
                </h3>
                <blockquote className="mb-3 text-lg leading-7 text-slate-800 dark:text-slate-200">
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
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
