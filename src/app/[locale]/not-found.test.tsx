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

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}))

const messages: Record<string, string> = {
  'errors.notFoundTitle': 'Page not found',
  'errors.notFoundDescription':
    'The page you are looking for does not exist or may have moved.',
  'errors.goHome': 'Go to homepage',
  'header.support': 'Support',
  'metadata.siteTitle': 'WCPOS - Point of Sale for WooCommerce',
  'metadata.siteDescription':
    'Point of Sale for WooCommerce. Fast, reliable POS system for your WooCommerce store.',
}

vi.mock('next-intl', () => ({
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
        'The page you are looking for does not exist or may have moved.'
      )
    ).toBeInTheDocument()
  })

  it('links to home, pro, and support', () => {
    render(<NotFoundPage />)

    expect(
      screen.getByRole('link', { name: 'Go to homepage' })
    ).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'WCPOS Pro' })).toHaveAttribute(
      'href',
      '/pro'
    )
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
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
