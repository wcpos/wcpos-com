import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

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
import { PricingTeaserSection } from './pricing-teaser-section'

vi.mock('@/lib/pro-offer-catalog', () => ({
  getProOfferCatalog: vi.fn(async () => ({
    offers: [
      { planId: 'yearly', price: { compact: '$129' } },
      { planId: 'lifetime', price: { compact: '$399' } },
    ],
  })),
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

describe('PricingTeaserSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Free and Pro columns', async () => {
    render(await PricingTeaserSection())

    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument()
  })

  it('shows pricing from the Pro offer catalog', async () => {
    render(await PricingTeaserSection())

    expect(
      screen.getByText('$129/year or $399 lifetime. No per-register fees.')
    ).toBeInTheDocument()
  })

  it('links the CTA to the Pro page', async () => {
    render(await PricingTeaserSection())

    const cta = screen.getByRole('link', {
      name: 'See Full Pricing & Features',
    })
    expect(cta).toHaveAttribute('href', '/pro')
  })

  it('tracks the CTA click', async () => {
    render(await PricingTeaserSection())

    fireEvent.click(
      screen.getByRole('link', { name: 'See Full Pricing & Features' })
    )

    expect(mockTrackClientEvent).toHaveBeenCalledWith('click_pro_cta', {
      location: 'home_pricing_teaser',
    })
  })

  it('lists key Free and Pro features', async () => {
    render(await PricingTeaserSection())

    expect(screen.getByText('Offline mode')).toBeInTheDocument()
    expect(screen.getByText('Unlimited products')).toBeInTheDocument()
    expect(
      screen.getByText('Payment terminal integration')
    ).toBeInTheDocument()
    expect(screen.getByText('End-of-day reports')).toBeInTheDocument()
  })
})
