import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { getLocale } from 'next-intl/server'
import {
  applyProOfferCatalogCachePolicy,
  formatFounderProPriceSummary,
  getProOfferCatalog,
  type ProOffer,
} from '@/lib/pro-offer-catalog'
import { getLiveStoreEnvironment } from '@/lib/store-environment'
import { Section } from '@/components/ui/section'

export function FounderLetterFallback() {
  return <FounderLetterContent offers={null} />
}

async function getCachedFounderOffers(locale: string) {
  'use cache'

  // Prerendered into the shared static shell — always live prices.
  const catalog = await getProOfferCatalog(
    undefined,
    getLiveStoreEnvironment(),
    locale
  )
  applyProOfferCatalogCachePolicy(catalog)
  return catalog.offers
}

export async function FounderLetter() {
  const locale = await getLocale()
  const offers = await getCachedFounderOffers(locale)

  return <FounderLetterContent offers={offers} />
}

function Strong({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-semibold text-slate-900 dark:text-slate-100">
      {children}
    </strong>
  )
}

function FounderLetterContent({
  offers,
}: {
  offers: ProOffer[] | null
}) {
  const t = useTranslations('about.founder')
  const priceSummary = offers
    ? formatFounderProPriceSummary(offers, (values) =>
        t('ps.priceSummary', values)
      )
    : null

  return (
    <Section tone="muted" spacing="default">
      <article className="mx-auto max-w-2xl rounded-sm bg-[#fffefb] p-8 shadow-lg md:p-12 dark:bg-slate-800">
        <div
          aria-hidden="true"
          className="-mx-8 -mt-8 mb-8 h-[5px] rounded-t-sm md:-mx-12 md:-mt-12"
          style={{
            background:
              'repeating-linear-gradient(90deg,#CD2C24 0 22px,#F5E5C0 22px 44px)',
          }}
        />

        <figure className="float-right mb-3 ml-5 w-[180px] rotate-[1.6deg] bg-white p-2.5 shadow-lg md:w-[218px]">
          <Image
            src="/paul-urban-locavore.jpg"
            alt={t('photoAlt')}
            width={592}
            height={800}
            sizes="(min-width: 768px) 218px, 180px"
            className="w-full"
          />
          <figcaption className="mt-2 text-center text-[11px] text-slate-500">
            {t('photoCaption')}
          </figcaption>
        </figure>

        <p className="mb-5 text-xs uppercase tracking-wide text-slate-400">
          {t('eyebrow')}
        </p>
        <p className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
          {t('intro')}
        </p>

        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          {t.rich('p1', {
            strong: (chunks) => <Strong>{chunks}</Strong>,
          })}
        </p>

        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          {t.rich('p2', {
            strong: (chunks) => <Strong>{chunks}</Strong>,
          })}
        </p>

        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          {t('p3')}
        </p>

        <div className="mt-6 flex items-center gap-3.5">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#323A46] font-bold text-[#F5E5C0]">
            PK
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('signature.name')}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('signature.role')}{' '}
              <a
                href="https://github.com/kilbot"
                className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300"
                rel="noopener"
              >
                github.com/kilbot
              </a>
            </div>
          </div>
        </div>

        <p className="mt-6 border-t border-[#efece4] pt-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          <Strong>{t('ps.label')}</Strong>{' '}
          {priceSummary ? (
            <>
              {t.rich('ps.withPrice', {
                price: () => <Strong>{priceSummary}</Strong>,
              })}
            </>
          ) : (
            t('ps.fallback')
          )}{' '}
          {t('ps.licence')}
        </p>
      </article>
    </Section>
  )
}
