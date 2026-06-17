import { describe, expect, it, vi } from 'vitest'
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import { render, screen } from '@testing-library/react'

// Mock i18n navigation Link as a simple anchor (the about CTA only uses it for
// an internal href), keeping these as pure render tests.
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

import { AboutHero } from './about-hero'
import { FounderLetter, FounderLetterFallback } from './founder-letter'

vi.mock('@/lib/pro-offer-catalog', () => ({
  getProOfferCatalog: vi.fn(async () => ({
    offers: [
      { planId: 'yearly', price: { compact: '$129' } },
      { planId: 'lifetime', price: { compact: '$399' } },
    ],
  })),
  formatFounderProPriceSummary: vi.fn(() => '$129/yr or $399 once'),
}))
import { StoryTimeline } from './story-timeline'
import { ValuesSection } from './values-section'
import { AboutCta } from './about-cta'

describe('AboutHero', () => {
  it('renders the page heading', () => {
    render(<AboutHero />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'An independent point of sale for WooCommerce',
      })
    ).toBeInTheDocument()
  })
})

describe('FounderLetter', () => {
  it('introduces Paul and shows the shop photo', async () => {
    render(await FounderLetter())
    expect(
      screen.getByText(/Hi — I'm Paul\. I built WooCommerce POS\./)
    ).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      '/paul-urban-locavore.jpg'
    )
  })

  it('states the Pro pricing', async () => {
    render(await FounderLetter())
    expect(screen.getByText(/\$129\/yr or \$399 once/)).toBeInTheDocument()
  })

  it('renders a non-price fallback while pricing loads', () => {
    render(<FounderLetterFallback />)
    expect(screen.getByText(/available from the Pro page/)).toBeInTheDocument()
  })
})

describe('StoryTimeline', () => {
  it('lists the WordPress.org release milestone', () => {
    render(<StoryTimeline />)
    expect(screen.getByText('11 May 2014')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Released on WordPress.org' })
    ).toBeInTheDocument()
  })
})

describe('ValuesSection', () => {
  it('renders the four principles', () => {
    render(<ValuesSection />)
    for (const title of [
      'Independent',
      'Funded by Pro',
      'Open & GPL',
      'A fair licence',
    ]) {
      expect(
        screen.getByRole('heading', { name: title })
      ).toBeInTheDocument()
    }
  })
})

describe('AboutCta', () => {
  it('links the demo, download, and Pro CTAs', () => {
    render(<AboutCta />)
    expect(
      screen.getByRole('link', { name: 'Try Live Demo' })
    ).toHaveAttribute('href', 'https://demo.wcpos.com/pos')
    expect(
      screen.getByRole('link', { name: 'Download Free' })
    ).toHaveAttribute('href', 'https://wordpress.org/plugins/woocommerce-pos/')
    expect(screen.getByRole('link', { name: 'See Pro' })).toHaveAttribute(
      'href',
      '/pro'
    )
  })
})
