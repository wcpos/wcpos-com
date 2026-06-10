import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroSection } from './hero-section'

describe('HeroSection', () => {
  it('renders the main heading', () => {
    render(<HeroSection />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Your WooCommerce products, ready to sell in-store',
      })
    ).toBeInTheDocument()
  })

  it('links the demo CTA to the live demo', () => {
    render(<HeroSection />)

    const demoLink = screen.getByRole('link', { name: 'Try Live Demo' })
    expect(demoLink).toHaveAttribute('href', 'https://demo.wcpos.com/pos')
  })

  it('links the download CTA to the WordPress plugin', () => {
    render(<HeroSection />)

    const downloadLink = screen.getByRole('link', { name: 'Download Free' })
    expect(downloadLink).toHaveAttribute(
      'href',
      'https://wordpress.org/plugins/woocommerce-pos/'
    )
  })

  it('shows the trust badges', () => {
    render(<HeroSection />)

    expect(screen.getByText('6,000+ Active Stores')).toBeInTheDocument()
    expect(screen.getByText('Free & Open Source')).toBeInTheDocument()
    expect(screen.getByText('13 Years Active')).toBeInTheDocument()
  })
})
