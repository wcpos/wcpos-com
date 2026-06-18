import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PricingCard } from './pricing-card'
import type { ProOffer } from '@/lib/pro-offer-catalog'

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const yearlyOffer: ProOffer = {
  planId: 'yearly',
  handle: 'wcpos-pro-yearly',
  variantId: 'variant_123',
  title: 'WCPOS Pro Yearly',
  description: 'One-year license',
  featured: true,
  badgeLabel: 'Most Popular',
  price: {
    amount: 129,
    currencyCode: 'usd',
    formatted: '$129.00',
    compact: '$129',
    schemaPrice: '129',
  },
  priceSuffix: '/year',
  features: [
    'All Pro features included',
    'Unlimited orders & products',
    'Priority email support',
    'Automatic updates for 1 year',
    'Manual renewal — no automatic billing',
  ],
  checkoutPath: '/pro/checkout?product=wcpos-pro-yearly&variant=variant_123',
}

const lifetimeOffer: ProOffer = {
  ...yearlyOffer,
  planId: 'lifetime',
  handle: 'wcpos-pro-lifetime',
  title: 'WCPOS Pro Lifetime',
  description: 'One-time purchase',
  featured: false,
  badgeLabel: null,
  price: {
    amount: 399,
    currencyCode: 'usd',
    formatted: '$399.00',
    compact: '$399',
    schemaPrice: '399',
  },
  priceSuffix: null,
  features: [
    'All Pro features included',
    'Unlimited orders & products',
    'Priority email support',
    'Lifetime updates forever',
    'One-time payment',
    'Best value for long-term use',
  ],
  variantId: 'variant_456',
  checkoutPath: '/pro/checkout?product=wcpos-pro-lifetime&variant=variant_456',
}

describe('PricingCard', () => {
  it('renders lifetime offer copy from the offer catalog', () => {
    render(<PricingCard offer={lifetimeOffer} />)

    expect(screen.getByText('One-time purchase')).toBeInTheDocument()
    expect(screen.getByText('Lifetime updates forever')).toBeInTheDocument()
    expect(screen.queryByText('/year')).not.toBeInTheDocument()
    expect(screen.queryByText('One-year license')).not.toBeInTheDocument()
  })

  it('renders yearly offer copy from the offer catalog', () => {
    render(<PricingCard offer={yearlyOffer} />)

    expect(screen.getByText('One-year license')).toBeInTheDocument()
    expect(screen.getByText('/year')).toBeInTheDocument()
    expect(screen.getByText('Manual renewal — no automatic billing')).toBeInTheDocument()
    expect(screen.queryByText('Cancel anytime')).not.toBeInTheDocument()
    expect(screen.queryByText('Annual subscription')).not.toBeInTheDocument()
  })

  it('includes experiment metadata in checkout link', () => {
    render(<PricingCard offer={yearlyOffer} experimentVariant="value_copy" />)

    const cta = screen.getByRole('link', { name: 'Get Instant Access' })
    const href = cta.getAttribute('href')

    expect(href).toContain('/pro/checkout?')
    expect(href).toContain('product=wcpos-pro-yearly')
    expect(href).toContain('variant=variant_123')
    expect(href).toContain('exp=pro_checkout_v1')
    expect(href).toContain('exp_variant=value_copy')
  })
})
