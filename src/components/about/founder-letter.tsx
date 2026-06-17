import { cacheLife, cacheTag } from 'next/cache'
import {
  formatFounderProPriceSummary,
  getProOfferCatalog,
} from '@/lib/pro-offer-catalog'

export function FounderLetterFallback() {
  return <FounderLetterContent priceSummary={null} />
}

export async function FounderLetter() {
  'use cache'
  cacheLife('products')
  cacheTag('products')

  const { offers } = await getProOfferCatalog()
  const priceSummary = formatFounderProPriceSummary(offers)

  return <FounderLetterContent priceSummary={priceSummary} />
}

function FounderLetterContent({
  priceSummary,
}: {
  priceSummary: string | null
}) {
  return (
    <section className="bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <article className="mx-auto max-w-2xl rounded-sm bg-[#fffefb] p-8 shadow-lg md:p-12 dark:bg-slate-800">
          <div
            aria-hidden="true"
            className="-mx-8 mb-8 h-[5px] md:-mx-12"
            style={{
              background:
                'repeating-linear-gradient(90deg,#CD2C24 0 22px,#F5E5C0 22px 44px)',
            }}
          />

          <figure className="float-right mb-3 ml-5 w-[180px] rotate-[1.6deg] bg-white p-2.5 shadow-lg md:w-[218px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- plain portrait from /public; repo uses next/image only in middleware */}
            <img
              src="/paul-urban-locavore.jpg"
              alt="Paul at Urban Locavore, his Perth shop"
              width={592}
              height={800}
              loading="lazy"
              className="w-full"
            />
            <figcaption className="mt-2 text-center text-[11px] text-slate-500">
              Urban Locavore, Perth — the store that started it all
            </figcaption>
          </figure>

          <p className="mb-5 text-xs uppercase tracking-wide text-slate-400">
            A note from the developer
          </p>
          <p className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
            Hi — I&apos;m Paul. I built WooCommerce POS.
          </p>

          <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
            That&apos;s me, back when it all started. I opened Urban Locavore in
            Perth in December 2011 with hundreds of products already in
            WooCommerce and no way to sell them at the counter — so I built a
            register myself. When the shop closed in April 2014, I put it on
            WordPress.org for anyone who needed it.{' '}
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              POS plugins for WooCommerce have come and gone since then. This one
              hasn&apos;t.
            </strong>{' '}
            More than a decade of releases, one developer, still shipping — and
            the free version is still the real thing: sell, print, stay in sync.
            It stays free.
          </p>

          <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              Pro is why it&apos;s still here.
            </strong>{' '}
            It adds extra tools for running your store — card readers, refunds at
            the till, end-of-day reports, multi-store — and it funds every
            release, free ones included. No investors, no acquisition exit
            waiting. Shopkeepers fund it directly.
          </p>

          <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
            And Pro users have a direct line: tell me what your shop needs, and
            it shapes what I build next.
          </p>

          <div className="mt-6 flex items-center gap-3.5">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#323A46] font-bold text-[#F5E5C0]">
              PK
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Paul Kilmurray
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                developer &amp; former shopkeeper ·{' '}
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
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              P.S.
            </strong>{' '}
            — Pro is{' '}
            {priceSummary ? (
              <>
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  {priceSummary}
                </strong>
                .{' '}
              </>
            ) : (
              'available from the Pro page. '
            )}
            If a licence lapses, Pro keeps working; you just stop getting
            updates.
          </p>
        </article>
      </div>
    </section>
  )
}
