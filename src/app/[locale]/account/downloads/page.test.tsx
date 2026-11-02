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
  getProPluginPrereleases: async () => [
    { version: '2.0.0-beta.1', publishedAt: '2024-01-01', prerelease: true },
  ],
}))

describe('account downloads licence scope', () => {
  it.each([
    [undefined, true], ['active', true], ['expired', false],
    ['unknown', false], ['foreign-id', false],
  ])('keeps beta entitlement scoped to %s', async (license, allowed) => {
    const page = await DownloadsPage({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({ license }),
    })
    // Resolve the async content inside Suspense, then inspect the client props.
    const content = page.props.children[1].props.children
    const client = await content.type(content.props)
    expect(client.props.prereleases.map((r: { version: string }) => r.version))
      .toEqual(allowed ? ['2.0.0-beta.1'] : [])
    expect(client.props.initialReleases.map((r: { version: string }) => r.version))
      .toEqual(['1.9.0'])
  })
})
