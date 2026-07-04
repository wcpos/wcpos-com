import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}))

import {
  getStoreEnvironmentByName,
  resolveStoreEnvironmentName,
} from './store-environment'

describe('resolveStoreEnvironmentName', () => {
  it('resolves ONLY the canonical production hostnames to live', () => {
    expect(resolveStoreEnvironmentName('wcpos.com')).toBe('live')
    expect(resolveStoreEnvironmentName('www.wcpos.com')).toBe('live')
    expect(resolveStoreEnvironmentName('WCPOS.com')).toBe('live')
    expect(resolveStoreEnvironmentName('wcpos.com:443')).toBe('live')
  })

  it('resolves beta and Vercel previews to test', () => {
    expect(resolveStoreEnvironmentName('beta.wcpos.com')).toBe('test')
    expect(resolveStoreEnvironmentName('wcpos-com-git-foo.vercel.app')).toBe(
      'test'
    )
  })

  it('fails safe: everything else is dev, never live', () => {
    expect(resolveStoreEnvironmentName('localhost')).toBe('dev')
    expect(resolveStoreEnvironmentName('localhost:3000')).toBe('dev')
    expect(resolveStoreEnvironmentName('127.0.0.1:3000')).toBe('dev')
    expect(resolveStoreEnvironmentName(null)).toBe('dev')
    expect(resolveStoreEnvironmentName(undefined)).toBe('dev')
    expect(resolveStoreEnvironmentName('')).toBe('dev')
    // Lookalike hosts must not reach live money.
    expect(resolveStoreEnvironmentName('evil-wcpos.com')).toBe('dev')
    expect(resolveStoreEnvironmentName('wcpos.com.evil.com')).toBe('dev')
    expect(resolveStoreEnvironmentName('notwcpos.com')).toBe('dev')
  })
})

describe('store environments', () => {
  it('points each environment at its backend', () => {
    expect(getStoreEnvironmentByName('live').medusaBackendUrl).toBe(
      'https://store-api.wcpos.com'
    )
    expect(getStoreEnvironmentByName('test').medusaBackendUrl).toBe(
      'https://store-api-staging.wcpos.com'
    )
  })

  it('always offers BTCPay in test and dev (redirect flow, no client SDK)', () => {
    expect(getStoreEnvironmentByName('test').payments.btcpayEnabled).toBe(true)
    expect(getStoreEnvironmentByName('dev').payments.btcpayEnabled).toBe(true)
  })

  it('does not expose Stripe secret keys through public checkout config', async () => {
    vi.resetModules()
    vi.stubEnv(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'sk_live_12345678901234567890'
    )

    const { getStoreEnvironmentByName } = await import('./store-environment')

    expect(
      getStoreEnvironmentByName('live').payments.stripePublishableKey
    ).toBeNull()

    vi.unstubAllEnvs()
  })
})
