import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ANALYTICS_CONSENT_COOKIE } from '@/lib/analytics/consent'

const mockCookieGet = vi.fn()

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
  })),
}))

import {
  resolveProCheckoutVariant,
  trackServerEvent,
} from './posthog-service'

function stubConsent(value: string | undefined) {
  mockCookieGet.mockImplementation((name: string) =>
    name === ANALYTICS_CONSENT_COOKIE && value !== undefined
      ? { value }
      : undefined
  )
}

beforeEach(() => {
  // Default: visitor has granted analytics consent
  stubConsent('granted')
})

describe('resolveProCheckoutVariant', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns control when analytics disabled', async () => {
    const variant = await resolveProCheckoutVariant({
      distinctId: 'anon_1',
      analyticsEnabled: false,
    })

    expect(variant).toBe('control')
  })

  it('returns control on timeout', async () => {
    const variant = await resolveProCheckoutVariant({
      distinctId: 'anon_1',
      timeoutMs: 1,
      evaluate: () => new Promise(() => {}),
    })

    expect(variant).toBe('control')
  })

  it('returns value_copy when PostHog assigns variant', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.example.com')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          featureFlags: {
            pro_checkout_v1: 'value_copy',
          },
        }),
        { status: 200 }
      )
    )

    vi.stubGlobal('fetch', fetchMock)

    const variant = await resolveProCheckoutVariant({
      distinctId: 'anon_1',
    })

    expect(variant).toBe('value_copy')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://analytics.example.com/flags?v=2',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })
})

describe('resolveProCheckoutVariant consent gating', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns control without bucketing when consent is missing', async () => {
    stubConsent(undefined)
    const evaluate = vi.fn().mockResolvedValue('value_copy')

    const variant = await resolveProCheckoutVariant({
      distinctId: 'anon_1',
      evaluate,
    })

    expect(variant).toBe('control')
    expect(evaluate).not.toHaveBeenCalled()
  })

  it('returns control without bucketing when consent is denied', async () => {
    stubConsent('denied')
    const evaluate = vi.fn().mockResolvedValue('value_copy')

    const variant = await resolveProCheckoutVariant({
      distinctId: 'anon_1',
      evaluate,
    })

    expect(variant).toBe('control')
    expect(evaluate).not.toHaveBeenCalled()
  })
})

describe('trackServerEvent', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not capture when consent is missing', async () => {
    stubConsent(undefined)
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.example.com')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await trackServerEvent('checkout_completed', { distinct_id: 'anon_1' })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not capture when consent is denied', async () => {
    stubConsent('denied')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.example.com')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await trackServerEvent('checkout_completed', { distinct_id: 'anon_1' })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('captures when consent is granted', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.example.com')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await trackServerEvent('checkout_completed', { distinct_id: 'anon_1' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://analytics.example.com/capture/',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('swallows fetch failures', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.example.com')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expect(
      trackServerEvent('checkout_completed', {
        distinct_id: 'anon_1',
      })
    ).resolves.toBeUndefined()
  })
})
