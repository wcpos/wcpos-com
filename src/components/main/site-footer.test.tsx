import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// next-intl: keep footer copy realistic, and provide deliberately localized
// platform labels so the download column cannot accidentally use the raw
// platform metadata names.
vi.mock('next-intl', () => ({
  useTranslations:
    (namespace: string) => (key: string, values?: Record<string, string>) => {
      const labels: Record<string, Record<string, string>> = {
        footer: {
          productHeading: 'Product',
          communityHeading: 'Community',
          supportHeading: 'Support',
          companyHeading: 'Company',
          downloadHeading: 'Download',
          downloads: 'Downloads',
          pro: 'WCPOS Pro',
          roadmap: 'Roadmap',
          demo: 'Live Demo',
          discord: 'Discord',
          github: 'GitHub',
          wordpressOrg: 'WordPress.org',
          documentation: 'Documentation',
          getSupport: 'Support',
          status: 'Status',
          wordpressForum: 'WordPress Forum',
          wordpressPlugin: 'WordPress Plugin',
          about: 'About',
          privacy: 'Privacy',
          terms: 'Terms',
          refunds: 'Refunds',
          copyright: '© 2026 WCPOS',
          socialGithubAria: 'WCPOS on GitHub',
          socialDiscordAria: 'Join the WCPOS Discord',
          socialWordpressAria: 'WCPOS on WordPress.org',
        },
        'downloads.platforms': {
          'mac-arm.name': 'Translated macOS',
          'win.name': 'Translated Windows',
          'linux.name': 'Translated Linux',
          'ios.name': 'Translated iPhone and iPad',
          'android.name': 'Translated Android',
          'mac-intel.name': 'Translated Intel macOS',
          'web.name': 'Translated Web',
        },
      }
      if (namespace === 'footer' && key === 'appFor') {
        return `WCPOS for ${values?.platform ?? ''}`
      }
      return labels[namespace]?.[key] ?? key
    }
}))

// Locale-aware Link → plain anchor.
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

// Child widgets pull in next-themes / router; stub them — not under test here.
vi.mock('./language-selector', () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}))
vi.mock('./theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

import { SiteFooter } from './site-footer'
import { PLATFORMS } from '@/components/downloads/platforms'

function hrefOf(label: string): string | null | undefined {
  return screen.getByText(label).closest('a')?.getAttribute('href')
}

describe('SiteFooter', () => {
  it('renders all five column headings', () => {
    render(<SiteFooter />)
    for (const heading of [
      'Product',
      'Community',
      'Support',
      'Company',
      'Download',
    ]) {
      expect(
        screen.getByRole('heading', { name: heading })
      ).toBeInTheDocument()
    }
  })

  it('points the community links at the right destinations', () => {
    render(<SiteFooter />)
    expect(hrefOf('Discord')).toBe('https://discord.gg/MV3E9dSUD')
    expect(hrefOf('GitHub')).toBe('https://github.com/wcpos')
    expect(hrefOf('WordPress.org')).toBe(
      'https://wordpress.org/plugins/woocommerce-pos/'
    )
  })

  it('keeps internal links locale-aware (no new tab)', () => {
    render(<SiteFooter />)
    const downloads = screen.getByText('Downloads').closest('a')
    expect(downloads?.getAttribute('href')).toBe('/downloads')
    expect(downloads?.getAttribute('target')).toBeNull()
  })

  it('opens external links in a new tab with a safe rel', () => {
    render(<SiteFooter />)
    const discord = screen.getByText('Discord').closest('a')
    expect(discord?.getAttribute('target')).toBe('_blank')
    expect(discord?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('lists one translated download entry per shipped platform (minus Intel + Web)', () => {
    render(<SiteFooter />)
    // macOS, Windows, Linux, iOS & iPad, Android — the mac-intel and web
    // keys are deliberately omitted.
    expect(hrefOf('WCPOS for Translated macOS')).toBe(
      PLATFORMS['mac-arm'].href
    )
    expect(hrefOf('WCPOS for Translated Windows')).toBe(PLATFORMS.win.href)
    expect(hrefOf('WCPOS for Translated Linux')).toBe(PLATFORMS.linux.href)
    expect(hrefOf('WCPOS for Translated iPhone and iPad')).toBe(
      PLATFORMS.ios.href
    )
    expect(hrefOf('WCPOS for Translated Android')).toBe(
      PLATFORMS.android.href
    )
    expect(screen.queryByText('WCPOS for Translated Intel macOS')).toBeNull()
    expect(screen.queryByText('WCPOS for Translated Web')).toBeNull()
    expect(screen.queryByText('WCPOS for iOS & iPad')).toBeNull()
  })

  it('links Status at the external status page in a new tab', () => {
    render(<SiteFooter />)
    const status = screen.getByText('Status').closest('a')
    expect(status?.getAttribute('href')).toBe('https://status.wcpos.com/')
    expect(status?.getAttribute('target')).toBe('_blank')
    expect(status?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('exposes accessible social buttons', () => {
    render(<SiteFooter />)
    expect(
      screen.getByLabelText('WCPOS on GitHub').getAttribute('href')
    ).toBe('https://github.com/wcpos')
    expect(
      screen.getByLabelText('Join the WCPOS Discord').getAttribute('href')
    ).toBe('https://discord.gg/MV3E9dSUD')
    expect(
      screen.getByLabelText('WCPOS on WordPress.org').getAttribute('href')
    ).toBe('https://wordpress.org/plugins/woocommerce-pos/')
  })

  it('groups the legal links under Company', () => {
    render(<SiteFooter />)
    for (const label of ['Privacy', 'Terms', 'Refunds', 'About']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})
