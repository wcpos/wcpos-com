import { describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import NotFoundPage from './not-found'

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

// The shell is covered by its own tests; here it only has to wrap the body.
vi.mock('@/components/main/site-header', () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}))
vi.mock('@/components/main/site-footer', () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}))

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}))

const messages: Record<string, string> = {
  'errors.notFoundTitle': 'Page not found',
  'errors.notFoundDescription':
    'There is no page at this address. It may have moved, or the link may be wrong.',
  'errors.notFoundAskedFor': 'You asked for',
  'errors.notFoundDownloadsLine':
    'The free plugin and the apps for Mac, Windows and Linux. iOS and Android are in beta.',
  'errors.notFoundProLine': 'Connect payment terminals and add more registers and stores.',
  'errors.notFoundDocsLine': 'How to install, set up and sell with WCPOS.',
  'errors.notFoundSupportLine':
    'Ask a question and get an answer from the docs, or ask on Discord.',
  'errors.goHome': 'Go to homepage',
  'header.documentation': 'Documentation',
  'header.support': 'Support',
  'header.downloads': 'Downloads',
  'metadata.siteTitle': 'WCPOS - Point of Sale for WooCommerce',
  'metadata.siteDescription':
    'Point of Sale for WooCommerce. Fast, reliable POS system for your WooCommerce store.',
}

vi.mock('next-intl', () => ({
  hasLocale: (locales: readonly string[], locale: string) => locales.includes(locale),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useTranslations: (namespace: string) => (key: string) =>
    messages[`${namespace}.${key}`] ?? key,
}))


vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

vi.mock('@/components/client-logging-init', () => ({
  ClientLoggingInit: () => null,
}))

vi.mock('@/components/consent/consent-banner', () => ({
  ConsentBanner: () => null,
}))

vi.mock('next-intl/server', () => ({
  getMessages: vi.fn(async () => ({})),
  getTranslations: vi.fn(async ({ namespace }: { namespace: string }) => (key: string) =>
    messages[`${namespace}.${key}`] ?? key
  ),
  setRequestLocale: vi.fn(),
}))

describe('NotFoundPage (localized)', () => {
  it('renders the 404 message', () => {
    render(<NotFoundPage />)

    expect(
      screen.getByRole('heading', { name: 'Page not found' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'There is no page at this address. It may have moved, or the link may be wrong.'
      )
    ).toBeInTheDocument()
  })

  it('renders inside the site shell', () => {
    render(<NotFoundPage />)

    expect(screen.getByTestId('site-header')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByTestId('site-footer')).toBeInTheDocument()
  })

  it('names the address the visitor asked for', () => {
    window.history.pushState({}, '', '/this-page-does-not-exist')
    render(<NotFoundPage />)

    expect(screen.getByText('You asked for')).toBeInTheDocument()
    expect(
      screen.getByText(`${window.location.host}/this-page-does-not-exist`)
    ).toBeInTheDocument()
  })

  it('gives each way out one line, Downloads in one sentence with no pill', () => {
    render(<NotFoundPage />)

    const downloads = screen.getByRole('link', { name: /^Downloads/ })
    expect(downloads).toHaveTextContent(
      'The free plugin and the apps for Mac, Windows and Linux. iOS and Android are in beta.'
    )
    expect(
      screen.getByRole('link', { name: /^Documentation/ })
    ).toHaveAttribute('href', 'https://docs.wcpos.com')
    // Only the external heading carries a mark; internal ones have no arrow.
    for (const name of [/^Downloads/, /^WCPOS Pro/, /^Support/]) {
      const link = screen.getByRole('link', { name })
      expect(link.querySelectorAll('svg')).toHaveLength(1)
      expect(link).not.toHaveTextContent('→')
    }
    expect(
      screen
        .getByRole('link', { name: /^Documentation/ })
        .querySelectorAll('svg')
    ).toHaveLength(2)
  })

  it('puts Go to homepage before the ways out in reading order', () => {
    render(<NotFoundPage />)

    const home = screen.getByRole('link', { name: 'Go to homepage' })
    const downloads = screen.getByRole('link', { name: /^Downloads/ })
    expect(
      home.compareDocumentPosition(downloads) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(home).toHaveClass('lg:order-last')
  })

  it('sets the tab title from the localized 404 title', () => {
    render(<NotFoundPage />)

    expect(document.head.querySelector('title')).toHaveTextContent(
      'Page not found | WCPOS'
    )
    expect(document.title).toBe('Page not found | WCPOS')
  })

  it('links to home, pro, downloads, and support', () => {
    render(<NotFoundPage />)

    expect(
      screen.getByRole('link', { name: 'Go to homepage' })
    ).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /^WCPOS Pro/ })).toHaveAttribute(
      'href',
      '/pro'
    )
    expect(screen.getByRole('link', { name: /^Downloads/ })).toHaveAttribute(
      'href',
      '/downloads'
    )
    expect(screen.getByRole('link', { name: /^Support/ })).toHaveAttribute(
      'href',
      '/support'
    )
  })
})

describe('LocaleLayout runtime attributes', () => {
  it('sets the html lang and dir attributes from the locale config', async () => {
    const { default: LocaleLayout } = await import('./layout')
    const layout = (await LocaleLayout({
      children: <main data-testid="content" />,
      params: Promise.resolve({ locale: 'fr' }),
    })) as ReactElement<{ lang: string; dir: string }>

    expect(layout.type).toBe('html')
    expect(layout.props.lang).toBe('fr')
    expect(layout.props.dir).toBe('ltr')
  })
})

describe('LocaleLayout metadata', () => {
  it('preserves the root social image and localizes OpenGraph metadata', async () => {
    const { generateMetadata } = await import('./layout')
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(metadata.openGraph?.images).toEqual(['/opengraph-image.png'])
    expect(metadata.twitter?.images).toEqual(['/opengraph-image.png'])
    expect(metadata.openGraph?.locale).toBe('fr_FR')
    expect(metadata.openGraph?.alternateLocale).toContain('en_US')
    expect(metadata.openGraph?.alternateLocale).not.toContain('fr_FR')
  })
})
