import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// next-intl: keep footer copy realistic, and provide deliberately localized
// platform labels so the download column cannot accidentally use the raw
// platform metadata names.
vi.mock('next-intl', () => ({
  useTranslations:
    (namespace: string) => (key: string) => {
      const labels: Record<string, Record<string, string>> = {
        footer: {
          useHeading: 'Use WCPOS',
          appsHeading: 'Apps',
          helpHeading: 'Help',
          projectHeading: 'Project',
          downloads: 'Downloads',
          pro: 'WCPOS Pro',
          compare: 'Compare',
          roadmap: 'Roadmap',
          changelog: 'Changelog',
          demo: 'Live demo',
          extensions: 'Extensions',
          discord: 'Discord',
          github: 'GitHub',
          wordpressOrg: 'WordPress.org',
          documentation: 'Documentation',
          getSupport: 'Support',
          status: 'Status',
          wordpressForum: 'WordPress forum',
          wordpressPlugin: 'WordPress plugin',
          installFirst: 'install first',
          language: 'Language',
          theme: 'Theme',
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
        'downloads.page': { beta: 'Translated beta' },
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
  it('renders the four task-grouped column headings', () => {
    render(<SiteFooter />)
    for (const heading of ['Use WCPOS', 'Apps', 'Help', 'Project']) {
      expect(
        screen.getByRole('heading', { name: heading })
      ).toBeInTheDocument()
    }
  })

  it('points the community links at the right destinations', () => {
    render(<SiteFooter />)
    expect(hrefOf('Discord')).toBe('https://discord.gg/GCEeEVpEvX')
    expect(document.querySelector('a[href*="MV3E9dSUD"]')).toBeNull()
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

  it('links Compare at the /compare index', () => {
    render(<SiteFooter />)
    expect(hrefOf('Compare')).toBe('/compare')
    expect(screen.getByRole('link', { name: 'Compare' })).not.toHaveAttribute('target')
  })

  it('links to the changelog without opening a new tab', () => {
    render(<SiteFooter />)
    const changelog = screen.getByRole('link', { name: 'Changelog' })
    expect(changelog).toHaveAttribute('href', '/changelog')
    expect(changelog).not.toHaveAttribute('target')
  })

  it('opens external links in a new tab with a safe rel', () => {
    render(<SiteFooter />)
    const discord = screen.getByText('Discord').closest('a')
    expect(discord?.getAttribute('target')).toBe('_blank')
    expect(discord?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('lists one translated app entry per shipped platform (minus Intel + Web)', () => {
    render(<SiteFooter />)
    // macOS, Windows, Linux, iOS & iPad, Android — the mac-intel and web
    // keys are deliberately omitted; the column heading says they are apps.
    expect(hrefOf('Translated macOS')).toBe(PLATFORMS['mac-arm'].href)
    expect(hrefOf('Translated Windows')).toBe(PLATFORMS.win.href)
    expect(hrefOf('Translated Linux')).toBe(PLATFORMS.linux.href)
    expect(hrefOf('Translated iPhone and iPad')).toBe(PLATFORMS.ios.href)
    expect(hrefOf('Translated Android')).toBe(PLATFORMS.android.href)
    expect(screen.queryByText('Translated Intel macOS')).toBeNull()
    expect(screen.queryByText('Translated Web')).toBeNull()
  })

  it('marks only the mobile store apps as Beta, outside their link names', () => {
    render(<SiteFooter />)
    const badges = screen.getAllByText('Translated beta')
    expect(badges).toHaveLength(2)
    for (const label of ['Translated iPhone and iPad', 'Translated Android']) {
      const link = screen.getByText(label).closest('a')!
      expect(link.closest('li')).toHaveTextContent('Translated beta')
      expect(link).not.toHaveTextContent('Translated beta')
    }
    expect(
      screen.getByText('Translated macOS').closest('li')
    ).not.toHaveTextContent('Translated beta')
  })

  it('captions the WordPress plugin as the one to install first', () => {
    render(<SiteFooter />)
    const plugin = screen.getByRole('link', { name: 'WordPress plugin' })
    expect(plugin).toHaveAttribute(
      'href',
      'https://wordpress.org/plugins/woocommerce-pos/'
    )
    expect(plugin.closest('li')).toHaveTextContent('install first')
  })

  it('opens Documentation in a new tab with the external mark', () => {
    render(<SiteFooter />)
    const docs = screen.getByRole('link', { name: 'Documentation' })
    expect(docs).toHaveAttribute('href', 'https://docs.wcpos.com')
    expect(docs).toHaveAttribute('target', '_blank')
    expect(docs.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('keeps all 24 links and labels the settings in words', () => {
    render(<SiteFooter />)
    // 24 text links + 3 social icons.
    expect(screen.getAllByRole('link')).toHaveLength(27)
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()
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
    ).toBe('https://discord.gg/GCEeEVpEvX')
    expect(
      screen.getByLabelText('WCPOS on WordPress.org').getAttribute('href')
    ).toBe('https://wordpress.org/plugins/woocommerce-pos/')
  })

  it('keeps About and the legal links', () => {
    render(<SiteFooter />)
    for (const label of ['Privacy', 'Terms', 'Refunds', 'About']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('links to Extensions in the same tab', () => {
    render(<SiteFooter />)
    const extensions = screen.getByRole('link', { name: 'Extensions' })
    expect(extensions).toHaveAttribute('href', '/extensions')
    expect(extensions).not.toHaveAttribute('target')
  })
})
