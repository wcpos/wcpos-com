import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DownloadsClient, type DownloadAccess } from './downloads-client'

vi.mock('next-intl', () => ({
  useLocale: () => 'en-US',
}))

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
    licenseCount: 1,
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
        })}
      />
    )

    expect(
      screen.getByText(/Your license expired on .*2026/)
    ).toBeInTheDocument()
    const renewLink = screen.getByRole('link', { name: 'Renew license' })
    expect(renewLink).toHaveAttribute('href', '/pro')
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
