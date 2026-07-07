import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import messages from '../../../messages/en.json'

// Mock i18n navigation Link as a simple anchor (TrustSection links to /about-us)
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
    ...props
  }: {
    children: React.ReactNode
    tone?: string
    spacing?: string
    bare?: boolean
  } & React.HTMLAttributes<HTMLElement>) => (
    <section
      {...props}
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

import { ProblemSection } from './problem-section'
import { BenefitsSection } from './benefits-section'
import { UseCasesSection } from './use-cases-section'
import { FeaturesSection } from './features-section'
import { TrustSection } from './trust-section'
import { CtaSection } from './cta-section'

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('ProblemSection', () => {
  it('renders the three pain points', () => {
    renderWithIntl(<ProblemSection />)

    expect(screen.getByText('Double Entry')).toBeInTheDocument()
    expect(screen.getByText('Offline Panic')).toBeInTheDocument()
    expect(screen.getByText('Platform Lock-In')).toBeInTheDocument()
  })
})

describe('BenefitsSection', () => {
  it('renders a section heading and all four benefits', () => {
    renderWithIntl(<BenefitsSection />)

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

  it('uses the canonical section seam for its heading and alternating bands', () => {
    renderWithIntl(<BenefitsSection />)

    const heading = screen.getByRole('heading', {
      name: 'Why stores choose WCPOS',
    })
    expect(heading.closest('[data-section-tone]')).toHaveAttribute(
      'data-section-tone',
      'muted'
    )

    const sections = document.querySelectorAll('[data-section-tone]')
    expect(
      [...sections].map((section) =>
        section.getAttribute('data-section-tone')
      )
    ).toEqual(['muted', 'muted', 'default', 'muted', 'default'])
  })

  it('keeps all benefits inside the labelled benefits region', () => {
    renderWithIntl(<BenefitsSection />)

    const region = screen.getByRole('region', {
      name: 'Why stores choose WCPOS',
    })

    expect(
      within(region).getByRole('heading', {
        name: 'Why stores choose WCPOS',
      })
    ).toBeInTheDocument()
    expect(
      within(region).getByRole('heading', {
        name: 'One catalog, two channels',
      })
    ).toBeInTheDocument()
    expect(
      within(region).getByRole('heading', { name: 'Works offline' })
    ).toBeInTheDocument()
    expect(
      within(region).getByRole('heading', {
        name: 'Native apps, real hardware',
      })
    ).toBeInTheDocument()
    expect(
      within(region).getByRole('heading', { name: 'You own everything' })
    ).toBeInTheDocument()
  })
})

describe('UseCasesSection', () => {
  it('renders the three testimonial cards with sourced attributions', () => {
    renderWithIntl(<UseCasesSection />)

    expect(screen.getByText('Retail Store')).toBeInTheDocument()
    expect(screen.getByText('Market Vendor')).toBeInTheDocument()
    expect(screen.getByText('Desktop & Offline')).toBeInTheDocument()

    // Every quote must link to its wordpress.org source review.
    const sources = screen.getAllByRole('link', {
      name: /wordpress\.org review/,
    })
    expect(sources).toHaveLength(3)
    for (const link of sources) {
      expect(link).toHaveAttribute(
        'href',
        expect.stringContaining('https://wordpress.org/support/topic/')
      )
    }
  })
})

describe('FeaturesSection', () => {
  it('renders all six feature cards', () => {
    renderWithIntl(<FeaturesSection />)

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
    renderWithIntl(<FeaturesSection />)

    expect(screen.getAllByText('Pro')).toHaveLength(5)
  })
})

describe('TrustSection', () => {
  it('renders the stats', () => {
    renderWithIntl(<TrustSection />)

    expect(screen.getByText('5,000+')).toBeInTheDocument()
    expect(screen.getByText('Active Installations')).toBeInTheDocument()
    expect(screen.getByText('Languages Supported')).toBeInTheDocument()
  })

  it('links the open source stat to GitHub', () => {
    renderWithIntl(<TrustSection />)

    expect(screen.getByRole('link', { name: /GPL Licensed/ })).toHaveAttribute(
      'href',
      'https://github.com/wcpos'
    )
  })
})

describe('CtaSection', () => {
  it('renders the final CTA links', () => {
    renderWithIntl(<CtaSection />)

    expect(screen.getByRole('link', { name: 'Try Live Demo' })).toHaveAttribute(
      'href',
      'https://demo.wcpos.com/pos'
    )
    expect(
      screen.getByRole('link', { name: 'Download Free' })
    ).toHaveAttribute('href', '/downloads')
  })

  it('renders translated CTA copy from messages', () => {
    render(
      <NextIntlClientProvider
        locale="en"
        messages={{
          home: {
            cta: {
              title: 'Translated CTA title',
              subtitle: 'Translated CTA subtitle',
              liveDemo: 'Translated live demo',
              download: 'Translated download',
            },
          },
        }}
      >
        <CtaSection />
      </NextIntlClientProvider>
    )

    expect(
      screen.getByRole('heading', { name: 'Translated CTA title' })
    ).toBeInTheDocument()
    expect(screen.getByText('Translated CTA subtitle')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Translated live demo' })
    ).toHaveAttribute('href', 'https://demo.wcpos.com/pos')
    expect(
      screen.getByRole('link', { name: 'Translated download' })
    ).toHaveAttribute('href', '/downloads')
  })
})
