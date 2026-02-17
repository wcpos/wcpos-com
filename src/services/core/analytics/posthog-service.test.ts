import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  resolveProCheckoutVariant,
  trackServerEvent,
} from './posthog-service'

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

describe('trackServerEvent', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
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
