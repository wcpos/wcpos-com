import { describe, expect, it, vi } from 'vitest'
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import messages from '../../../messages/en.json'

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
    source: 'medusa',
  })),
  applyProOfferCatalogCachePolicy: vi.fn(),
  formatFounderProPriceSummary: vi.fn(() => '$129/yr or $399 once'),
}))
import { StoryTimeline } from './story-timeline'
import { ValuesSection } from './values-section'
import { AboutCta } from './about-cta'

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('AboutHero', () => {
  it('renders the page heading', () => {
    renderWithIntl(<AboutHero />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'An independent point of sale for WooCommerce',
      })
    ).toBeInTheDocument()
  })

  it('uses the canonical dark hero section seam', () => {
    renderWithIntl(<AboutHero />)

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
    renderWithIntl(await FounderLetter())
    expect(
      screen.getByText(/Hi — I'm Paul\. I built WCPOS\./)
    ).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      '/paul-urban-locavore.jpg'
    )
  })

  it('states the Pro pricing', async () => {
    renderWithIntl(await FounderLetter())
    expect(screen.getByText(/\$129\/yr or \$399 once/)).toBeInTheDocument()
  })

  it('renders a non-price fallback while pricing loads', () => {
    renderWithIntl(<FounderLetterFallback />)
    expect(screen.getByText(/available from the Pro page/)).toBeInTheDocument()
  })

  it('uses the canonical muted section seam around the editorial letter', () => {
    renderWithIntl(<FounderLetterFallback />)

    const section = screen
      .getByText(/Hi — I'm Paul\. I built WCPOS\./)
      .closest('[data-section-tone]')

    expect(section).toHaveAttribute('data-section-tone', 'muted')
    expect(section).toHaveAttribute('data-section-spacing', 'default')
  })
})

describe('StoryTimeline', () => {
  it('lists the WordPress.org release milestone', () => {
    renderWithIntl(<StoryTimeline />)
    expect(screen.getByText('May 11, 2014')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Released on WordPress.org' })
    ).toBeInTheDocument()
  })

  it('lists the rewrite and mobile milestones with their verified dates', () => {
    renderWithIntl(<StoryTimeline />)
    // v1.0.0 shipped 2023-05-03 UTC — 4 May 2023 in Perth (github.com/wcpos/woocommerce-pos 1.0.0)
    expect(screen.getByText('May 4, 2023')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Rewritten in React Native' })
    ).toBeInTheDocument()
    // iOS TestFlight + Android Play beta shipped with v1.8.0 on 2025-12-18
    expect(screen.getByText('December 2025')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Native mobile apps' })
    ).toBeInTheDocument()
  })

  it('mentions the original Backbone.js and IndexedDB stack', () => {
    renderWithIntl(<StoryTimeline />)
    expect(screen.getByText(/Backbone\.js and an in-browser IndexedDB/)).toBeInTheDocument()
  })

  it('uses the canonical default section seam for the story band', () => {
    renderWithIntl(<StoryTimeline />)

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
    renderWithIntl(<ValuesSection />)
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
    renderWithIntl(<ValuesSection />)

    const section = screen
      .getByRole('heading', { name: 'What it stands for' })
      .closest('[data-section-tone]')

    expect(section).toHaveAttribute('data-section-tone', 'muted')
    expect(section).toHaveAttribute('data-section-spacing', 'default')
  })
})

describe('AboutCta', () => {
  it('links the demo, download, and Pro CTAs', () => {
    renderWithIntl(<AboutCta />)
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
    renderWithIntl(<AboutCta />)

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
    ).toHaveAttribute('data-button-variant', 'brand-on-dark')
    expect(
      screen.getByRole('link', { name: 'Download Free' }).parentElement
    ).toHaveAttribute('data-button-variant', 'inverse')
    expect(screen.getByRole('link', { name: 'See Pro' }).parentElement)
      .toHaveAttribute('data-button-variant', 'brand-outline')
  })
})
