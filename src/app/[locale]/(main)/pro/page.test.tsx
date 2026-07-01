import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ProBuyBoxOption } from '@/components/pro/pro-buy-box'
import type { ProOffer } from '@/lib/pro-offer-catalog'

const mocks = vi.hoisted(() => ({
  suspense: { renderChildren: false },
  getProOfferCatalog: vi.fn(async () => ({ offers: [] as ProOffer[] })),
  buildProCheckoutHref: vi.fn(() => '/pro/checkout?product=test'),
}))

vi.mock('react', async (importActual) => {
  const actual = await importActual<typeof import('react')>()
  return {
    ...actual,
    Suspense: ({
      children,
      fallback,
    }: {
      children?: React.ReactNode
      fallback?: React.ReactNode
    }) => <>{mocks.suspense.renderChildren ? children : fallback}</>,
  }
})

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const messages: Record<string, string> = {
      'features.title': 'Pro features',
      'features.subtitle': 'Everything Pro adds to the register.',
      'features.terminal.title': 'Payment terminals',
      'features.terminal.description': 'Take card payments.',
      'features.stockPrice.title': 'Stock and price edits',
      'features.stockPrice.description': 'Edit stock and prices.',
      'features.orders.title': 'Orders',
      'features.orders.description': 'Manage orders.',
      'features.customers.title': 'Customers',
      'features.customers.description': 'Manage customers.',
      'features.reports.title': 'Reports',
      'features.reports.description': 'Run reports.',
      'features.gateways.title': 'Gateways',
      'features.gateways.description': 'Use custom gateways.',
      'buyBox.yearly.title': 'Translated Yearly',
      'buyBox.yearly.subtitle': 'Translated yearly support',
      'buyBox.yearly.badgeLabel': 'Translated Popular',
      'buyBox.yearly.priceSuffix': '/translated-year',
      'buyBox.yearly.ctaNote': 'Translated yearly note.',
      'buyBox.lifetime.title': 'Translated Lifetime',
      'buyBox.lifetime.subtitle': 'Translated lifetime updates',
      'buyBox.lifetime.priceSuffix': ' translated-once',
      'buyBox.lifetime.ctaNote': 'Translated lifetime note.',
      'faq.title': 'Questions',
      'faq.freePlugin.question': 'Do I need the free plugin?',
      'faq.freePlugin.answer': 'Yes.',
      'faq.yearlyVsLifetime.question': 'Yearly or Lifetime?',
      'faq.yearlyVsLifetime.answer': 'Choose either.',
      'faq.upgrade.question': 'Can I upgrade?',
      'faq.upgrade.answer': 'Yes.',
      'faq.siteLimits.question': 'Are there site limits?',
      'faq.siteLimits.answer': 'No per-register fees.',
      'faq.paymentMethods.question': 'Which payments?',
      'faq.paymentMethods.answer': 'Stripe and more.',
    }

    return messages[key] ?? key
  }),
  setRequestLocale: vi.fn(),
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn() })),
}))

vi.mock('@/lib/analytics/config', () => ({
  getAnalyticsConfig: vi.fn(() => ({ enabled: false })),
}))

vi.mock('@/services/core/analytics/posthog-service', () => ({
  resolveProCheckoutVariant: vi.fn(async () => 'control'),
}))

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

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: vi.fn(),
}))

vi.mock('@/lib/pro-offer-catalog', () => ({
  getProOfferCatalog: mocks.getProOfferCatalog,
  buildProOfferSchemaOffers: vi.fn(() => []),
  buildProCheckoutHref: mocks.buildProCheckoutHref,
  getProCheckoutCtaLabel: vi.fn(() => 'Get Started'),
}))

