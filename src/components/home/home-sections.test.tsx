import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProblemSection } from './problem-section'
import { BenefitsSection } from './benefits-section'
import { UseCasesSection } from './use-cases-section'
import { FeaturesSection } from './features-section'
import { TrustSection } from './trust-section'
import { CtaSection } from './cta-section'

describe('ProblemSection', () => {
  it('renders the three pain points', () => {
    render(<ProblemSection />)

    expect(screen.getByText('Double Entry')).toBeInTheDocument()
    expect(screen.getByText('Offline Panic')).toBeInTheDocument()
    expect(screen.getByText('Platform Lock-In')).toBeInTheDocument()
  })
})

describe('BenefitsSection', () => {
  it('renders a section heading and all four benefits', () => {
    render(<BenefitsSection />)

    expect(
      screen.getByRole('heading', { name: 'Why stores choose WCPOS' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'One catalog, two channels' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Works offline' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Native apps, real hardware' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'You own everything' })
    ).toBeInTheDocument()
  })
})

describe('UseCasesSection', () => {
  it('renders the three use case cards', () => {
    render(<UseCasesSection />)

    expect(screen.getByText('Retail Store')).toBeInTheDocument()
    expect(screen.getByText('Market Vendor')).toBeInTheDocument()
    expect(screen.getByText('Agency Setup')).toBeInTheDocument()
  })
})

describe('FeaturesSection', () => {
  it('renders all six feature cards', () => {
    render(<FeaturesSection />)

    expect(screen.getByText('Fast product search')).toBeInTheDocument()
    expect(screen.getByText('Smooth checkout flow')).toBeInTheDocument()
    expect(screen.getByText('Customer profiles')).toBeInTheDocument()
    expect(
      screen.getByText('Order history & management')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Edit stock & prices on the fly')
    ).toBeInTheDocument()
    expect(screen.getByText('End-of-day reports')).toBeInTheDocument()
  })

  it('marks Pro features with a badge', () => {
    render(<FeaturesSection />)

    expect(screen.getAllByText('Pro')).toHaveLength(5)
  })
})

describe('TrustSection', () => {
  it('renders the stats', () => {
    render(<TrustSection />)

    expect(screen.getByText('5,000+')).toBeInTheDocument()
    expect(screen.getByText('Active Installations')).toBeInTheDocument()
    expect(screen.getByText('Languages Supported')).toBeInTheDocument()
  })

  it('links the open source stat to GitHub', () => {
    render(<TrustSection />)

    expect(screen.getByRole('link', { name: /GPL Licensed/ })).toHaveAttribute(
      'href',
      'https://github.com/wcpos'
    )
  })
})

describe('CtaSection', () => {
  it('renders the final CTA links', () => {
    render(<CtaSection />)

    expect(screen.getByRole('link', { name: 'Try Live Demo' })).toHaveAttribute(
      'href',
      'https://demo.wcpos.com/pos'
    )
    expect(
      screen.getByRole('link', { name: 'Download Free' })
    ).toHaveAttribute('href', 'https://wordpress.org/plugins/woocommerce-pos/')
  })
})
