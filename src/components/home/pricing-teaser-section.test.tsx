import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: vi.fn(),
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

const mockTrackClientEvent = vi.mocked(trackClientEvent)

describe('PricingTeaserSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Free and Pro columns', () => {
    render(<PricingTeaserSection />)

    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument()
  })

  it('shows pricing that matches the Pro page', () => {
    render(<PricingTeaserSection />)

    expect(
      screen.getByText('$129/year or $249 lifetime. No per-register fees.')
    ).toBeInTheDocument()
  })

  it('links the CTA to the Pro page', () => {
    render(<PricingTeaserSection />)

    const cta = screen.getByRole('link', {
      name: 'See Full Pricing & Features',
    })
    expect(cta).toHaveAttribute('href', '/pro')
  })

  it('tracks the CTA click', () => {
    render(<PricingTeaserSection />)

    fireEvent.click(
      screen.getByRole('link', { name: 'See Full Pricing & Features' })
    )

    expect(mockTrackClientEvent).toHaveBeenCalledWith('click_pro_cta', {
      location: 'home_pricing_teaser',
    })
  })

  it('lists key Free and Pro features', () => {
    render(<PricingTeaserSection />)

    expect(screen.getByText('Offline mode')).toBeInTheDocument()
    expect(screen.getByText('Unlimited products')).toBeInTheDocument()
    expect(
      screen.getByText('Payment terminal integration')
    ).toBeInTheDocument()
    expect(screen.getByText('End-of-day reports')).toBeInTheDocument()
  })
})
