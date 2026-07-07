import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import messages from '../../../messages/en.json'

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: vi.fn(),
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
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
  PRO_TEASER_FEATURES: [
    'Payment terminal integration',
    'Stock & price editing in POS',
    'Order history & management',
    'Customer management',
    'End-of-day reports',
    'Custom payment gateways',
    'Priority support',
  ],
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

  it('links the CTA to the Pro page', async () => {
    renderWithIntl(await PricingTeaserSection())

    const cta = screen.getByRole('link', {
      name: 'See Full Pricing & Features',
    })
    expect(cta).toHaveAttribute('href', '/pro')
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
      screen.getByText('Payment terminal integration')
    ).toBeInTheDocument()
    expect(screen.getByText('End-of-day reports')).toBeInTheDocument()
  })
})
