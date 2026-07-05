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

})

describe('live Stripe publishable key', () => {
  const LIVE_PK_PATTERN = /^pk_live_[A-Za-z0-9]+$/

  it('is a committed, non-empty pk_live_ key so live checkout never depends on a Vercel env var', () => {
    // Regression guard for the recurring "No payment methods are configured"
    // outage: an empty NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY on Vercel used to
    // null out Stripe — the only registered payment method — collapsing
    // checkout to zero methods. The live key is now committed in code.
    expect(
      getStoreEnvironmentByName('live').payments.stripePublishableKey
    ).toMatch(LIVE_PK_PATTERN)
  })

  it('survives an empty env var by falling back to the committed literal', async () => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', '')

    const { getStoreEnvironmentByName } = await import('./store-environment')

    expect(
      getStoreEnvironmentByName('live').payments.stripePublishableKey
    ).toMatch(LIVE_PK_PATTERN)

    vi.unstubAllEnvs()
  })

  it('never exposes a secret key: an sk_ env var is rejected and falls back to the committed pk_live_ literal', async () => {
    vi.resetModules()
    vi.stubEnv(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'sk_live_12345678901234567890'
    )

    const { getStoreEnvironmentByName } = await import('./store-environment')
    const key = getStoreEnvironmentByName('live').payments.stripePublishableKey

    expect(key).not.toContain('sk_')
    expect(key).toMatch(LIVE_PK_PATTERN)

    vi.unstubAllEnvs()
  })

  it('rejects a pk_test_ env var for live and falls back to the committed pk_live_ literal', async () => {
    vi.resetModules()
    vi.stubEnv(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'pk_test_12345678901234567890'
    )

    const { getStoreEnvironmentByName } = await import('./store-environment')
    const key = getStoreEnvironmentByName('live').payments.stripePublishableKey

    expect(key).not.toBe('pk_test_12345678901234567890')
    expect(key).toMatch(LIVE_PK_PATTERN)

    vi.unstubAllEnvs()
  })

  it('lets a valid pk_live_ env var override the committed literal (key rotation without a redeploy)', async () => {
    vi.resetModules()
    vi.stubEnv(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'pk_live_rotated0000000000000000'
    )

    const { getStoreEnvironmentByName } = await import('./store-environment')

    expect(
      getStoreEnvironmentByName('live').payments.stripePublishableKey
    ).toBe('pk_live_rotated0000000000000000')

    vi.unstubAllEnvs()
  })
})
