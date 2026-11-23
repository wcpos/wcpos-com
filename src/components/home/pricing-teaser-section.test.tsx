import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import messages from '../../../messages/en.json'
import de from '../../../messages/de.json'
import es from '../../../messages/es.json'
import fr from '../../../messages/fr.json'
import it_ from '../../../messages/it.json'
import ja from '../../../messages/ja.json'
import ko from '../../../messages/ko.json'
import nl from '../../../messages/nl.json'
import pt from '../../../messages/pt.json'
import zh from '../../../messages/zh.json'

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: vi.fn(),
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

vi.mock('next-intl/server', () => ({
  getLocale: vi.fn(async () => 'en'),
}))

// Mock i18n navigation Link as a simple anchor
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

import { trackClientEvent } from '@/lib/analytics/client-events'
import {
  PricingTeaserSection,
  PricingTeaserSectionFallback,
} from './pricing-teaser-section'

vi.mock('@/lib/pro-offer-catalog', () => ({
  getProOfferCatalog: vi.fn(async () => ({
    offers: [
      { planId: 'yearly', price: { compact: '$129' } },
      { planId: 'lifetime', price: { compact: '$399' } },
    ],
    source: 'medusa',
  })),
  applyProOfferCatalogCachePolicy: vi.fn(),
  formatHomeProPriceSummary: vi.fn(() => '$129/year or $399 lifetime. No per-register fees.'),
}))

const mockTrackClientEvent = vi.mocked(trackClientEvent)

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('PricingTeaserSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Free and Pro columns', async () => {
    renderWithIntl(await PricingTeaserSection())

    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument()
  })

  it('shows pricing from the Pro offer catalog', async () => {
    renderWithIntl(await PricingTeaserSection())

    expect(
      screen.getByText('$129/year or $399 lifetime. No per-register fees.')
    ).toBeInTheDocument()
  })

  it('renders a non-price fallback while pricing loads', () => {
    renderWithIntl(<PricingTeaserSectionFallback />)

    expect(
      screen.getByText(
        'See full pricing for current Pro options. No per-register fees.'
      )
    ).toBeInTheDocument()
  })

  it('lists the free register, split payment and report features in the fallback', () => {
    renderWithIntl(<PricingTeaserSectionFallback />)

    expect(screen.getByText('Open & close the register')).toBeInTheDocument()
    expect(screen.getByText('Split payments')).toBeInTheDocument()
    expect(screen.getByText("Today's sales report")).toBeInTheDocument()
    expect(screen.queryByText('End-of-day reports')).not.toBeInTheDocument()
  })

  it('links the CTA to the Pro page', async () => {
    renderWithIntl(await PricingTeaserSection())

    const cta = screen.getByRole('link', {
      name: 'See Full Pricing & Features',
    })
    expect(cta).toHaveAttribute('href', '/pro')
  })

  it('links the comparison line to /compare under the Pro CTA', () => {
    renderWithIntl(<PricingTeaserSectionFallback />)

    expect(
      screen.getByRole('link', { name: 'See how WCPOS compares' })
    ).toHaveAttribute('href', '/compare')
    expect(
      screen.getByRole('link', { name: 'See Full Pricing & Features' })
    ).toHaveAttribute('href', '/pro')
  })

  it('links Square and FooSales in the comparison line to their pages', () => {
    renderWithIntl(<PricingTeaserSectionFallback />)

    expect(screen.getByRole('link', { name: 'Square' })).toHaveAttribute(
      'href',
      '/compare/square'
    )
    expect(screen.getByRole('link', { name: 'FooSales' })).toHaveAttribute(
      'href',
      '/compare/foosales'
    )
  })

  it.each(
    Object.entries({ en: messages, de, es, fr, it: it_, ja, ko, nl, pt, zh })
  )('%s compareLine tags Square, FooSales and one link', (_, locale) => {
    const line = locale.home.pricing.compareLine
    expect(line).toContain('<square>Square</square>')
    expect(line).toContain('<foosales>FooSales</foosales>')
    expect(line.match(/<link>[^<]+<\/link>/g)).toHaveLength(1)
  })

  it('tracks the CTA click', async () => {
    renderWithIntl(await PricingTeaserSection())

    fireEvent.click(
      screen.getByRole('link', { name: 'See Full Pricing & Features' })
    )

    expect(mockTrackClientEvent).toHaveBeenCalledWith('click_pro_cta', {
      location: 'home_pricing_teaser',
    })
  })

  it('lists key Free and Pro features', async () => {
    renderWithIntl(await PricingTeaserSection())

    expect(screen.getByText('Offline mode')).toBeInTheDocument()
    expect(screen.getByText('Unlimited products')).toBeInTheDocument()
    expect(
      screen.getByText('Connected card readers')
    ).toBeInTheDocument()
    expect(screen.getByText('Reports across days, registers & stores')).toBeInTheDocument()
  })

  it('says Free checkout takes cash or card on your own terminal', async () => {
    renderWithIntl(await PricingTeaserSection())

    const freeColumn = screen.getByRole('heading', { name: 'Free' }).parentElement!
    const freeList = within(freeColumn).getByRole('list')
    expect(
      within(freeList).getByText('Cash or card on your own terminal')
    ).toBeInTheDocument()
    expect(within(freeList).queryByText('Basic checkout')).not.toBeInTheDocument()
  })

  it('lists the receipt template editor instead of multi-currency in Free', async () => {
    renderWithIntl(await PricingTeaserSection())

    const freeColumn = screen.getByRole('heading', { name: 'Free' }).parentElement!
    const freeList = within(freeColumn).getByRole('list')
    expect(
      within(freeList).getByText('Receipt template editor & gallery')
    ).toBeInTheDocument()
    expect(within(freeList).queryByText('Multi-currency')).not.toBeInTheDocument()
  })

  it('lists refunds, coupons and the customer-facing display in Pro', async () => {
    renderWithIntl(await PricingTeaserSection())

    const proColumn = screen.getByRole('heading', { name: 'Pro' }).parentElement!
    const proList = within(proColumn).getByRole('list')
    expect(within(proList).getByText('Refunds, full or partial')).toBeInTheDocument()
    expect(within(proList).getByText('Coupon management')).toBeInTheDocument()
    expect(within(proList).getByText('Customer-facing display')).toBeInTheDocument()
  })

  it('leads the Pro list with more registers and multiple stores', async () => {
    renderWithIntl(await PricingTeaserSection())

    const proColumn = screen.getByRole('heading', { name: 'Pro' }).parentElement!
    const proItems = within(proColumn).getAllByRole('listitem')
    expect(proItems[0]).toHaveTextContent('More registers & multiple stores')
  })
})
