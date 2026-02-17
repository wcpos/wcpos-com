import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { LicensesClient } from './licenses-client'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeLicense(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lic-1',
    key: 'ABCD-EFGH-IJKL-MNOP',
    status: 'active',
    expiry: '2027-01-01T00:00:00Z',
    maxMachines: 5,
    machines: [],
    metadata: {},
    policyId: 'lifetime-policy',
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('LicensesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no licenses exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ licenses: [] }),
    })

    render(<LicensesClient />)

    await waitFor(() => {
      expect(screen.getByText('No licenses found.')).toBeInTheDocument()
    })
  })

  it('renders license key masked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ licenses: [makeLicense()] }),
    })

    render(<LicensesClient />)

    await waitFor(() => {
      expect(screen.getByText('****-****-MNOP')).toBeInTheDocument()
    })
  })

  it('shows download button for active licenses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ licenses: [makeLicense({ status: 'active' })] }),
    })

    render(<LicensesClient />)

    await waitFor(() => {
      const downloadLink = screen.getByRole('link', { name: /download/i })
      expect(downloadLink).toBeInTheDocument()
      expect(downloadLink).toHaveAttribute('href', '/account/downloads')
    })
  })

  it('does not show download button for expired licenses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        licenses: [makeLicense({ status: 'expired' })],
      }),
    })

    render(<LicensesClient />)

    await waitFor(() => {
      expect(screen.getByText('****-****-MNOP')).toBeInTheDocument()
    })

    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument()
  })

  it('does not show download button for suspended licenses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        licenses: [makeLicense({ status: 'suspended' })],
      }),
    })

    render(<LicensesClient />)

    await waitFor(() => {
      expect(screen.getByText('****-****-MNOP')).toBeInTheDocument()
    })

    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument()
  })

  it('shows activations count', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        licenses: [
          makeLicense({
            maxMachines: 5,
            machines: [
              {
                id: 'm-1',
                fingerprint: 'fp-1',
                name: 'My Store',
                metadata: {},
                createdAt: '2025-06-01T00:00:00Z',
              },
            ],
          }),
        ],
      }),
    })

    render(<LicensesClient />)

    await waitFor(() => {
      expect(screen.getByText('1 of 5')).toBeInTheDocument()
    })
  })

  it('shows error message when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    render(<LicensesClient />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch licenses')).toBeInTheDocument()
    })
  })
})
