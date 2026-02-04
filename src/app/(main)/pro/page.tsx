import { Suspense } from 'react'
import { getWcposProProducts } from '@/services/core/external/medusa-client'
import { PricingCard } from '@/components/pro/pricing-card'

export const metadata = {
  title: 'Pro - Premium Features',
  description:
    'Unlock the full potential of WooCommerce POS with Pro features including advanced reporting, multi-outlet support, and priority support.',
}

/**
 * Dynamic component that fetches products from Medusa
 */
async function PricingSection() {
  const products = await getWcposProProducts()

  // Sort products: yearly first, then lifetime
  const sortedProducts = [...products].sort((a, b) => {
    if (a.handle === 'wcpos-pro-yearly') return -1
    if (b.handle === 'wcpos-pro-yearly') return 1
    return 0
  })

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Pricing information is currently unavailable. Please try again
          later.
        </p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
      {sortedProducts.map((product) => (
        <PricingCard
          key={product.id}
          product={product}
          featured={product.handle === 'wcpos-pro-yearly'}
        />
      ))}
    </div>
  )
}

function PricingSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

export default function ProPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'WooCommerce POS Pro',
            description:
              'Premium Point of Sale plugin for WooCommerce with advanced reporting, multi-outlet support, and priority support.',
            brand: {
              '@type': 'Organization',
              name: 'WCPOS',
            },
            offers: [
              {
                '@type': 'Offer',
                name: 'Yearly Subscription',
                priceCurrency: 'USD',
                price: '129',
                availability: 'https://schema.org/InStock',
              },
              {
                '@type': 'Offer',
                name: 'Lifetime License',
                priceCurrency: 'USD',
                price: '249',
                availability: 'https://schema.org/InStock',
              },
            ],
          }),
        }}
      />
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          WooCommerce POS Pro
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Take your point of sale to the next level with advanced features,
          priority support, and unlimited capabilities.
        </p>
      </section>

      {/* Pricing Section - Dynamic */}
      <section className="container mx-auto px-4 pb-16">
        <Suspense fallback={<PricingSkeleton />}>
          <PricingSection />
        </Suspense>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-3xl font-bold text-center mb-12">
          What&apos;s included in Pro?
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureBlock
            title="Unlimited Everything"
            description="No limits on orders, products, or customers. Scale your business without restrictions."
          />
          <FeatureBlock
            title="Priority Support"
            description="Get faster responses and dedicated assistance from our support team."
          />
          <FeatureBlock
            title="Advanced Features"
            description="Access pro-only features including advanced reporting and customization options."
          />
          <FeatureBlock
            title="Multi-outlet Support"
            description="Manage multiple store locations from a single dashboard."
          />
          <FeatureBlock
            title="Automatic Updates"
            description="Always stay up to date with the latest features and security patches."
          />
          <FeatureBlock
            title="Custom Receipts"
            description="Fully customizable receipt templates with your branding."
          />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-3xl font-bold text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          <FaqItem
            question="What's the difference between Yearly and Lifetime?"
            answer="The Yearly subscription renews annually and includes all updates during your subscription period. The Lifetime license is a one-time payment that includes updates forever."
          />
          <FaqItem
            question="Can I upgrade from Yearly to Lifetime?"
            answer="Yes! Contact our support team and we'll credit your remaining subscription towards a Lifetime license."
          />
          <FaqItem
            question="How many sites can I use my license on?"
            answer="Each license can be activated on multiple sites. Check your account dashboard for activation limits."
          />
          <FaqItem
            question="What payment methods do you accept?"
            answer="We accept credit cards (Visa, Mastercard, Amex), PayPal, and Bitcoin."
          />
        </div>
      </section>
    </main>
  )
}

function FeatureBlock({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b pb-6">
      <h3 className="text-lg font-semibold mb-2">{question}</h3>
      <p className="text-muted-foreground">{answer}</p>
    </div>
  )
}