vi.mock('@/components/pro/pro-buy-box', () => ({
  ProBuyBox: ({
    options,
    ctaLabel,
  }: {
    options: ProBuyBoxOption[]
    ctaLabel: string
  }) => (
    <div data-testid="pro-buy-box">
      <span>{ctaLabel}</span>
      {options.map((option) => (
        <div key={option.planId}>
          <span>{option.title}</span>
          <span>{option.subtitle}</span>
          {option.badgeLabel && <span>{option.badgeLabel}</span>}
          <span>{option.priceSuffix}</span>
          <span>{option.ctaNote}</span>
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/ui/section', () => ({
  Section: ({
    children,
    tone = 'default',
    spacing = 'default',
    bare = false,
  }: {
    children: React.ReactNode
    tone?: string
    spacing?: string
    bare?: boolean
  }) => (
    <section data-section-tone={tone} data-section-spacing={spacing}>
      {bare ? children : <div data-container-width="default">{children}</div>}
    </section>
  ),
}))

vi.mock('@/components/ui/section-heading', () => ({
  SectionHeading: ({
    title,
    subtitle,
    as: TitleTag = 'h2',
    size = 'default',
  }: {
    title: React.ReactNode
    subtitle?: React.ReactNode
    as?: 'h1' | 'h2' | 'h3'
    size?: string
  }) => (
    <div data-section-heading-size={size}>
      <TitleTag>{title}</TitleTag>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}))

import ProPage, { BuyBoxSection } from './page'

describe('ProPage', () => {
  beforeEach(() => {
    mocks.suspense.renderChildren = false
    mocks.getProOfferCatalog.mockResolvedValue({ offers: [] })
    mocks.buildProCheckoutHref.mockReturnValue('/pro/checkout?product=test')
  })

  it('renders hero and features statically with only the buy box suspending', async () => {
    render(await ProPage({ params: Promise.resolve({ locale: 'en' }) }))

    const heroHeading = screen.getByRole('heading', {
      level: 1,
      name: 'WooCommerce POS Pro',
    })
    expect(heroHeading.closest('[data-section-heading-size]'))
      .toHaveAttribute('data-section-heading-size', 'hero')

    const sections = [...document.querySelectorAll('[data-section-tone]')]
    expect(
      sections.map((section) => section.getAttribute('data-section-tone'))
    ).toEqual(['default', 'default', 'muted'])
    expect(
      sections.map((section) => section.getAttribute('data-section-spacing'))
    ).toEqual(['hero', 'compact', 'default'])

    // Feature list renders statically (exactly once, next to the buy box).
    expect(screen.getByText('Pro features')).toBeInTheDocument()
    expect(screen.getByText('Payment terminals')).toBeInTheDocument()
    expect(screen.getByText('Stock and price edits')).toBeInTheDocument()

    // The buy box is the only suspended region (Suspense is mocked to
    // render its fallback), so the skeleton stands in for it here.
    expect(screen.getByTestId('pro-buy-box-skeleton')).toBeInTheDocument()

    expect(screen.getByText('Questions')).toBeInTheDocument()
    expect(screen.getByText('Do I need the free plugin?')).toBeInTheDocument()
    expect(screen.getAllByText('Yes.')).toHaveLength(2)
  })

  it('passes translated buy-box option copy to the buy box', async () => {
    mocks.getProOfferCatalog.mockResolvedValue({
      offers: [
        {
          planId: 'yearly',
          handle: 'wcpos-pro-yearly',
          variantId: 'variant_yearly',
          title: 'Pro Yearly',
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
          features: [],
          checkoutPath: '/pro/checkout?product=wcpos-pro-yearly',
        },
        {
          planId: 'lifetime',
          handle: 'wcpos-pro-lifetime',
          variantId: 'variant_lifetime',
          title: 'Pro Lifetime',
          description: 'Lifetime license',
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
          features: [],
          checkoutPath: '/pro/checkout?product=wcpos-pro-lifetime',
        },
      ],
    })

    render(
      await BuyBoxSection({
        experimentVariant: 'control',
        locale: 'en',
      })
    )

    expect(await screen.findByText('Translated Yearly')).toBeInTheDocument()
    expect(screen.getByText('Translated yearly support')).toBeInTheDocument()
    expect(screen.getByText('Translated Popular')).toBeInTheDocument()
    expect(screen.getByText('/translated-year')).toBeInTheDocument()
    expect(screen.getByText('Translated yearly note.')).toBeInTheDocument()
    expect(screen.getByText('Translated Lifetime')).toBeInTheDocument()
    expect(screen.getByText('Translated lifetime updates')).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === ' translated-once')
    ).toBeInTheDocument()
    expect(screen.getByText('Translated lifetime note.')).toBeInTheDocument()
  })
})
