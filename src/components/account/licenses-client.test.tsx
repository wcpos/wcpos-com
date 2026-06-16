import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'
import { LicensesClient } from './licenses-client'
import type { CanonicalLicenseStatus } from '@/lib/license-status'

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

function makeLicense(
  overrides: Partial<{
    id: string
    key: string
    status: CanonicalLicenseStatus
    expiry: string | null
    maxMachines: number
    machines: Array<{
      id: string
      fingerprint: string
      name: string | null
      metadata: Record<string, unknown>
      createdAt: string
    }>
    metadata: Record<string, unknown>
    policyId: string
    createdAt: string
  }> = {}
) {
  return {
    id: 'lic-1',
    key: 'ABCD-EFGH-IJKL-MNOP',
    status: 'active' as CanonicalLicenseStatus,
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

  it('presents an active license with unparseable expiry as expired', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ status: 'active', expiry: 'not-a-date' }),
        ]}
      />
    )
    expect(screen.getByText('expired')).toBeInTheDocument()
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

  it('warns when an active license expires within 30 days', () => {
    const expiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ status: 'active', expiry })]}
      />
    )

    expect(
      screen.getByText(/Your license expires on .* renew to keep receiving updates/)
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Renew' })).toHaveAttribute(
      'href',
      '/pro'
    )
    // Still displays as active with downloads reachable.
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /downloads/i })).toHaveAttribute(
      'href',
      '/account/downloads'
    )
  })

  it('does not warn when the expiry is beyond the 30-day window', () => {
    const expiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ status: 'active', expiry })]}
      />
    )

    expect(
      screen.queryByText(/renew to keep receiving updates/)
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Renew' })).not.toBeInTheDocument()
  })

  it('does not warn for lifetime licenses', () => {
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ status: 'active', expiry: null })]}
      />
    )

    expect(
      screen.queryByText(/renew to keep receiving updates/)
    ).not.toBeInTheDocument()
  })

  it('labels a yearly-policy license "Yearly"', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ policyId: '261cb7e2-6e80-476e-98bd-fe7f406f258d' }),
        ]}
      />
    )

    expect(screen.getByText('Yearly')).toBeInTheDocument()
  })

  it('does NOT label an unregistered/unknown policy as "Lifetime"', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ status: 'unknown', expiry: null, policyId: 'unknown' }),
        ]}
      />
    )

    expect(screen.queryByText('Lifetime')).not.toBeInTheDocument()
    expect(screen.queryByText('Yearly')).not.toBeInTheDocument()
  })

  it('softens the per-card notice when a lifetime license keeps update access open', () => {
    const expiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ id: 'lic-yearly', status: 'active', expiry }),
          makeLicense({
            id: 'lic-lifetime',
            key: 'WXYZ-WXYZ-WXYZ-LIFE',
            status: 'active',
            expiry: null,
          }),
        ]}
      />
    )

    // The expiring card still mentions its expiry date...
    expect(screen.getByText(/Your license expires on/)).toBeInTheDocument()
    // ...but drops the urgency clause: updates stay available via the
    // lifetime license, mirroring the overview's account-level suppression.
    expect(
      screen.queryByText(/renew to keep receiving updates/)
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Renew' })).toHaveAttribute(
      'href',
      '/pro'
    )
  })

  it('softens the per-card notice when a later active license extends access beyond the window', () => {
    const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    const later = new Date(
      Date.now() + 200 * 24 * 60 * 60 * 1000
    ).toISOString()
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ id: 'lic-soon', status: 'active', expiry: soon }),
          makeLicense({
            id: 'lic-later',
            key: 'WXYZ-WXYZ-WXYZ-LATE',
            status: 'active',
            expiry: later,
          }),
        ]}
      />
    )

    expect(screen.getByText(/Your license expires on/)).toBeInTheDocument()
    expect(
      screen.queryByText(/renew to keep receiving updates/)
    ).not.toBeInTheDocument()
  })

  it('keeps the full renewal warning when every active license lapses inside the window', () => {
    const expiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ id: 'lic-only', status: 'active', expiry }),
          makeLicense({
            id: 'lic-expired',
            key: 'WXYZ-WXYZ-WXYZ-DEAD',
            status: 'expired',
            expiry: '2020-01-01T00:00:00Z',
          }),
        ]}
      />
    )

    expect(
      screen.getByText(/renew to keep receiving updates/)
    ).toBeInTheDocument()
  })

  it('explains unverifiable licenses instead of implying they lapsed', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ status: 'unknown', expiry: null, policyId: 'unknown' }),
        ]}
      />
    )

    expect(screen.getByText('unknown')).toBeInTheDocument()
    expect(screen.getByTitle("We couldn't verify this license right now")).toBeInTheDocument()
    expect(
      screen.getByText(/We couldn't verify this license right now/)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'contact support' })
    ).toHaveAttribute('href', '/support')
    // Unknown is not expired: no renew CTA, no expiry warning.
    expect(screen.queryByRole('link', { name: 'Renew' })).not.toBeInTheDocument()
    expect(screen.queryByText('expired')).not.toBeInTheDocument()
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

  it('attributes the latest covered version to an active licence', () => {
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1', status: 'active' })]}
        entitledVersions={{ 'lic-1': '3.2.0' }}
      />
    )
    expect(
      screen.getByText(/Latest version 3\.2\.0 · via this licence/)
    ).toBeInTheDocument()
  })

  it('shows the last covered version for an expired licence', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ id: 'lic-1', status: 'expired', maxMachines: 1, machines: [] }),
        ]}
        entitledVersions={{ 'lic-1': '2.8.0' }}
      />
    )
    expect(
      screen.getByText(/Covers updates up to 2\.8\.0/)
    ).toBeInTheDocument()
  })

  it('annotates each activated site of an expired licence with its update ceiling', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({
            id: 'lic-1',
            status: 'expired',
            maxMachines: 4,
            machines: [
              {
                id: 'm-1',
                fingerprint: 'fp-1',
                name: 'Till One',
                metadata: {},
                createdAt: '2025-01-01T00:00:00Z',
              },
            ],
          }),
        ]}
        entitledVersions={{ 'lic-1': '2.8.0' }}
      />
    )
    expect(screen.getByText('Updates through 2.8.0')).toBeInTheDocument()
  })

  it('omits the version attribution when the licence covers nothing on its own', () => {
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1', status: 'active' })]}
        entitledVersions={{ 'lic-1': null }}
      />
    )
    expect(screen.queryByText(/via this licence/)).not.toBeInTheDocument()
  })

  it('renders the Discord access stub with sample members and a seat cap', () => {
    render(<LicensesClient initialLicenses={[makeLicense()]} />)
    expect(screen.getByText('Discord access')).toBeInTheDocument()
    // Default cap is 5; three sample members ship by default.
    expect(screen.getByText('3 of 5 members')).toBeInTheDocument()
    expect(screen.getByText('@ada')).toBeInTheDocument()
  })

  it('removes a Discord member from the local stub on Remove', () => {
    render(<LicensesClient initialLicenses={[makeLicense()]} />)

    expect(screen.getByText('3 of 5 members')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove @ada' }))

    expect(screen.getByText('2 of 5 members')).toBeInTheDocument()
    expect(screen.queryByText('@ada')).not.toBeInTheDocument()
  })
})
