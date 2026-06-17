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
    <section
      data-section-tone={tone}
      data-section-spacing={spacing}
      data-section-bare={String(bare)}
    >
      {bare ? children : <div data-container-width="default">{children}</div>}
    </section>
  ),
  Container: ({
    children,
    width = 'default',
  }: {
    children: React.ReactNode
    width?: string
  }) => <div data-container-width={width}>{children}</div>,
}))

vi.mock('@/components/ui/section-heading', () => ({
  SectionHeading: ({
    eyebrow,
    title,
    subtitle,
    as: TitleTag = 'h2',
    tone = 'default',
    size = 'default',
  }: {
    eyebrow?: React.ReactNode
    title: React.ReactNode
    subtitle?: React.ReactNode
    as?: 'h1' | 'h2' | 'h3'
    tone?: string
    size?: string
  }) => (
    <div data-section-heading-tone={tone} data-section-heading-size={size}>
      {eyebrow && <p>{eyebrow}</p>}
      <TitleTag>{title}</TitleTag>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant = 'default',
    size = 'default',
  }: {
    children: React.ReactNode
    variant?: string
    size?: string
    asChild?: boolean
  }) => (
    <span data-button-variant={variant} data-button-size={size}>
      {children}
    </span>
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

  it('uses the canonical dark hero section seam', () => {
    render(<AboutHero />)

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'An independent point of sale for WooCommerce',
    })
    const section = heading.closest('[data-section-tone]')

    expect(section).toHaveAttribute('data-section-tone', 'dark')
    expect(section).toHaveAttribute('data-section-spacing', 'hero')
    expect(section).toHaveAttribute('data-section-bare', 'true')
    expect(heading.closest('[data-section-heading-tone]')).toHaveAttribute(
      'data-section-heading-tone',
      'inverse'
    )
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

  it('uses the canonical muted section seam around the editorial letter', () => {
    render(<FounderLetterFallback />)

    const section = screen
      .getByText(/Hi — I'm Paul\. I built WooCommerce POS\./)
      .closest('[data-section-tone]')

    expect(section).toHaveAttribute('data-section-tone', 'muted')
    expect(section).toHaveAttribute('data-section-spacing', 'default')
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

  it('uses the canonical default section seam for the story band', () => {
    render(<StoryTimeline />)

    const section = screen
      .getByRole('heading', { name: "How it started, and why it's still here" })
      .closest('[data-section-tone]')

    expect(section).toHaveAttribute('data-section-tone', 'default')
    expect(section).toHaveAttribute('data-section-spacing', 'default')
    expect(section).toHaveAttribute('data-section-bare', 'true')
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

  it('uses the canonical muted section seam for the values band', () => {
    render(<ValuesSection />)

    const section = screen
      .getByRole('heading', { name: 'What it stands for' })
      .closest('[data-section-tone]')

    expect(section).toHaveAttribute('data-section-tone', 'muted')
    expect(section).toHaveAttribute('data-section-spacing', 'default')
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

  it('uses the canonical dark section and shared button seam', () => {
    render(<AboutCta />)

    const heading = screen.getByRole('heading', {
      name: 'Built by a shopkeeper. Funded by shopkeepers.',
    })
    const section = heading.closest('[data-section-tone]')

    expect(section).toHaveAttribute('data-section-tone', 'dark')
    expect(section).toHaveAttribute('data-section-spacing', 'default')
    expect(heading.closest('[data-section-heading-tone]')).toHaveAttribute(
      'data-section-heading-tone',
      'inverse'
    )
    expect(
      screen.getByRole('link', { name: 'Try Live Demo' }).parentElement
    ).toHaveAttribute('data-button-variant', 'brand')
    expect(
      screen.getByRole('link', { name: 'Download Free' }).parentElement
    ).toHaveAttribute('data-button-variant', 'inverse')
    expect(screen.getByRole('link', { name: 'See Pro' }).parentElement)
      .toHaveAttribute('data-button-variant', 'brand-outline')
  })
})
