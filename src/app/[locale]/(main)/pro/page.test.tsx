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
  getTranslations: vi.fn(async () => {
    const translate = (key: string) => {
    const messages: Record<string, string> = {
      'metadata.title': 'Translated Pro metadata title',
      'metadata.description': 'Translated Pro metadata description',
      'hero.title': 'Translated WCPOS Pro hero',
      'hero.subtitle': 'Translated Pro hero subtitle',
      'hub.hero.title': 'Compare WooCommerce point of sale systems',
      'schema.name': 'Translated WCPOS Pro schema name',
      'schema.description': 'Translated Pro schema description',
      'features.title': 'Pro features',
      'features.stores.title': 'More registers and stores',
      'features.stores.description': 'Add registers and run several stores.',
      'features.terminal.title': 'Payment terminals',
      'features.terminal.description': 'Take card payments.',
      'features.terminal.link': 'See all terminal extensions',
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
      'faq.expiry.question': 'What happens when it expires?',
      'faq.expiry.answer': 'Nothing switches off.',
      'faq.siteLimits.question': 'Are there site limits?',
      'faq.siteLimits.answer': 'No per-register fees.',
      'faq.paymentMethods.question': 'Which payments?',
      'faq.paymentMethods.answer': 'Stripe and more.',
    }

    return messages[key] ?? key
    }
    return Object.assign(translate, { rich: translate })
  }),
  setRequestLocale: vi.fn(),
}))

// The review quote reads home.trust through the request-scoped hook.
vi.mock('next-intl', async (importActual) => {
  const en = (await import('../../../../../messages/en.json')).default
  return {
    ...(await importActual<typeof import('next-intl')>()),
    useTranslations: (namespace: string) => (key: string) =>
      `${namespace}.${key}`
        .split('.')
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown>)[part],
          en
        ) as string,
  }
})

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
  getProOfferCatalog: vi.fn(async () => ({ offers: [], source: 'fallback' })),
  applyProOfferCatalogCachePolicy: vi.fn(),
  buildProOfferSchemaOffers: vi.fn(() => []),
  buildProCheckoutHref: vi.fn(() => '/pro/checkout?product=test'),
  getProCheckoutCtaLabel: vi.fn((_variant, t) => t('buyBox.cta')),
}))

