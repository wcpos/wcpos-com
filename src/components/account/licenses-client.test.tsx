import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'
import { LicensesClient } from './licenses-client'
import type { CanonicalLicenseStatus } from '@/lib/license-status'
import { YEARLY_PRO_POLICY_ID } from '@/lib/plans'

// Mock the locale-aware Link as a simple anchor
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    prefetch,
    ...props
  }: {
    children: React.ReactNode
    href: string
    prefetch?: boolean
    [key: string]: unknown
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}))

// The component reads the Discord claim outcome from the URL query. Tests
// steer it through this mutable ref (vi.mock factories are hoisted).
const { searchParamsRef } = vi.hoisted(() => ({
  searchParamsRef: { current: new URLSearchParams() },
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsRef.current,
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
    activationCount: number
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
    activationCount: 0,
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
    searchParamsRef.current = new URLSearchParams()
  })

  it('shows empty state when no licenses exist', () => {
    render(<LicensesClient initialLicenses={[]} />)
    expect(screen.getByText("You don't have a WCPOS Pro license yet")).toBeInTheDocument()
    // The empty state leads to /pro and to the free download.
    expect(screen.getByRole('link', { name: 'See WCPOS Pro' })).toHaveAttribute('href', '/pro')
    expect(
      screen.getByRole('link', { name: 'Download WCPOS free' })
    ).toHaveAttribute('href', '/downloads')
  })

  it('renders license key masked', () => {
    render(<LicensesClient initialLicenses={[makeLicense()]} />)
    expect(screen.getByText('••••-••••-MNOP')).toBeInTheDocument()
  })

  it('reveals the full license key when the key is clicked, then re-masks', () => {
    render(<LicensesClient initialLicenses={[makeLicense()]} />)

    const toggle = screen.getByRole('button', {
      name: 'Show license key ending in MNOP',
    })
    expect(screen.getByText('••••-••••-MNOP')).toBeInTheDocument()
    expect(screen.queryByText('ABCD-EFGH-IJKL-MNOP')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByText('ABCD-EFGH-IJKL-MNOP')).toBeInTheDocument()
    expect(screen.queryByText('••••-••••-MNOP')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Hide license key ending in MNOP' })
    ).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(
      screen.getByRole('button', { name: 'Hide license key ending in MNOP' })
    )
    expect(screen.getByText('••••-••••-MNOP')).toBeInTheDocument()
    expect(screen.queryByText('ABCD-EFGH-IJKL-MNOP')).not.toBeInTheDocument()
  })

  it('copies the full license key to the clipboard when the copy button is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(<LicensesClient initialLicenses={[makeLicense()]} />)

    const copyButton = screen.getByRole('button', {
      name: 'Copy license key ending in MNOP',
    })
    fireEvent.click(copyButton)

    expect(writeText).toHaveBeenCalledWith('ABCD-EFGH-IJKL-MNOP')
    // Confirmation state flips the button's accessible name to "Copied".
    expect(
      await screen.findByRole('button', { name: 'Copied' })
    ).toBeInTheDocument()
  })

  it('gives each card a distinct accessible name and reveals keys independently', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ id: 'lic-1', key: 'ABCD-EFGH-IJKL-MNOP' }),
          makeLicense({ id: 'lic-2', key: 'WXYZ-WXYZ-WXYZ-0000' }),
        ]}
      />
    )

    // Each card's toggle has a suffix-disambiguated accessible name, so
    // screen readers (and this test) can target one card without getAllByRole.
    const firstToggle = screen.getByRole('button', {
      name: 'Show license key ending in MNOP',
    })
    expect(
      screen.getByRole('button', { name: 'Show license key ending in 0000' })
    ).toBeInTheDocument()

    fireEvent.click(firstToggle)

    // Only the clicked card reveals; the other stays masked.
    expect(screen.getByText('ABCD-EFGH-IJKL-MNOP')).toBeInTheDocument()
    expect(screen.getByText('••••-••••-0000')).toBeInTheDocument()
    expect(screen.queryByText('WXYZ-WXYZ-WXYZ-0000')).not.toBeInTheDocument()
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
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1', status: 'expired' })]}
      />
    )
    expect(screen.getByText('••••-••••-MNOP')).toBeInTheDocument()
    const renewLink = screen.getByRole('link', { name: 'Renew for a year' })
    expect(renewLink).toHaveAttribute('href', '/pro')
    // The action says what it does before it does it.
    expect(
      screen.getByText('Opens the renewal page. Nothing is charged until you click Pay there.')
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'WCPOS Pro keeps working on your sites. Renew to get updates and priority support again.'
      )
    ).toBeInTheDocument()
    // Pre-expiry versions stay downloadable, scoped to this licence.
    const downloadLink = screen.getByRole('link', { name: /downloads/i })
    expect(downloadLink).toHaveAttribute('href', '/account/downloads?license=lic-1')
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
    // Fail-closed expiry must NOT read as a lifetime licence (only a null
    // expiry is lifetime); the fact value degrades to a dash instead.
    expect(
      screen.queryByText('Updates and priority support with no end date')
    ).not.toBeInTheDocument()
    // No date line; the (empty) downloads fact degrades to a dash.
    expect(screen.queryByText(/Updates and priority support (until|ended)/)).toBeNull()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
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
    expect(screen.getByRole('link', { name: 'Renew for a year' })).toHaveAttribute(
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

    // Expiry ends updates and priority support only; Pro keeps working.
    expect(
      screen.getByText(/Updates and priority support end on .*, in 10 days\. WCPOS Pro keeps working after that\./)
    ).toBeInTheDocument()
    expect(screen.queryByText(/stops working/)).toBeNull()
    // The notice's Renew is the card's only Renew.
    expect(screen.getAllByRole('link', { name: /Renew/ })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Renew for a year' })).toHaveAttribute(
      'href',
      '/pro'
    )
    // Inside the 30-day window the badge reads "expiring"; downloads stay
    // reachable.
    expect(screen.getByText('expiring')).toBeInTheDocument()
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
      screen.queryByText(/Updates and priority support end on/)
    ).not.toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    // The notice is gone, but the always-visible early Renew remains.
    expect(screen.getByRole('link', { name: 'Renew early' })).toHaveAttribute(
      'href',
      '/pro'
    )
  })

  it('does not warn for lifetime licenses', () => {
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ status: 'active', expiry: null })]}
      />
    )

    expect(
      screen.queryByText(/Updates and priority support end on/)
    ).not.toBeInTheDocument()
    // A lifetime licence never expires — there is nothing to renew.
    expect(screen.queryByRole('link', { name: /Renew/ })).not.toBeInTheDocument()
    expect(
      screen.getByText('Updates and priority support with no end date')
    ).toBeInTheDocument()
    expect(screen.getByText('A Lifetime license has nothing to renew.')).toBeInTheDocument()
  })

  it('labels a yearly-policy license "Yearly"', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ policyId: YEARLY_PRO_POLICY_ID }),
        ]}
      />
    )

    expect(screen.getByText('WCPOS Pro Yearly')).toBeInTheDocument()
  })

  it('routes the Renew button for a yearly licence to the one-click renewal flow', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({
            status: 'active',
            policyId: YEARLY_PRO_POLICY_ID,
          }),
        ]}
      />
    )

    // An active yearly licence shows the always-visible Renew, pointed at the
    // one-click renewal flow (prefilled cart + saved card), not the full
    // checkout. That flow itself falls back to /pro/checkout without billing.
    expect(screen.getByRole('link', { name: 'Renew early' })).toHaveAttribute(
      'href',
      '/account/licenses/renew'
    )
  })

  it('does not prefetch Renew checkout links because they resolve auth at request time', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({
            status: 'active',
            policyId: YEARLY_PRO_POLICY_ID,
          }),
        ]}
      />
    )

    expect(screen.getByRole('link', { name: 'Renew early' })).toHaveAttribute(
      'data-prefetch',
      'false'
    )
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

  it('reads the same expiry notice whether or not another licence keeps updates open', () => {
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

    // The per-card notice carries no urgency either way: it states the end
    // date and that Pro keeps working.
    expect(screen.getByText(/WCPOS Pro keeps working after that/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Renew for a year' })).toHaveAttribute(
      'href',
      '/pro'
    )
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
    expect(screen.queryByRole('link', { name: /Renew/ })).not.toBeInTheDocument()
    expect(screen.queryByText('expired')).not.toBeInTheDocument()
  })

  it('does not show download button for suspended licenses', () => {
    render(
      <LicensesClient initialLicenses={[makeLicense({ status: 'suspended' })]} />
    )
    expect(screen.getByText('••••-••••-MNOP')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument()
    expect(
      screen.getByText('No downloads while the license is suspended.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('This license is suspended. Contact support to find out why and to restore it.')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
      'href',
      '/support'
    )
    expect(
      screen.queryByText(/Connect with your license key/)
    ).not.toBeInTheDocument()
  })

  it('shows activations count', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({
            maxMachines: 5,
            activationCount: 1,
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
    // The activation count heads the Sites column.
    expect(screen.getByText('1 of 5 in use')).toBeInTheDocument()
    expect(screen.getByText(/4 free\. One key covers 5 sites\./)).toBeInTheDocument()
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
    // The covered version leads the Downloads column, linking to the
    // downloads page.
    expect(screen.getByText('3.2.0')).toBeInTheDocument()
    expect(
      screen.getByText(/\(the latest\), and new ones until/)
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Go to downloads/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/account/downloads')
    )
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
    // An expired licence names the last covered version and scopes the
    // downloads link to this licence.
    expect(screen.getByText('2.8.0')).toBeInTheDocument()
    expect(
      screen.getByText(/Versions released after .* need a renewal\./)
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Go to downloads/ })).toHaveAttribute(
      'href',
      expect.stringContaining('license=lic-1')
    )
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
    expect(screen.getByText('Gets updates up to 2.8.0')).toBeInTheDocument()
  })

  it('omits the version attribution when the licence covers nothing on its own', () => {
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1', status: 'active' })]}
        entitledVersions={{ 'lic-1': null }}
      />
    )
    expect(screen.queryByText(/via this license/)).not.toBeInTheDocument()
  })

  it('renders real Discord connected members with a seat cap', () => {
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1' })]}
        discordAccessByLicense={{
          'lic-1': {
            licenseId: 'lic-1',
            seatCap: 5,
            usedSeats: 1,
            members: [
              {
                id: 'member-ada',
                discordUserId: 'discord-ada',
                handle: '@ada',
                avatarUrl: null,
                connectedAt: '2026-06-01T00:00:00.000Z',
              },
            ],
            blockedMembers: [],
          },
        }}
      />
    )
    expect(screen.getByText('Discord support')).toBeInTheDocument()
    expect(screen.getByText('1 of 5 seats')).toBeInTheDocument()
    expect(screen.getByText('@ada')).toBeInTheDocument()
    expect(screen.queryByText('@devon')).not.toBeInTheDocument()
  })

  it('renders empty Discord access when no members are connected', () => {
    render(<LicensesClient initialLicenses={[makeLicense({ id: 'lic-1' })]} />)

    expect(screen.getByText('0 of 5 seats')).toBeInTheDocument()
    expect(screen.queryByText('@ada')).not.toBeInTheDocument()
  })

  it('prompts for Discord at the top of an active card with nobody connected, with ONE Connect button', () => {
    const { container } = render(
      <LicensesClient initialLicenses={[makeLicense({ id: 'lic-1' })]} />
    )

    const prompt = screen.getByText(
      'Priority support happens in our Discord. Connect your Discord account to get the Pro role and the Pro support channels.'
    )
    // The prompt sits in the Discord column with its claim CTA — the only
    // claim form on the card, always the outline button, saying what it does.
    const column = prompt.closest('section')
    expect(column).not.toBeNull()
    expect(
      (column as HTMLElement).querySelector('form[action="/api/discord/claim"]')
    ).not.toBeNull()
    expect(container.querySelectorAll('form[action="/api/discord/claim"]')).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Connect Discord for license ending in MNOP' })
    ).toHaveClass('border')
    expect(
      screen.getByText('Opens Discord to sign in, then brings you back here.')
    ).toBeInTheDocument()
    // The quieter members hint is for cards that already have a member.
    expect(screen.queryByText(/connects with this key gets the Pro role/)).not.toBeInTheDocument()
  })

  it('shows the prompt on ONE card only: never once any licence has a Discord member', () => {
    const { container } = render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ id: 'lic-1' }),
          makeLicense({ id: 'lic-2', key: 'WXYZ-WXYZ-WXYZ-WXYZ' }),
        ]}
        discordAccessByLicense={{
          'lic-1': {
            licenseId: 'lic-1',
            seatCap: 5,
            usedSeats: 1,
            members: [
              { id: 'member-ada', discordUserId: 'discord-ada', handle: '@ada', avatarUrl: null, connectedAt: '2026-06-01T00:00:00.000Z' },
            ],
            blockedMembers: [],
          },
        }}
      />
    )
    // Open the second (collapsed) card so its detail renders.
    fireEvent.click(
      screen.getByRole('button', { name: 'Show sites and downloads for the license ending in WXYZ' })
    )

    // The account already has Discord access via lic-1, so lic-2 must not
    // carry the loud prompt — only the quiet members-section Connect row.
    expect(
      screen.queryByText(/Priority support happens in our Discord/)
    ).not.toBeInTheDocument()
    expect(container.querySelectorAll('form[action="/api/discord/claim"]')).toHaveLength(2)
  })

  it('puts the prompt on the FIRST eligible card only when several active licences have nobody connected', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ id: 'lic-1' }),
          makeLicense({ id: 'lic-2', key: 'WXYZ-WXYZ-WXYZ-WXYZ' }),
        ]}
      />
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Show sites and downloads for the license ending in WXYZ' })
    )

    const prompts = screen.getAllByText(/Priority support happens in our Discord/)
    expect(prompts).toHaveLength(1)
    // The prompt's Connect posts lic-1's key; lic-2 keeps the quiet row.
    const promptForm = prompts[0].closest('section')?.querySelector('form')
    expect(promptForm?.querySelector('input[name="licenseKey"]')).toHaveValue(
      'ABCD-EFGH-IJKL-MNOP'
    )
    expect(screen.getAllByText(/connects with this key gets the Pro role/)).toHaveLength(1)
  })

  it('ignores members on an expired licence and prompts on the active one, opening its card', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ id: 'lic-old', expiry: '2020-01-01T00:00:00Z' }),
          makeLicense({ id: 'lic-2', key: 'WXYZ-WXYZ-WXYZ-WXYZ' }),
        ]}
        discordAccessByLicense={{
          'lic-old': {
            licenseId: 'lic-old',
            seatCap: 5,
            usedSeats: 1,
            members: [
              { id: 'member-ada', discordUserId: 'discord-ada', handle: '@ada', avatarUrl: null, connectedAt: '2026-06-01T00:00:00.000Z' },
            ],
            blockedMembers: [],
          },
        }}
      />
    )

    // No click: the prompt card opens by default even though it is second.
    const prompt = screen.getByText(/Priority support happens in our Discord/)
    const form = prompt.closest('section')?.querySelector('form')
    expect(form?.querySelector('input[name="licenseKey"]')).toHaveValue(
      'WXYZ-WXYZ-WXYZ-WXYZ'
    )
  })

  it('drops the top prompt once a member is connected and keeps Connect in the members section', () => {
    const { container } = render(
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1' })]}
        discordAccessByLicense={{
          'lic-1': {
            licenseId: 'lic-1',
            seatCap: 5,
            usedSeats: 1,
            members: [
              { id: 'member-ada', discordUserId: 'discord-ada', handle: '@ada', avatarUrl: null, connectedAt: '2026-06-01T00:00:00.000Z' },
            ],
            blockedMembers: [],
          },
        }}
      />
    )

    expect(
      screen.queryByText(/Priority support happens in our Discord/)
    ).not.toBeInTheDocument()
    expect(screen.getByText(/connects with this key gets the Pro role/)).toBeInTheDocument()
    expect(container.querySelectorAll('form[action="/api/discord/claim"]')).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Connect Discord for license ending in MNOP' })
    ).toBeInTheDocument()
  })

  it('removes a Discord member through the holder endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1' })]}
        discordAccessByLicense={{
          'lic-1': {
            licenseId: 'lic-1',
            seatCap: 5,
            usedSeats: 1,
            members: [
              { id: 'member-ada', discordUserId: 'discord-ada', handle: '@ada', avatarUrl: null, connectedAt: '2026-06-01T00:00:00.000Z' },
            ],
            blockedMembers: [],
          },
        }}
      />
    )

    // Remove confirms first: nothing is sent until the confirm's Remove.
    fireEvent.click(screen.getByRole('button', { name: 'Remove @ada' }))
    expect(mockFetch).not.toHaveBeenCalled()
    expect(
      screen.getByText(
        "Remove @ada? They lose the Pro role and can't reconnect with this key until you allow it again."
      )
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/account/licenses/lic-1/discord/members/member-ada',
      { method: 'DELETE' }
    )
    expect(await screen.findByText('0 of 5 seats')).toBeInTheDocument()
    // Holder removal block-lists the member (ADR-0007): the row moves to the
    // removed-members list, where the holder can undo the block.
    expect(screen.getByText('Removed members')).toBeInTheDocument()
    expect(screen.getByText('@ada')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Allow @ada to reconnect' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Remove @ada' })
    ).not.toBeInTheDocument()
  })

  it('renders blocked members with an allow-reconnect action', () => {
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1' })]}
        discordAccessByLicense={{
          'lic-1': {
            licenseId: 'lic-1',
            seatCap: 5,
            usedSeats: 0,
            members: [],
            blockedMembers: [
              { discordUserId: 'discord-ada', handle: '@ada', avatarUrl: null },
            ],
          },
        }}
      />
    )

    expect(screen.getByText('Removed members')).toBeInTheDocument()
    expect(screen.getByText('@ada')).toBeInTheDocument()
    expect(
      screen.getByText('Blocked from reconnecting with this key.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Allow @ada to reconnect' })
    ).toBeInTheDocument()
  })

  it('unblocks a removed member through the holder endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1' })]}
        discordAccessByLicense={{
          'lic-1': {
            licenseId: 'lic-1',
            seatCap: 5,
            usedSeats: 0,
            members: [],
            blockedMembers: [
              { discordUserId: 'discord-ada', handle: '@ada', avatarUrl: null },
            ],
          },
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Allow @ada to reconnect' }))

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/account/licenses/lic-1/discord/blocked/discord-ada',
      { method: 'DELETE' }
    )
    // Unblocking only lifts the block — no member row reappears until the
    // person reconnects through the claim flow.
    await waitFor(() =>
      expect(screen.queryByText('Removed members')).not.toBeInTheDocument()
    )
    expect(screen.queryByText('@ada')).not.toBeInTheDocument()
    expect(screen.getByText('0 of 5 seats')).toBeInTheDocument()
  })

  it('surfaces an error when unblocking fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1' })]}
        discordAccessByLicense={{
          'lic-1': {
            licenseId: 'lic-1',
            seatCap: 5,
            usedSeats: 0,
            members: [],
            blockedMembers: [
              { discordUserId: 'discord-ada', handle: '@ada', avatarUrl: null },
            ],
          },
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Allow @ada to reconnect' }))

    expect(
      await screen.findByText('Failed to allow reconnecting. Please try again.')
    ).toBeInTheDocument()
    expect(screen.getByText('@ada')).toBeInTheDocument()
  })

  it('redirects to login when Discord member removal returns 401', async () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1' })]}
        discordAccessByLicense={{
          'lic-1': {
            licenseId: 'lic-1',
            seatCap: 5,
            usedSeats: 1,
            members: [
              { id: 'member-ada', discordUserId: 'discord-ada', handle: '@ada', avatarUrl: null, connectedAt: '2026-06-01T00:00:00.000Z' },
            ],
            blockedMembers: [],
          },
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove @ada' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('@ada')).toBeInTheDocument()
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('offers Connect Discord on an active licence with free seats, posting the key', () => {
    render(<LicensesClient initialLicenses={[makeLicense({ id: 'lic-1' })]} />)

    const button = screen.getByRole('button', {
      name: 'Connect Discord for license ending in MNOP',
    })
    const form = button.closest('form')
    expect(form).toHaveAttribute('action', '/api/discord/claim')
    expect(form).toHaveAttribute('method', 'POST')
    expect(form?.querySelector('input[name="licenseKey"]')).toHaveValue(
      'ABCD-EFGH-IJKL-MNOP'
    )
    expect(form?.querySelector('input[name="returnTo"]')).toHaveValue(
      '/account/licenses'
    )
  })

  it('draws every account-changing control disabled during read-only inspection', () => {
    const { container } = render(
      <LicensesClient
        initialLicenses={[
          makeLicense({
            id: 'lic-1',
            policyId: YEARLY_PRO_POLICY_ID,
            activationCount: 1,
            machines: [
              {
                id: 'm-1',
                fingerprint: 'fp-1',
                name: null,
                metadata: { domain: 'shop.example.com' },
                createdAt: '2025-06-01T00:00:00Z',
              },
            ],
          }),
        ]}
        viewOnly
      />
    )

    // Connect is drawn disabled and outside any form: the public claim route
    // can't be fenced by assertViewOnly(), so the flow is never offered.
    expect(screen.getByRole('button', { name: 'Connect Discord' })).toBeDisabled()
    expect(
      container.querySelector('form[action="/api/discord/claim"]')
    ).toBeNull()
    expect(
      screen.getByText('Read-only view: connecting is turned off.')
    ).toBeInTheDocument()
    // Renew and Deactivate are drawn disabled too, and Renew says why.
    expect(screen.queryByRole('link', { name: /Renew/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Renew early' })).toBeDisabled()
    expect(screen.getByText('Read-only view: renewing is turned off.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Deactivate site: shop.example.com' })
    ).toBeDisabled()
  })

  it('hides Connect Discord when every seat is taken', () => {
    render(
      <LicensesClient
        initialLicenses={[makeLicense({ id: 'lic-1' })]}
        discordAccessByLicense={{
          'lic-1': {
            licenseId: 'lic-1',
            seatCap: 1,
            usedSeats: 1,
            members: [
              { id: 'member-ada', discordUserId: 'discord-ada', handle: '@ada', avatarUrl: null, connectedAt: '2026-06-01T00:00:00.000Z' },
            ],
            blockedMembers: [],
          },
        }}
      />
    )
    expect(
      screen.queryByRole('button', { name: /Connect Discord/ })
    ).not.toBeInTheDocument()
  })

  it('hides Connect Discord on an expired licence', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ id: 'lic-1', expiry: '2020-01-01T00:00:00Z' }),
        ]}
      />
    )
    expect(
      screen.queryByRole('button', { name: /Connect Discord/ })
    ).not.toBeInTheDocument()
  })

  it('shows the claim success banner from the callback redirect and dismisses it', () => {
    searchParamsRef.current = new URLSearchParams('discord=claimed')
    render(<LicensesClient initialLicenses={[makeLicense()]} />)

    expect(
      screen.getByText(
        'Discord connected. Your Pro role will be applied in our community Discord, unlocking the priority support channels.'
      )
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(
      screen.queryByText(
        'Discord connected. Your Pro role will be applied in our community Discord, unlocking the priority support channels.'
      )
    ).not.toBeInTheDocument()
  })

  it('shows the seat-cap claim failure banner', () => {
    searchParamsRef.current = new URLSearchParams('discord=seat_cap_reached')
    render(<LicensesClient initialLicenses={[makeLicense()]} />)

    expect(
      screen.getByText(
        'This license has no free Discord seats. Remove a member to free one.'
      )
    ).toBeInTheDocument()
  })

  it('ignores unknown discord query values', () => {
    searchParamsRef.current = new URLSearchParams('discord=<script>')
    render(<LicensesClient initialLicenses={[makeLicense()]} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  describe('Activated Sites', () => {
    const siteMachine = {
      id: 'm-1',
      fingerprint: 'wcpos-instance-abcdef123456',
      name: null,
      metadata: {
        domain: 'shop.example.com',
        siteUrl: 'https://shop.example.com',
        lastSeenAt: '2026-07-01T00:00:00.000Z',
        pluginVersion: '1.9.7',
        wpVersion: '6.5',
        wcVersion: '10.1',
        source: 'updates-server',
      },
      createdAt: '2026-06-01T00:00:00.000Z',
    }

    it('renders sites with domain, last seen and versions, without the instance id', () => {
      render(
        <LicensesClient
          initialLicenses={[
            makeLicense({ maxMachines: 5, activationCount: 1, machines: [siteMachine] }),
          ]}
        />
      )

      expect(screen.getByText('Sites')).toBeInTheDocument()
      // Domain is the primary label, not the opaque fingerprint.
      expect(screen.getByText('shop.example.com')).toBeInTheDocument()
      // Secondary details collapse into one muted meta line: added · last
      // seen · versions · shortened instance id.
      expect(screen.getByText(/Last seen/)).toBeInTheDocument()
      expect(
        screen.getByText(/WCPOS Pro 1\.9\.7 · WP 6\.5 · WooCommerce 10\.1/)
      ).toBeInTheDocument()
      expect(screen.queryByText(/wcpos-in/)).not.toBeInTheDocument()
    })

    it('falls back to the fingerprint and hides metadata rows when no metadata exists', () => {
      render(
        <LicensesClient
          initialLicenses={[
            makeLicense({
              maxMachines: 5,
              activationCount: 1,
              machines: [
                {
                  id: 'm-2',
                  fingerprint: 'plain-fingerprint-xyz',
                  name: null,
                  metadata: {},
                  createdAt: '2026-06-01T00:00:00.000Z',
                },
              ],
            }),
          ]}
        />
      )

      expect(screen.getByText('plain-fingerprint-xyz')).toBeInTheDocument()
      expect(screen.queryByText(/Last seen/)).not.toBeInTheDocument()
      // No plugin/WP/WooCommerce version fragments in the meta line. (The key
      // band always says "WCPOS Pro", so match the version pattern instead.)
      expect(screen.queryByText(/WCPOS Pro \d/)).not.toBeInTheDocument()
      // Without a domain there is no instance-id fragment either — the
      // fingerprint is already the primary label.
      expect(screen.queryByText(/Instance ID:/)).not.toBeInTheDocument()
    })

    it('requires a confirmation before deactivating a site, and Cancel aborts', () => {
      render(
        <LicensesClient
          initialLicenses={[
            makeLicense({ maxMachines: 5, activationCount: 1, machines: [siteMachine] }),
          ]}
        />
      )

      // First click only reveals the confirmation — no request yet.
      fireEvent.click(
        screen.getByRole('button', { name: 'Deactivate site: shop.example.com' })
      )
      expect(
        screen.getByRole('alertdialog', { name: 'Deactivate shop.example.com?' })
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'This site stops getting updates. You can then use the key on another site.'
        )
      ).toBeInTheDocument()
      // The only caveat is the plugin's 12-hour licence-status cache.
      expect(
        screen.getByText(
          'WCPOS Pro on this site can keep showing the license as active for up to 12 hours.'
        )
      ).toBeInTheDocument()
      expect(screen.queryByText(/reconnects/)).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()

      // Cancel dismisses the confirmation without deactivating.
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(
        screen.queryByText(
          'This site stops getting updates. You can then use the key on another site.'
        )
      ).not.toBeInTheDocument()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('deactivates the site through the machine endpoint after confirming', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ licenses: [] }) })
      render(
        <LicensesClient
          initialLicenses={[
            makeLicense({ id: 'lic-1', maxMachines: 5, activationCount: 1, machines: [siteMachine] }),
          ]}
        />
      )

      fireEvent.click(
        screen.getByRole('button', { name: 'Deactivate site: shop.example.com' })
      )
      fireEvent.click(screen.getByRole('button', { name: 'Deactivate site' }))

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/account/licenses/lic-1/machines/m-1',
        { method: 'DELETE' }
      )
    })
  })
  it('does not claim "no sites" when activations exist but the machine list is empty', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ maxMachines: 4, activationCount: 2, machines: [] }),
        ]}
      />
    )
    expect(screen.getByText('2 of 4 in use')).toBeInTheDocument()
    expect(screen.queryByText(/No sites yet/)).not.toBeInTheDocument()
  })

  it('shows the no-sites hint only when the authoritative count is zero', () => {
    render(
      <LicensesClient
        initialLicenses={[
          makeLicense({ maxMachines: 4, activationCount: 0, machines: [] }),
        ]}
      />
    )
    expect(screen.getByText(/No sites yet/)).toBeInTheDocument()
  })

  describe('collapse behaviour with multiple licences', () => {
    const first = () =>
      makeLicense({ id: 'lic-first', key: 'AAAA-BBBB-CCCC-1111' })
    const secondActive = () =>
      makeLicense({ id: 'lic-second', key: 'DDDD-EEEE-FFFF-2222' })
    const secondExpired = () =>
      makeLicense({
        id: 'lic-second',
        key: 'DDDD-EEEE-FFFF-2222',
        status: 'expired' as CanonicalLicenseStatus,
        expiry: '2025-01-01T00:00:00Z',
      })

    it('opens the first card and collapses a second plain-active card', () => {
      render(
        <LicensesClient initialLicenses={[first(), secondActive()]} />
      )
      const toggles = screen.getAllByRole('button', {
        name: /(Show|Hide) sites and downloads for the license/,
      })
      expect(toggles).toHaveLength(2)
      expect(toggles[0]).toHaveAttribute('aria-expanded', 'true')
      expect(toggles[1]).toHaveAttribute('aria-expanded', 'false')
      // Collapsed card keeps its identity visible: masked key + status.
      expect(screen.getByText('••••-••••-2222')).toBeInTheDocument()
      // The toggle says what it shows or hides.
      expect(toggles[0]).toHaveTextContent('Hide sites and downloads')
      expect(toggles[1]).toHaveTextContent('Show sites and downloads')
    })

    it('tells an expired licence that the Discord Pro role needs an active one', () => {
      render(
        <LicensesClient initialLicenses={[first(), secondExpired()]} />
      )
      expect(
        screen.getByText('The Pro role in our Discord needs an active license.')
      ).toBeInTheDocument()
    })

    it('auto-opens a non-active card even when it is not first', () => {
      render(
        <LicensesClient initialLicenses={[first(), secondExpired()]} />
      )
      const toggles = screen.getAllByRole('button', {
        name: /(Show|Hide) sites and downloads for the license/,
      })
      expect(toggles[1]).toHaveAttribute('aria-expanded', 'true')
    })

    it('expands a collapsed card on toggle click', () => {
      render(
        <LicensesClient initialLicenses={[first(), secondActive()]} />
      )
      const collapsed = screen.getByRole('button', {
        name: 'Show sites and downloads for the license ending in 2222',
      })
      fireEvent.click(collapsed)
      expect(
        screen.getByRole('button', {
          name: 'Hide sites and downloads for the license ending in 2222',
        })
      ).toHaveAttribute('aria-expanded', 'true')
      // Detail content for the second licence is now rendered.
      expect(screen.getAllByText('Discord support')).toHaveLength(2)
    })
  })
})
