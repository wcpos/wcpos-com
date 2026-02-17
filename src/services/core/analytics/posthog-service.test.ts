import { describe, expect, it } from 'vitest'
import { resolveProCheckoutVariant } from './posthog-service'

describe('resolveProCheckoutVariant', () => {
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
})
