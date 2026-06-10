import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'
import { DownloadsClient, type DownloadAccess } from './downloads-client'

// Mock the locale-aware Link as a simple anchor
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

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeRelease(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.9.0',
    name: 'WCPOS Pro 1.9.0',
    releaseNotes: 'Bug fixes',
    publishedAt: '2026-02-01T00:00:00Z',
    allowed: true,
    ...overrides,
  }
}

function makeReleaseList(count: number) {
  return Array.from({ length: count }, (_, index) =>
    makeRelease({
      version: `1.9.${index}`,
      name: `WCPOS Pro 1.9.${index}`,
    })
  )
}

function makeAccess(overrides: Partial<DownloadAccess> = {}): DownloadAccess {
  return {
    hasActiveLicense: true,
    latestExpiry: null,
    expiryHasPassed: false,
    licenseCount: 1,
    suspendedCount: 0,
    unknownCount: 0,
    ...overrides,
  }
}

describe('DownloadsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no releases are available', () => {
    render(<DownloadsClient initialReleases={[]} access={makeAccess()} />)
    expect(
      screen.getByText('No downloadable versions were found.')
    ).toBeInTheDocument()
  })

  it('renders release notes for each version', () => {
    render(
      <DownloadsClient initialReleases={[makeRelease()]} access={makeAccess()} />
    )
    expect(screen.getByText('WCPOS Pro 1.9.0')).toBeInTheDocument()
    expect(screen.getByText('Bug fixes')).toBeInTheDocument()
  })

  it('renders markdown release notes with headings and lists', () => {
    render(
      <DownloadsClient
        initialReleases={[
          makeRelease({
            releaseNotes: '# Highlights\n- Faster checkout\n- Better syncing',
          }),
        ]}
        access={makeAccess()}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Highlights' })
    ).toBeInTheDocument()
    expect(screen.getByText('Faster checkout')).toBeInTheDocument()
  })

  it('paginates long release lists', () => {
    render(
      <DownloadsClient
        initialReleases={makeReleaseList(13)}
        access={makeAccess()}
      />
    )

    expect(screen.getByText('WCPOS Pro 1.9.0')).toBeInTheDocument()
    expect(screen.queryByText('WCPOS Pro 1.9.10')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(screen.getByText('WCPOS Pro 1.9.10')).toBeInTheDocument()
  })

  it('clamps to a valid page when release count shrinks', () => {
    const { rerender } = render(
      <DownloadsClient
        initialReleases={makeReleaseList(13)}
        access={makeAccess()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('WCPOS Pro 1.9.10')).toBeInTheDocument()

    rerender(
      <DownloadsClient
        initialReleases={makeReleaseList(5)}
        access={makeAccess()}
      />
    )

    expect(screen.getByText('WCPOS Pro 1.9.0')).toBeInTheDocument()
    expect(screen.queryByText('WCPOS Pro 1.9.10')).not.toBeInTheDocument()
  })

  it('greys out unavailable versions with a reason and disabled button', () => {
    render(
      <DownloadsClient
        initialReleases={[makeRelease({ version: '1.8.0', allowed: false })]}
        access={makeAccess({
          hasActiveLicense: false,
          latestExpiry: '2026-01-01T00:00:00Z',
          expiryHasPassed: true,
        })}
      />
    )

    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled()
    expect(
      screen.getByText('Released after your license expired.')
    ).toBeInTheDocument()
  })

  it('shows a renew banner when all licenses are expired', () => {
    render(
      <DownloadsClient
        initialReleases={[makeRelease()]}
        access={makeAccess({
          hasActiveLicense: false,
          latestExpiry: '2026-01-01T00:00:00Z',
          expiryHasPassed: true,
        })}
      />
    )

    expect(
      screen.getByText(/Your license expired on .*2026/)
    ).toBeInTheDocument()
    const renewLink = screen.getByRole('link', { name: 'Renew license' })
    expect(renewLink).toHaveAttribute('href', '/pro')
  })

  it('shows a suspended banner instead of claiming a future expiry has passed', () => {
    // A sole suspended license with a FUTURE expiry: the old UI wrongly said
    // "Your license expired on [future date]".
    render(
      <DownloadsClient
        initialReleases={[makeRelease()]}
        access={makeAccess({
          hasActiveLicense: false,
          latestExpiry: '2099-10-01T00:00:00Z',
          expiryHasPassed: false,
          suspendedCount: 1,
        })}
      />
    )

    expect(
      screen.getByText('Your license is suspended — contact support.')
    ).toBeInTheDocument()
    const supportLink = screen.getByRole('link', { name: 'Contact support' })
    expect(supportLink).toHaveAttribute('href', '/support')
    expect(
      screen.queryByText(/Your license expired on/)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Renew license' })
    ).not.toBeInTheDocument()
  })

  it('shows the expired banner for a suspended license whose expiry has actually passed', () => {
    render(
      <DownloadsClient
        initialReleases={[makeRelease()]}
        access={makeAccess({
          hasActiveLicense: false,
          latestExpiry: '2025-06-15T00:00:00Z',
          expiryHasPassed: true,
          suspendedCount: 1,
        })}
      />
    )

    expect(
      screen.getByText(/Your license expired on .*2025/)
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Your license is suspended/)
    ).not.toBeInTheDocument()
  })

  it('shows an honest verification banner for unknown licenses without claiming expiry', () => {
    render(
      <DownloadsClient
        initialReleases={[makeRelease({ allowed: false })]}
        access={makeAccess({
          hasActiveLicense: false,
          latestExpiry: null,
          unknownCount: 1,
        })}
      />
    )

    expect(
      screen.getByText(
        "We couldn't verify your license — downloads may be temporarily limited. Try again shortly or contact support."
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Contact support' })
    ).toHaveAttribute('href', '/support')
    // The per-release reason must not misattribute the cause to expiry.
    expect(
      screen.getByText("We couldn't verify your license.")
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Released after your license expired.')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/You have no active license/)
    ).not.toBeInTheDocument()
  })

  it('falls back to the generic inactive banner when no specific cause is known', () => {
    render(
      <DownloadsClient
        initialReleases={[makeRelease({ allowed: false })]}
        access={makeAccess({
          hasActiveLicense: false,
          latestExpiry: null,
        })}
      />
    )

    expect(
      screen.getByText(
        'You have no active license. Only versions released during your license term are available.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Renew license' })
    ).toHaveAttribute('href', '/pro')
    expect(screen.getByText('Requires an active license.')).toBeInTheDocument()
  })

  it('shows a purchase banner when the customer has no licenses', () => {
    render(
      <DownloadsClient
        initialReleases={[makeRelease({ allowed: false })]}
        access={makeAccess({ hasActiveLicense: false, licenseCount: 0 })}
      />
    )

    expect(
      screen.getByText('A WCPOS Pro license is required to download the plugin.')
    ).toBeInTheDocument()
    const buyLink = screen.getByRole('link', { name: 'Get WCPOS Pro' })
    expect(buyLink).toHaveAttribute('href', '/pro')
    expect(
      screen.getByText('Requires an active license.')
    ).toBeInTheDocument()
  })

  it('shows no banner for customers with an active license', () => {
    render(
      <DownloadsClient initialReleases={[makeRelease()]} access={makeAccess()} />
    )

    expect(screen.queryByRole('link', { name: /renew/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Get WCPOS Pro' })
    ).not.toBeInTheDocument()
  })

  it('does not fetch releases on initial render', () => {
    render(
      <DownloadsClient initialReleases={[makeRelease()]} access={makeAccess()} />
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('requests a download token for an allowed version', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        downloadUrl: '/api/account/download?token=signed',
      }),
    })

    render(
      <DownloadsClient initialReleases={[makeRelease()]} access={makeAccess()} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Download' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/account/downloads/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: '1.9.0' }),
    })
  })
})
