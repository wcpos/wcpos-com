import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { clientMessages } from '@/i18n/client-messages'
import { CheckoutContent } from './checkout-content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({
    locale,
    namespace: 'pro.checkout.page.metadata',
  })

  return {
    title: t('title'),
    description: t('description'),
    // Auth-gated transactional page — keep out of search engines.
    robots: { index: false, follow: false },
  }
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const [messages, t] = await Promise.all([
    getMessages(),
    getTranslations({ locale, namespace: 'pro.checkout.page' }),
  ])

  return (
    <NextIntlClientProvider
      messages={clientMessages(messages, [
        'pro.checkout',
        'account.productTitles',
        'account.profile',
      ])}
    >
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/pro"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToPricing')}
          </Link>

          <h1 className="text-3xl font-bold mb-8 text-center">{t('title')}</h1>

          <Suspense
            fallback={
              // Mirrors the loaded layout: three step rows + sticky summary.
              <div className="mx-auto grid max-w-4xl items-start gap-8 md:grid-cols-[1.6fr_1fr]">
                <div className="space-y-3">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="rounded-md border bg-card p-5">
                      <Skeleton className="h-6 w-40" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3 rounded-md border bg-card p-5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-20" />
                </div>
              </div>
            }
          >
            <CheckoutContent
              locale={locale}
              searchParamsPromise={searchParams}
            />
          </Suspense>
        </div>
      </main>
    </NextIntlClientProvider>
  )
}
