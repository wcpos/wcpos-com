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
  getHomeYearlyPrice: vi.fn(() => ({ price: '$129', currency: 'USD' })),
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

  it('renders the Free and Pro Yearly plan cards', async () => {
    renderWithIntl(await PricingTeaserSection())

    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pro Yearly' })).toBeInTheDocument()
  })

  it('prices Pro Yearly from the offer catalog and never names Lifetime', async () => {
    const { container } = renderWithIntl(await PricingTeaserSection())

    expect(screen.getByText('$129')).toBeInTheDocument()
    expect(screen.getByText('USD, one payment')).toBeInTheDocument()
    expect(screen.getByText('$0')).toBeInTheDocument()
    expect(container).not.toHaveTextContent(/lifetime/i)
    expect(container).toHaveTextContent('Pro keeps working')
    expect(container).not.toHaveTextContent(/stops working/i)
  })

  it('renders a non-price fallback while pricing loads', () => {
    renderWithIntl(<PricingTeaserSectionFallback />)

    expect(
      screen.getByText(
        'See full pricing for current Pro options. No per-register fees.'
      )
    ).toBeInTheDocument()
    expect(screen.queryByText('$129')).not.toBeInTheDocument()
  })

  it('lists only what tells the plans apart, in the feature labels', () => {
    renderWithIntl(<PricingTeaserSectionFallback />)

    const list = (name: string) =>
      within(screen.getByRole('heading', { name }).parentElement!)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    expect(list('Free')).toEqual([
      'Open and close your register',
      'WooCommerce sync of products, stock and prices',
      'Split payments',
      'Sell when the internet drops',
      'Apply a coupon',
      'Today’s sales on this register',
    ])
    expect(list('Pro Yearly')).toEqual([
      'More registers and stores',
      'Card readers',
      'Order history and refunds',
      'Add and edit customers',
      'Edit stock and prices at the register',
      'Reports for earlier days, every register and every store',
      'Priority support',
    ])
  })

  it('ends each card on an outline CTA: Download Free and See Pro plans', () => {
    renderWithIntl(<PricingTeaserSectionFallback />)

    const download = screen.getByRole('link', { name: 'Download Free' })
    const pro = screen.getByRole('link', { name: 'See Pro plans' })
    expect(download).toHaveAttribute('href', '/downloads')
    expect(pro).toHaveAttribute('href', '/pro')
    for (const cta of [download, pro]) {
      expect(cta).toHaveClass('border-input', 'mt-auto')
    }
  })

  it('marks the featured card by radius and shadow, not a brighter edge', () => {
    renderWithIntl(<PricingTeaserSectionFallback />)

    const card = (name: string) => screen.getByRole('heading', { name }).parentElement!
    expect(card('Pro Yearly')).toHaveClass('border-border', 'rounded-lg', 'shadow-lg')
    expect(card('Free')).toHaveClass('border-border', 'rounded-md')
    expect(card('Pro Yearly').className).not.toMatch(/border-foreground/)
  })

  it('links the comparison line to /compare', () => {
    renderWithIntl(<PricingTeaserSectionFallback />)

    expect(
      screen.getByRole('link', { name: 'See how WCPOS compares' })
    ).toHaveAttribute('href', '/compare')
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

  it('tracks the Pro CTA click', async () => {
    renderWithIntl(await PricingTeaserSection())

    fireEvent.click(screen.getByRole('link', { name: 'See Pro plans' }))

    expect(mockTrackClientEvent).toHaveBeenCalledWith('click_pro_cta', {
      location: 'home_pricing_teaser',
    })
  })
})
