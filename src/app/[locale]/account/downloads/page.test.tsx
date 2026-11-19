import { describe, expect, it, vi } from 'vitest'
import DownloadsPage from './page'

vi.mock('@/components/account/downloads-client', () => ({ DownloadsClient: vi.fn() }))
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async () => (key: string) => key,
}))
vi.mock('@/lib/customer-licenses', () => ({
  getResolvedCustomerLicenses: async () => ({
    authenticated: true,
    licenses: [
      { id: 'active', status: 'active', expiry: null },
      { id: 'expired', status: 'expired', expiry: '2025-01-01' },
      { id: 'unknown', status: 'unknown', expiry: null },
    ],
  }),
}))
vi.mock('@/lib/login-redirect', () => ({ redirectToLoginClearingSession: vi.fn() }))
vi.mock('@/lib/plans', () => ({ getPlanByPolicyId: () => null }))
vi.mock('@/services/core/business/pro-downloads', () => ({
  getProPluginReleases: async () => [
    { version: '1.9.0', publishedAt: '2024-01-01', prerelease: false },
  ],
}))

describe('account downloads licence scope', () => {
  // 'expired' stays allowed: 1.9.0 was published (2024-01-01) inside that
  // licence's term (expires 2025-01-01), so the historical grant holds.
  it.each([
    [undefined, true], ['active', true], ['expired', true],
    ['unknown', false], ['foreign-id', false],
  ])('scopes release entitlement to %s', async (license, allowed) => {
    const page = await DownloadsPage({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({ license }),
    })
    // Resolve the async content inside Suspense, then inspect the client props.
    const content = page.props.children[1].props.children
    const client = await content.type(content.props)
    expect(
      client.props.initialReleases.map(
        (r: { version: string; allowed: boolean }) => ({
          version: r.version,
          allowed: r.allowed,
        })
      )
    ).toEqual([{ version: '1.9.0', allowed }])
    expect(client.props.prereleases).toBeUndefined()
  })
})
