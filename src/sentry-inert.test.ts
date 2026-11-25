import { describe, it, expect, vi, afterEach } from 'vitest'
import * as Sentry from '@sentry/nextjs'

describe('Sentry without a DSN', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('stays inert and makes no network call', async () => {
    vi.stubEnv('SENTRY_DSN', '')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '')
    const spies = [
      vi.spyOn(globalThis, 'fetch'),
      vi.spyOn(XMLHttpRequest.prototype, 'send'),
      ...(typeof navigator.sendBeacon === 'function' ? [vi.spyOn(navigator, 'sendBeacon')] : []),
    ]

    await import('../sentry.client.config')
    Sentry.captureException(new Error('jane@example.com'))
    Sentry.captureMessage('x')
    await Sentry.flush(200)

    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
    expect(Sentry.getClient()).toBeUndefined()
  })
})
