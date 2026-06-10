import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LicensesClient } from './licenses-client'

vi.mock('next-intl', () => ({
  useLocale: () => 'en-US',
}))

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

  it('shows empty state when no licenses exist', () => {
    render(<LicensesClient initialLicenses={[]} />)
    expect(screen.getByText('No licenses found.')).toBeInTheDocument()
  })

  it('renders license key masked', () => {
    render(<LicensesClient initialLicenses={[makeLicense()]} />)
    expect(screen.getByText('****-****-MNOP')).toBeInTheDocument()
  })

  it('shows download button for active licenses', () => {
    render(
      <LicensesClient initialLicenses={[makeLicense({ status: 'active' })]} />
    )
    const downloadLink = screen.getByRole('link', { name: /downloads/i })
    expect(downloadLink).toBeInTheDocument()
    expect(downloadLink).toHaveAttribute('href', '/account/downloads')
  })

  it('shows renew CTA and keeps downloads reachable for expired licenses', () => {
    render(
      <LicensesClient initialLicenses={[makeLicense({ status: 'expired' })]} />
    )
    expect(screen.getByText('****-****-MNOP')).toBeInTheDocument()
    const renewLink = screen.getByRole('link', { name: 'Renew' })
    expect(renewLink).toHaveAttribute('href', '/pro')
    // Pre-expiry versions stay downloadable, so the downloads page stays linked
    const downloadLink = screen.getByRole('link', { name: /downloads/i })
    expect(downloadLink).toHaveAttribute('href', '/account/downloads')
  })

  it('presents an active license past its expiry date as expired', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ status: 'active', expiry: '2020-01-01T00:00:00Z' }),
        ]}
      />
    )
    expect(screen.getByText('expired')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Renew' })).toHaveAttribute(
      'href',
      '/pro'
    )
  })

  it('does not show download button for suspended licenses', () => {
    render(
      <LicensesClient initialLicenses={[makeLicense({ status: 'suspended' })]} />
    )
    expect(screen.getByText('****-****-MNOP')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument()
  })

  it('shows activations count', () => {
    render(
      <LicensesClient
        initialLicenses={[
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
        ]}
      />
    )
    expect(screen.getByText('1 of 5')).toBeInTheDocument()
  })

  it('does not fetch licenses on initial render', () => {
    render(<LicensesClient initialLicenses={[makeLicense()]} />)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
