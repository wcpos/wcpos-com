import { setRequestLocale } from 'next-intl/server'
import { DesktopDownloads } from '@/components/desktop-downloads'

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">WooCommerce POS</h1>
        <p className="text-lg text-gray-600 mb-8">
          Point of Sale for WooCommerce
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>Site under construction</p>
          <p>
{/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route, not a page */}
            <a
              href="/api/health"
              className="text-blue-500 hover:underline"
            >
              API Health Check
            </a>
          </p>
        </div>
      </div>
      
      <div className="w-full max-w-2xl">
        <DesktopDownloads />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'WooCommerce POS',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Windows, macOS, Linux',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
          }),
        }}
      />
    </main>
  )
}
