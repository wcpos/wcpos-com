import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Order Complete - WooCommerce POS Pro',
  description: 'Thank you for your purchase of WooCommerce POS Pro',
}

export default function CheckoutSuccessPage() {
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
            <li>✓ Your license key has been sent to your email</li>
            <li>✓ Download the Pro plugin from your email or account</li>
            <li>✓ Install and activate the plugin on your WordPress site</li>
            <li>✓ Enter your license key to unlock Pro features</li>
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="https://docs.wcpos.com/getting-started/installation">
              Installation Guide
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