vi.mock('@/components/ui/section', () => ({
  sectionVariants: () => 'bg-white',
  Section: ({
    children,
    tone = 'default',
    spacing = 'default',
    bare = false,
    className,
  }: {
    children: React.ReactNode
    tone?: string
    spacing?: string
    bare?: boolean
    className?: string
  }) => (
    <section data-section-tone={tone} data-section-spacing={spacing} data-section-class={className}>
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

import ProPage, { generateMetadata } from './page'
import { ProProductJsonLd } from './pro-product-json-ld'

describe('Pro page metadata', () => {
  it('uses localized metadata copy', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(metadata.title).toBe('Translated Pro metadata title')
    expect(metadata.description).toBe('Translated Pro metadata description')
    expect(metadata.alternates?.canonical).toBe('https://wcpos.com/fr/pro')
  })
})

describe('ProPage', () => {
  it('links to the /compare index', async () => {
    render(await ProPage({ params: Promise.resolve({ locale: 'en' }) }))

    expect(
      screen.getByRole('link', { name: 'Compare WooCommerce point of sale systems' })
    ).toHaveAttribute('href', '/compare')
  })

  it('links the terminal feature, and only it, to /extensions', async () => {
    render(await ProPage({ params: Promise.resolve({ locale: 'en' }) }))

    const links = screen.getAllByRole('link', {
      name: 'See all terminal extensions',
    })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/extensions')
    const terminalBlock = screen
      .getByRole('heading', { level: 4, name: 'Payment terminals' })
      .closest('div')
    expect(terminalBlock).toContainElement(links[0])
  })

  it('renders hero and features statically with only the buy box suspending', async () => {
    render(await ProPage({ params: Promise.resolve({ locale: 'en' }) }))

    const heroHeading = screen.getByRole('heading', {
      level: 1,
      name: 'Translated WCPOS Pro hero',
    })
    expect(heroHeading.closest('[data-section-heading-size]'))
      .toHaveAttribute('data-section-heading-size', 'hero')
    expect(screen.getByText('Translated Pro hero subtitle')).toBeInTheDocument()

    // The hero is a plain <section> so it can dissolve into the phone
    // order; the features and the FAQ band are Sections.
    const sections = [...document.querySelectorAll('[data-section-tone]')]
    expect(
      sections.map((section) => section.getAttribute('data-section-tone'))
    ).toEqual(['none', 'muted'])
    const hero = heroHeading.closest('section')
    expect(hero).not.toHaveAttribute('data-section-tone')

    // The jump link (phone only) points at the features.
    expect(
      screen.getByRole('link', { name: 'hero.jumpLink' })
    ).toHaveAttribute('href', '#what-pro-adds')

    // Feature list renders statically (exactly once, next to the buy box).
    expect(screen.getByText('Pro features')).toBeInTheDocument()
    expect(screen.getByText('Payment terminals')).toBeInTheDocument()
    expect(screen.getByText('Stock and price edits')).toBeInTheDocument()
    // The nine features sit in three groups by job: taking payment first,
    // then running the store, then more registers and stores.
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .slice(0, 3)
        .map((heading) => heading.textContent)
    ).toEqual([
      'features.groups.payment.title',
      'features.groups.store.title',
      'features.groups.scale.title',
    ])
    expect(screen.getAllByRole('heading', { level: 4 })[0]).toHaveTextContent(
      'Payment terminals'
    )
    expect(
      screen.getByText('Add registers and run several stores.')
    ).toBeInTheDocument()

    // The buy box is the only suspended region (Suspense is mocked to
    // render its fallback), so the skeleton stands in for it here, in the
    // hero beside the H1 (second on phones).
    expect(screen.getByTestId('pro-buy-box-skeleton')).toBeInTheDocument()
    const buyBoxColumn = screen.getByTestId('pro-buy-box-column')
    expect(buyBoxColumn).toHaveClass('order-2')
    expect(hero).toContainElement(buyBoxColumn)
    expect(buyBoxColumn).toContainElement(
      screen.getByTestId('pro-buy-box-skeleton')
    )
    // The year line explains the price; the free-POS note and the
    // wordpress.org review sit in the hero's left column.
    expect(hero).toContainElement(screen.getByText('yearLine.title'))
    expect(hero).toContainElement(screen.getByText('freePos.title'))
    const review = screen.getByRole('link', { name: 'Ward, wordpress.org review' })
    expect(review).toHaveAttribute(
      'href',
      'https://wordpress.org/support/topic/does-what-it-says-836/'
    )
    expect(hero).toContainElement(review.closest('figure'))
    expect(buyBoxColumn).not.toContainElement(review)

    expect(screen.getByText('Questions')).toBeInTheDocument()
    expect(screen.getByText('Do I need the free plugin?')).toBeInTheDocument()
    expect(screen.getAllByText('Yes.')).toHaveLength(1)
    // Every FAQ answer is a disclosure, closed until the visitor opens it.
    const disclosures = [...document.querySelectorAll('details')]
    expect(disclosures).toHaveLength(5)
    expect(disclosures.some((details) => details.open)).toBe(false)

    // The reassurance a buyer needs at the point of purchase: an expired
    // licence never disables the register.
    expect(
      screen.getByText('What happens when it expires?')
    ).toBeInTheDocument()
    expect(screen.getByText('Nothing switches off.')).toBeInTheDocument()
  })
})

describe('ProProductJsonLd', () => {
  it('uses localized product schema copy', async () => {
    render(await ProProductJsonLd({ locale: 'fr' }))

    const script = document.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const data = JSON.parse(script?.textContent ?? '{}')

    expect(data['@type']).toBe('SoftwareApplication')
    expect(data.name).toBe('Translated WCPOS Pro schema name')
    expect(data.description).toBe('Translated Pro schema description')
    expect(data.url).toBe('https://wcpos.com/fr/pro')
    expect(data.image).toBe('https://wcpos.com/images/wcpos-pro.png')
    expect(Array.isArray(data.offers)).toBe(true)
  })
})
