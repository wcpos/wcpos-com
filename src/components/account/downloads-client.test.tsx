import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DownloadsClient } from './downloads-client'

vi.mock('next-intl', () => ({
  useLocale: () => 'en-US',
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

describe('DownloadsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no releases are available', () => {
    render(<DownloadsClient initialReleases={[]} />)
    expect(
      screen.getByText('No downloadable versions were found.')
    ).toBeInTheDocument()
  })

  it('renders release notes for each version', () => {
    render(<DownloadsClient initialReleases={[makeRelease()]} />)
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
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Highlights' })
    ).toBeInTheDocument()
    expect(screen.getByText('Faster checkout')).toBeInTheDocument()
  })

  it('paginates long release lists', () => {
    render(<DownloadsClient initialReleases={makeReleaseList(13)} />)

    expect(screen.getByText('WCPOS Pro 1.9.0')).toBeInTheDocument()
    expect(screen.queryByText('WCPOS Pro 1.9.10')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(screen.getByText('WCPOS Pro 1.9.10')).toBeInTheDocument()
  })

  it('clamps to a valid page when release count shrinks', () => {
    const { rerender } = render(
      <DownloadsClient initialReleases={makeReleaseList(13)} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('WCPOS Pro 1.9.10')).toBeInTheDocument()

    rerender(<DownloadsClient initialReleases={makeReleaseList(5)} />)

    expect(screen.getByText('WCPOS Pro 1.9.0')).toBeInTheDocument()
    expect(screen.queryByText('WCPOS Pro 1.9.10')).not.toBeInTheDocument()
  })

  it('disables downloads for unavailable versions', () => {
    render(
      <DownloadsClient
        initialReleases={[makeRelease({ version: '1.8.0', allowed: false })]}
      />
    )

    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled()
  })

  it('does not fetch releases on initial render', () => {
    render(<DownloadsClient initialReleases={[makeRelease()]} />)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('requests a download token for an allowed version', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        downloadUrl: '/api/account/download?token=signed',
      }),
    })

    render(<DownloadsClient initialReleases={[makeRelease()]} />)

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
