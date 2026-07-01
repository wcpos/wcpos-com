import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react', async (importActual) => {
  const actual = await importActual<typeof import('react')>()
  return {
    ...actual,
    Suspense: ({
      fallback,
    }: {
      children?: React.ReactNode
      fallback?: React.ReactNode
    }) => <>{fallback}</>,
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
      'buyBox.cta': 'Get Started',
      'buyBox.ctaValueCopy': 'Get Instant Access',
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
  getProOfferCatalog: vi.fn(async () => ({ offers: [] })),
  buildProOfferSchemaOffers: vi.fn(() => []),
  buildProCheckoutHref: vi.fn(() => '/pro/checkout?product=test'),
  getProCheckoutCtaLabel: vi.fn((_variant, t) => t('buyBox.cta')),
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

import ProPage from './page'

describe('ProPage', () => {
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
})
