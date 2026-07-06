import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { CheckCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toneText } from '@/components/ui/status-tone'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({
    locale,
    namespace: 'pro.checkout.successPage.metadata',
  })

  return {
    title: t('title'),
    description: t('description'),
    // Post-purchase page — keep out of search engines.
    robots: { index: false, follow: false },
  }
}

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'pro.checkout.successPage' })

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <CheckCircle className={`h-20 w-20 mx-auto mb-6 ${toneText.positive}`} />

        <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>

        <p className="text-lg text-muted-foreground mb-6">
          {t('description')}
        </p>

        <div className="bg-muted/50 rounded-md p-6 mb-8">
          <h2 className="font-semibold mb-2">{t('nextTitle')}</h2>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li>{t('next.licenseEmail')}</li>
            <li>{t('next.accountDownload')}</li>
            <li>{t('next.install')}</li>
            <li>{t('next.activate')}</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/account/licenses">
              <Download className="mr-2 h-4 w-4" />
              {t('licenses')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            {/* External docs site — plain anchor, not locale-aware navigation */}
            <a href="https://docs.wcpos.com/getting-started/installation">
              {t('installationGuide')}
            </a>
          </Button>
        </div>
      </div>
    </main>
  )
}
