import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ANALYTICS_CONSENT_COOKIE } from '@/lib/analytics/consent'
import { stubVercelRequestContext } from '@/test/vercel-request-context'

const mockCookieGet = vi.fn()

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
  })),
}))

const captureMock = vi.fn()
const shutdownMock = vi.fn()

vi.mock('posthog-node', () => ({
  PostHog: vi.fn(function () {
    return { capture: captureMock, shutdown: shutdownMock }
  }),
}))

import {
  resolveProCheckoutVariant,
  trackAttributedServerEvent,
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
  beforeEach(() => {
    captureMock.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not capture when consent is missing', async () => {
    stubConsent(undefined)
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.example.com')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')

    await trackServerEvent('checkout_completed', { distinct_id: 'anon_1' })

    expect(captureMock).not.toHaveBeenCalled()
  })

  it('does not capture when consent is denied', async () => {
    stubConsent('denied')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.example.com')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')

    await trackServerEvent('checkout_completed', { distinct_id: 'anon_1' })

    expect(captureMock).not.toHaveBeenCalled()
  })

  it('captures when consent is granted', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.example.com')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')

    await trackServerEvent('checkout_completed', { distinct_id: 'anon_1' })

    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'checkout_completed',
        distinctId: 'anon_1',
        properties: expect.objectContaining({ distinct_id: 'anon_1' }),
      })
    )
  })

  it('registers its own delivery with the request waitUntil so fire-and-forget callers survive the post-response freeze', async () => {
    const ctx = stubVercelRequestContext()
    try {
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.example.com')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')

      const tracked = trackServerEvent('checkout_completed', {
        distinct_id: 'anon_1',
      })

      // The registration must happen synchronously, before the first await:
      // once the response returns, the request context is gone and it is too
      // late to register anything.
      expect(ctx.waitUntil).toHaveBeenCalledTimes(1)

      await tracked
      await expect(ctx.waitUntil.mock.calls[0][0]).resolves.toBeUndefined()
      expect(captureMock).toHaveBeenCalledTimes(1)
    } finally {
      ctx.restore()
    }
  })
})

describe('trackAttributedServerEvent', () => {
  beforeEach(() => {
    captureMock.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('captures a non-browser event keyed to the supplied distinctId without a request-scoped consent cookie', async () => {
    // No consent cookie exists on a server-to-server call — the request-cookie
    // gate would fail closed, yet consent is inherited from the anon_id.
    stubConsent(undefined)
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.example.com')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')

    trackAttributedServerEvent('license_activated', 'anon-123', {
      site_uuid: 'uuid-abc',
    })

    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'license_activated',
        distinctId: 'anon-123',
        properties: expect.objectContaining({ site_uuid: 'uuid-abc' }),
      })
    )
  })

  it('drops silently when no PostHog client is configured', () => {
    trackAttributedServerEvent('license_activated', 'anon-123', {})

    expect(captureMock).not.toHaveBeenCalled()
  })
})
