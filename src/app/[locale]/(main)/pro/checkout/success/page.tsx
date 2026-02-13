import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { CheckCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Order Complete - WooCommerce POS Pro',
  description: 'Thank you for your purchase of WooCommerce POS Pro',
}

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />

        <h1 className="text-3xl font-bold mb-4">Thank You!</h1>

        <p className="text-lg text-muted-foreground mb-6">
          Your purchase of WooCommerce POS Pro is complete.
        </p>

        <div className="bg-muted/50 rounded-lg p-6 mb-8">
          <h2 className="font-semibold mb-2">What happens next?</h2>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li>✓ Your license key and download link have been sent to your email</li>
            <li>✓ You can also download from your account&apos;s licenses page</li>
            <li>✓ Install and activate the plugin on your WordPress site</li>
            <li>✓ Enter your license key to unlock Pro features</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/account/licenses">
              <Download className="mr-2 h-4 w-4" />
              Go to Licenses
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="https://docs.wcpos.com/getting-started/installation">
              Installation Guide
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
