import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import messages from '../../../messages/en.json'

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

import { UseCasesSection } from './use-cases-section'
import { FeaturesSection } from './features-section'
import { CtaSection } from './cta-section'

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('UseCasesSection', () => {
  it('renders the three testimonial cards with sourced attributions', () => {
    renderWithIntl(<UseCasesSection />)

    expect(screen.getByText('Retail store')).toBeInTheDocument()
    expect(screen.getByText('Market vendor')).toBeInTheDocument()
    expect(screen.getByText('Desktop & offline')).toBeInTheDocument()

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

  it('titles the review cards as store owners’ reviews', () => {
    renderWithIntl(<UseCasesSection />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'What store owners say' })
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Works for stores of all kinds')
    ).not.toBeInTheDocument()
  })

  it('renders translated use-case copy from messages', () => {
    render(
      <NextIntlClientProvider
        locale="en"
        messages={{
          home: {
            useCases: {
              title: 'Translated use cases title',
              reviewSuffix: 'translated review suffix',
              stats: {
                installs: '<b>{count}</b> translated installs',
                since: 'translated since <b>{year}</b>',
                license: '<b>GPL</b> translated license',
                languages: '<b>{count}</b> translated languages',
              },
              cards: {
                retail: {
                  type: 'Translated retail type',
                  quote: 'Translated retail quote',
                  attribution: 'Translated retail attribution',
                },
                market: {
                  type: 'Translated market type',
                  quote: 'Translated market quote',
                  attribution: 'Translated market attribution',
                  note: 'Translated market note',
                },
                desktop: {
                  type: 'Translated desktop type',
                  quote: 'Translated desktop quote',
                  attribution: 'Translated desktop attribution',
                },
              },
            },
          },
        }}
      >
        <UseCasesSection />
      </NextIntlClientProvider>
    )

    expect(
      screen.getByRole('heading', { name: 'Translated use cases title' })
    ).toBeInTheDocument()
    expect(screen.getByText('Translated retail type')).toBeInTheDocument()
    expect(screen.getByText(/Translated market quote/)).toBeInTheDocument()
    expect(screen.getByText(/Translated market note/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'Translated desktop attribution, translated review suffix',
      })
    ).toHaveAttribute(
      'href',
      'https://wordpress.org/support/topic/great-pos-for-your-woocommerce-store/'
    )
  })

  it('states the trust facts under the heading, formatted for the locale', () => {
    const { unmount } = renderWithIntl(<UseCasesSection />)

    const stats = screen.getByText(/active installations/).closest('p')!
    expect(stats).toHaveTextContent('5,000+ active installations')
    expect(stats).toHaveTextContent('In development since 2014')
    expect(stats).toHaveTextContent('38 languages supported')
    expect(within(stats).getByRole('link', { name: /GPL licensed, on GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/wcpos'
    )
    unmount()

    render(
      <NextIntlClientProvider locale="de" messages={messages}>
        <UseCasesSection />
      </NextIntlClientProvider>
    )
    expect(screen.getByText('5.000+')).toBeInTheDocument()
  })

  it('leads each review with the brand icon tile, not a tinted band', () => {
    const { container } = renderWithIntl(<UseCasesSection />)

    const tiles = container.querySelectorAll('li h3 > span[aria-hidden="true"]')
    expect(tiles).toHaveLength(3)
    for (const tile of tiles) {
      expect(tile).toHaveClass('h-12', 'w-12', 'bg-wcpos-red/10')
    }
    expect(container.querySelector('[class*="bg-rose-50"]')).toBeNull()
  })
})

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

describe('FeaturesSection', () => {
  const rowTitles = [
    'Fast product search',
    'Split payments',
    'Sell when the internet drops',
    'Open and close your register',
    'Apply a coupon',
    'Today’s sales on this register',
    'Card readers',
    'Create and edit coupons',
    'Reports for earlier days, every register and every store',
    'Add and edit customers',
    'Order history and refunds',
    'Edit stock and prices at the register',
    'More registers and stores',
    'A second screen for your customer',
  ]

  it('renders the fourteen rows in order', () => {
    renderWithIntl(<FeaturesSection />)

    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings.map((h) => h.textContent?.replace(/\s*Pro$/, ''))).toEqual(rowTitles)
  })

  it('badges only the Pro rows', () => {
    renderWithIntl(<FeaturesSection />)

    expect(screen.getAllByText('Pro')).toHaveLength(8)
    for (const free of rowTitles.slice(0, 6)) {
      const row = screen
        .getByRole('heading', { name: new RegExp(`^${escapeRegExp(free)}`) })
        .closest('li')!
      expect(within(row).queryByText('Pro')).not.toBeInTheDocument()
    }
  })

  it('shares the 2.0 labels and lines with the strip', () => {
    renderWithIntl(<FeaturesSection />)

    const { free2 } = messages.home.story
    for (const id of ['offline', 'register'] as const) {
      const row = screen.getByRole('heading', { name: free2[id].title }).closest('li')!
      expect(row).toHaveTextContent(free2[id].line)
    }
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
    expect(
      screen.getByRole('link', { name: 'Compare WooCommerce point of sale systems' })
    ).toHaveAttribute('href', '/compare')
  })

  it('drops the /compare link when showCompareLink is false', () => {
    const { container } = renderWithIntl(<CtaSection showCompareLink={false} />)

    expect(container.querySelector('a[href="https://demo.wcpos.com/pos"]')).not.toBeNull()
    expect(container.querySelector('a[href="/downloads"]')).not.toBeNull()
    expect(container.querySelector('a[href="/compare"]')).toBeNull()
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
