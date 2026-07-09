import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Bitcoin } from 'lucide-react'
import { redirect } from '@/i18n/navigation'
import { BitcoinReturnStatus } from '@/components/pro/bitcoin-return-status'

/**
 * Return landing for BTCPay-hosted invoice pages. The payment provider
 * redirects customers to `/processing?cart=<cartId>` after they pay (the
 * path is fixed by medusa-plugin-btcpay: storefront_url + "/processing").
 * The order is created server-side by the BTCPay webhook — this page just
 * tracks progress and forwards to the checkout success page.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({
    locale,
    namespace: 'pro.checkout.processingPage.metadata',
  })

  return {
    title: t('title'),
    description: t('description'),
    // Transient post-payment page — keep out of search engines.
    robots: { index: false, follow: false },
  }
}

async function ProcessingContent({
  locale,
  searchParamsPromise,
}: {
  locale: string
  searchParamsPromise: Promise<{ cart?: string | string[] }>
}) {
  const { cart } = await searchParamsPromise
  const cartId = typeof cart === 'string' ? cart.trim() : ''
  // Nothing to track without a cart — send strays to the checkout.
  if (!cartId) {
    redirect({ href: '/pro/checkout', locale })
  }

  return <BitcoinReturnStatus cartId={cartId} />
}

export default async function ProcessingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ cart?: string | string[] }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({
    locale,
    namespace: 'pro.checkout.processingPage',
  })

  return (
    <Suspense
      fallback={
        // Mirrors the client component's initial "checking" state so the
        // static shell and the hydrated page look identical.
        <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
          <div className="container mx-auto px-4 py-16 text-center max-w-lg">
            <Bitcoin className="h-20 w-20 mx-auto mb-6 text-muted-foreground animate-pulse" />
            <h1 className="text-3xl font-bold mb-4">{t('checking.title')}</h1>
            <p className="text-lg text-muted-foreground mb-8">
              {t('checking.description')}
            </p>
          </div>
        </main>
      }
    >
      <ProcessingContent locale={locale} searchParamsPromise={searchParams} />
    </Suspense>
  )
}
